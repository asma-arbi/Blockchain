import { useMemo, useCallback } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { useWallet } from "../context/WalletContext";
import { AUTHORITY_ADDRESS, AUTHORITY_ABI, CONTRACT_CHAIN_ID } from "../contracts/contractConfig";
import { OfficialCertificate, CertificateStatus, SUPPORTED_NETWORKS } from "../types";

export function useAuthorityContract() {
  const { provider, signer, account } = useWallet();

  const readContract = useMemo(() => {
    try {
      if (provider) {
        return new Contract(AUTHORITY_ADDRESS, AUTHORITY_ABI, provider);
      }
      const networkConfig = SUPPORTED_NETWORKS[CONTRACT_CHAIN_ID];
      const fallbackUrl = networkConfig?.rpcUrls[0] || "http://127.0.0.1:8545";
      const fallbackProvider = new JsonRpcProvider(fallbackUrl);
      return new Contract(AUTHORITY_ADDRESS, AUTHORITY_ABI, fallbackProvider);
    } catch (err) {
      console.warn("Impossible d'initialiser Authority readContract :", err);
      return null;
    }
  }, [provider]);

  const writeContract = useMemo(() => {
    if (!signer) return null;
    return new Contract(AUTHORITY_ADDRESS, AUTHORITY_ABI, signer);
  }, [signer]);

  /**
   * Vérifie le statut d'un certificat officiel
   */
  const verifyOfficialCertificate = useCallback(
    async (documentHash: string): Promise<OfficialCertificate | null> => {
      if (!readContract) return null;
      try {
        const [exists, status, issuer, org, issuedAt, revReason, revokedAt] =
          await readContract.verifyCertificate(documentHash);

        if (!exists) return null;

        return {
          exists: Boolean(exists),
          status: Number(status) as CertificateStatus,
          issuer: String(issuer),
          organization: String(org),
          issuedAt: Number(issuedAt),
          revocationReason: String(revReason),
          revokedAt: Number(revokedAt),
        };
      } catch (err) {
        console.error("Erreur verifyOfficialCertificate :", err);
        return null;
      }
    },
    [readContract]
  );

  /**
   * Émet un certificat officiel pour un hash (requiert rôle ISSUER)
   */
  const issueOfficialCertificate = useCallback(
    async (documentHash: string): Promise<string> => {
      if (!writeContract) throw new Error("Portefeuille non connecté.");
      try {
        const tx = await writeContract.issueCertificate(documentHash);
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (err: any) {
        throw parseAuthorityError(err);
      }
    },
    [writeContract]
  );

  /**
   * Révoque un certificat officiel avec motif
   */
  const revokeOfficialCertificate = useCallback(
    async (documentHash: string, reason: string): Promise<string> => {
      if (!writeContract) throw new Error("Portefeuille non connecté.");
      try {
        const tx = await writeContract.revokeCertificate(documentHash, reason);
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (err: any) {
        throw parseAuthorityError(err);
      }
    },
    [writeContract]
  );

  /**
   * Accrédite une institution (Admin only)
   */
  const accreditIssuer = useCallback(
    async (issuerAddress: string, organization: string): Promise<string> => {
      if (!writeContract) throw new Error("Portefeuille non connecté.");
      try {
        const tx = await writeContract.accreditIssuer(issuerAddress, organization);
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (err: any) {
        throw parseAuthorityError(err);
      }
    },
    [writeContract]
  );

  /**
   * Vérifie les rôles de l'adresse connectée
   */
  const checkUserRoles = useCallback(
    async (userAccount?: string): Promise<{ isAdmin: boolean; isIssuer: boolean; organization?: string }> => {
      const target = userAccount || account;
      if (!target || !readContract) return { isAdmin: false, isIssuer: false };

      try {
        const adminRole = await readContract.DEFAULT_ADMIN_ROLE();
        const issuerRole = await readContract.ISSUER_ROLE();

        const [isAdmin, isIssuer, issuerData] = await Promise.all([
          readContract.hasRole(adminRole, target),
          readContract.hasRole(issuerRole, target),
          readContract.issuers(target).catch(() => null),
        ]);

        return {
          isAdmin: Boolean(isAdmin),
          isIssuer: Boolean(isIssuer),
          organization: issuerData?.isActive ? issuerData.organization : undefined,
        };
      } catch (err) {
        console.warn("Erreur checkUserRoles :", err);
        return { isAdmin: false, isIssuer: false };
      }
    },
    [account, readContract]
  );

  return {
    authorityAddress: AUTHORITY_ADDRESS,
    verifyOfficialCertificate,
    issueOfficialCertificate,
    revokeOfficialCertificate,
    accreditIssuer,
    checkUserRoles,
  };
}

function parseAuthorityError(err: any): Error {
  const msg = err.message || "";
  if (msg.includes("AccessControlUnauthorizedAccount")) {
    return new Error("Opération refusée : votre compte ne dispose pas du rôle requis (RBAC).");
  }
  if (msg.includes("CertificateAlreadyExists")) {
    return new Error("Ce document a déjà été certifié par une institution officielle.");
  }
  if (msg.includes("CertificateAlreadyRevoked")) {
    return new Error("Ce document est déjà révoqué.");
  }
  if (msg.includes("CertificateNotFound")) {
    return new Error("Certificat introuvable pour cette empreinte.");
  }
  if (msg.includes("ACTION_REJECTED") || msg.includes("user rejected")) {
    return new Error("Transaction rejetée par l'utilisateur.");
  }
  return new Error(err.reason || err.shortMessage || msg || "Erreur de contrat.");
}
