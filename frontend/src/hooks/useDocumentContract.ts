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

  /**
   * Enregistre un nouveau document sur la blockchain.
   */
  const registerDocument = useCallback(
    async (
      hash: string,
      name: string,
      onTxSubmitted?: (txHash: string) => void
    ): Promise<{ txHash: string; blockNumber: number }> => {
      if (!provider) {
        throw new Error("Veuillez connecter votre portefeuille MetaMask pour signer la transaction.");
      }

      // 1. S'assurer que le compte actif de MetaMask est bien autorisé pour le site (évite l'erreur 4100)
      let activeSigner = signer;
      try {
        let accounts = (await provider.send("eth_accounts", [])) as string[];
        if (!accounts || accounts.length === 0) {
          // Aucun compte connecté pour ce site : demander à MetaMask
          accounts = (await provider.send("eth_requestAccounts", [])) as string[];
        }
        if (!accounts || accounts.length === 0) {
          throw new Error("Aucun compte MetaMask sélectionné ou connecté.");
        }
        activeSigner = await provider.getSigner(accounts[0]);
      } catch (authErr: any) {
        if (authErr.code === 4001 || /user rejected|user denied/i.test(authErr.message || "")) {
          throw new Error("Vous avez refusé d'autoriser la connexion de votre compte dans MetaMask.");
        }
        if (authErr.code === 4100 || /not been authorized/i.test(authErr.message || "")) {
          // Tenter de forcer la demande de permission dans MetaMask
          try {
            await (window.ethereum as any)?.request?.({
              method: "wallet_requestPermissions",
              params: [{ eth_accounts: {} }],
            });
            const freshAccounts = (await provider.send("eth_accounts", [])) as string[];
            if (freshAccounts && freshAccounts.length > 0) {
              activeSigner = await provider.getSigner(freshAccounts[0]);
            }
          } catch {
            throw new Error(
              "Le compte sélectionné dans MetaMask n'est pas encore autorisé à interagir avec ce site.\n\n" +
              "👉 Solution rapide :\n" +
              "1. Cliquez sur le bouton « Reconnecter MetaMask maintenant » ci-dessous.\n" +
              "2. Cochez votre compte dans la fenêtre MetaMask et cliquez sur « Connecter »."
            );
          }
        } else {
          console.warn("Vérification autorisation compte :", authErr);
        }
      }

      if (!activeSigner) {
        throw new Error("Impossible d'obtenir le signataire MetaMask. Veuillez cliquer sur 'Connecter MetaMask' en haut à droite.");
      }

      const activeWriteContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, activeSigner);

      // 2. Vérification que le contrat a bien du bytecode à cette adresse sur le réseau
      try {
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (!code || code === "0x") {
          throw new Error(
            `Le contrat DocumentRegistry n'est pas déployé à l'adresse ${CONTRACT_ADDRESS} sur ce réseau.\n\n` +
            `👉 Si vous venez de lancer ou redémarrer 'npx hardhat node', vous devez redéployer le contrat avec :\n` +
            `npx hardhat run scripts/deploy.ts --network localhost`
          );
        }
      } catch (err: any) {
        if (err.message && err.message.includes("n'est pas déployé")) {
          throw err;
        }
        console.warn("Impossible de vérifier le bytecode du contrat :", err);
      }

      // 3. Simulation préventive par staticCall : attrape les reverts avec le vrai nom de l'erreur
      try {
        await activeWriteContract.register.staticCall(hash, name);
      } catch (simError: any) {
        throw parseContractError(simError);
      }

      // 4. Estimation de gas sécurisée avec fallback
      let gasLimit: bigint | undefined;
      try {
        const estimated = await activeWriteContract.register.estimateGas(hash, name);
        gasLimit = (estimated * 125n) / 100n; // Marge de sécurité de 25%
      } catch {
        gasLimit = 250000n; // Fallback sécurisé pour nœud local
      }

      // 5. Soumission de la transaction
      try {
        const tx = await activeWriteContract.register(hash, name, { gasLimit });
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
    [signer, provider]
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
 * Traduit les erreurs brutes de transaction et custom errors Solidity en messages clairs et actionnables en français.
 */
function parseContractError(err: any): Error {
  console.error("Détail de l'erreur contractuelle :", err);

  const fullErrorStr = [
    err?.message,
    err?.shortMessage,
    err?.reason,
    JSON.stringify(err?.info || {}),
    JSON.stringify(err?.data || {}),
    JSON.stringify(err?.error || {}),
  ].join(" ");

  // 1. Rejet de signature par l'utilisateur
  if (
    err.code === "ACTION_REJECTED" ||
    err.code === 4001 ||
    /user rejected|user denied|ACTION_REJECTED/i.test(fullErrorStr)
  ) {
    return new Error("Signature rejetée par l'utilisateur dans MetaMask.");
  }

  // 2. Solde insuffisant pour le gas
  if (err.code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(fullErrorStr)) {
    return new Error("Fonds insuffisants sur votre compte pour payer les frais de gas.");
  }

  // 3. Compte non autorisé ou déconnecté (Code 4100 EIP-1193)
  if (
    err.code === 4100 ||
    /not been authorized|unauthorized/i.test(fullErrorStr)
  ) {
    return new Error(
      "Le compte sélectionné dans MetaMask n'est pas encore autorisé à interagir avec ce site.\n\n" +
      "👉 Solution rapide :\n" +
      "1. Cliquez sur le bouton « Connecter MetaMask » en haut à droite de la page pour reconnecter votre compte.\n" +
      "2. Ou ouvrez l'extension MetaMask : si le statut en haut à gauche indique « Non connecté », cliquez dessus puis sur « Connecter »."
    );
  }

  // 4. Désynchronisation de nonce dans MetaMask (Survient après redémarrage du nœud Hardhat)
  if (
    /nonce too high|nonce too low|replacement transaction underpriced/i.test(fullErrorStr) ||
    (/nonce/i.test(fullErrorStr) && /expected nonce|high|low/i.test(fullErrorStr))
  ) {
    return new Error(
      "Désynchronisation de nonce détectée (le nœud Hardhat local a été redémarré alors que MetaMask a mémorisé d'anciennes transactions).\n\n" +
      "👉 Solution rapide :\n" +
      "1. Dans MetaMask, ouvrez le menu (en haut à droite) > Paramètres > Avancé\n" +
      "2. Cliquez sur « Effacer les données d'activité de l'onglet » (ou « Réinitialiser le compte »)\n" +
      "3. Réessayez d'enregistrer le document."
    );
  }

  // 4. Erreurs personnalisées Solidity (Custom Errors)
  const revertName = err?.revert?.name;

  // DocumentAlreadyExists (sélecteur 0x4cba5033)
  if (
    revertName === "DocumentAlreadyExists" ||
    /DocumentAlreadyExists|4cba5033/i.test(fullErrorStr)
  ) {
    return new Error("Ce document est DÉJÀ enregistré sur la blockchain. Chaque document ne peut être certifié qu'une seule fois.");
  }

  // InvalidHash (sélecteur 0x0af806e0)
  if (
    revertName === "InvalidHash" ||
    /InvalidHash|0af806e0/i.test(fullErrorStr)
  ) {
    return new Error("Empreinte invalide (le hash bytes32 ne peut pas être nul).");
  }

  // EmptyName (sélecteur 0x2ef13105)
  if (
    revertName === "EmptyName" ||
    /EmptyName|2ef13105/i.test(fullErrorStr)
  ) {
    return new Error("Le nom du document ne peut pas être vide.");
  }

  // ZeroAddress (sélecteur 0xd92e233d)
  if (
    revertName === "ZeroAddress" ||
    /ZeroAddress|d92e233d/i.test(fullErrorStr)
  ) {
    return new Error("Adresse nulle non autorisée.");
  }

  // 5. Extraction avancée du message d'erreur imbriqué dans 'could not coalesce error'
  if (err?.message && err.message.includes("could not coalesce error")) {
    const jsonMatch = err.message.match(/error=\s*(\{.+?\}),\s*payload=/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const innerMsg = parsed.data?.message || parsed.message;
        if (innerMsg) {
          if (/nonce/i.test(innerMsg)) {
            return new Error(
              "Désynchronisation de nonce détectée (le nœud Hardhat a été redémarré).\n\n" +
              "👉 Solution : Dans MetaMask > Paramètres > Avancé > « Effacer les données d'activité de l'onglet »."
            );
          }
          return new Error(innerMsg);
        }
      } catch {
        // Fallback
      }
    }
  }

  return new Error(err.reason || err.shortMessage || err.message || "Erreur de transaction blockchain.");
}
