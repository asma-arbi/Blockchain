import { useMemo, useCallback } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { useWallet } from "../context/WalletContext";
import { CONTRACT_ADDRESS, CONTRACT_ABI, CONTRACT_CHAIN_ID } from "../contracts/contractConfig";
import { DocumentRecord, VerificationResult, SUPPORTED_NETWORKS } from "../types";

export function useDocumentContract() {
  const { provider, signer, account } = useWallet();

  // Création d'une instance de contrat en lecture (fallback RPC si pas de wallet connecté)
  const readContract = useMemo(() => {
    try {
      if (provider) {
        return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      }
      // Fallback sur le provider RPC public ou local
      const networkConfig = SUPPORTED_NETWORKS[CONTRACT_CHAIN_ID];
      const fallbackUrl = networkConfig?.rpcUrls[0] || "http://127.0.0.1:8545";
      const fallbackProvider = new JsonRpcProvider(fallbackUrl);
      return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, fallbackProvider);
    } catch (err) {
      console.warn("Impossible d'initialiser readContract :", err);
      return null;
    }
  }, [provider]);

  // Contrat avec signataire pour les écritures (register)
  const writeContract = useMemo(() => {
    if (!signer) return null;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, [signer]);

  /**
   * Enregistre un nouveau document sur la blockchain.
   */
  const registerDocument = useCallback(
    async (
      hash: string,
      name: string,
      onTxSubmitted?: (txHash: string) => void
    ): Promise<{ txHash: string; blockNumber: number }> => {
      if (!writeContract || !signer) {
        throw new Error("Veuillez connecter votre portefeuille MetaMask pour signer la transaction.");
      }

      try {
        const tx = await writeContract.register(hash, name);
        if (onTxSubmitted) {
          onTxSubmitted(tx.hash);
        }

        const receipt = await tx.wait();
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
        };
      } catch (err: any) {
        throw parseContractError(err);
      }
    },
    [writeContract, signer]
  );

  /**
   * Vérifie l'intégrité d'un document à partir de son hash.
   * Fonctionne en mode view (gratuit, ne requiert pas de wallet connecté).
   */
  const verifyDocument = useCallback(
    async (hash: string): Promise<VerificationResult> => {
      if (!readContract) {
        return {
          isVerified: false,
          checkedHash: hash,
          exists: false,
          errorMessage: "Contrat inaccessible. Vérifiez que le nœud blockchain est bien démarré.",
        };
      }

      try {
        const [exists, owner, timestamp, name] = await readContract.verify(hash);
        return {
          isVerified: true,
          checkedHash: hash,
          exists: Boolean(exists),
          owner: exists ? owner : undefined,
          timestamp: exists ? Number(timestamp) : undefined,
          name: exists ? name : undefined,
        };
      } catch (err: any) {
        console.error("Erreur verify :", err);
        return {
          isVerified: false,
          checkedHash: hash,
          exists: false,
          errorMessage: err.message || "Erreur lors de la vérification sur la blockchain.",
        };
      }
    },
    [readContract]
  );

  /**
   * Récupère la liste de tous les documents enregistrés par une adresse.
   */
  const getUserDocuments = useCallback(
    async (userAddress?: string): Promise<DocumentRecord[]> => {
      const targetAddress = userAddress || account;
      if (!targetAddress || !readContract) return [];

      try {
        const [hashes, docs] = await readContract.getDocumentDetailsByOwner(targetAddress);
        const result: DocumentRecord[] = [];

        for (let i = 0; i < hashes.length; i++) {
          result.push({
            hash: hashes[i],
            owner: docs[i].owner,
            timestamp: Number(docs[i].timestamp),
            name: docs[i].name,
          });
        }

        // Tri décroissant : les plus récents en premier
        return result.sort((a, b) => b.timestamp - a.timestamp);
      } catch (err) {
        console.error("Erreur lors de la récupération des documents :", err);
        return [];
      }
    },
    [account, readContract]
  );

  return {
    registerDocument,
    verifyDocument,
    getUserDocuments,
    contractAddress: CONTRACT_ADDRESS,
  };
}

/**
 * Traduit les erreurs brutes de transaction et custom errors Solidity en messages clairs en français.
 */
function parseContractError(err: any): Error {
  console.error("Détail de l'erreur contractuelle :", err);

  // Rejet de signature par l'utilisateur
  if (err.code === "ACTION_REJECTED" || err.code === 4001 || (err.message && err.message.includes("user rejected"))) {
    return new Error("Signature rejetée par l'utilisateur dans MetaMask.");
  }

  // Solde insuffisant pour le gas
  if (err.code === "INSUFFICIENT_FUNDS" || (err.message && err.message.includes("insufficient funds"))) {
    return new Error("Fonds insuffisants sur votre compte pour payer les frais de gas.");
  }

  // Erreurs personnalisées Solidity (Custom Errors)
  const errorData = err.data || err.error?.data || err.info?.error?.data;
  const message = err.message || "";

  if (message.includes("DocumentAlreadyExists") || (typeof errorData === "string" && errorData.includes("9ff44b93"))) {
    return new Error("Ce document est DÉJÀ enregistré sur la blockchain. Les doublons sont rejetés.");
  }

  if (message.includes("InvalidHash") || (typeof errorData === "string" && errorData.includes("0eb115f2"))) {
    return new Error("Empreinte invalide (le hash bytes32 ne peut pas être nul).");
  }

  if (message.includes("EmptyName") || (typeof errorData === "string" && errorData.includes("3b951167"))) {
    return new Error("Le nom du document ne peut pas être vide.");
  }

  if (message.includes("ZeroAddress")) {
    return new Error("Adresse nulle non autorisée.");
  }

  return new Error(err.reason || err.shortMessage || err.message || "Erreur de transaction blockchain.");
}
