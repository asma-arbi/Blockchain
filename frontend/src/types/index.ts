export interface DocumentRecord {
  hash: string;
  owner: string;
  timestamp: number;
  name: string;
}

export enum CertificateStatus {
  UNKNOWN = 0,
  ACTIVE = 1,
  REVOKED = 2,
}

export interface OfficialCertificate {
  exists: boolean;
  status: CertificateStatus;
  issuer: string;
  organization: string;
  issuedAt: number;
  revocationReason: string;
  revokedAt: number;
}

export interface VerificationResult {
  isVerified: boolean;
  checkedHash: string;
  exists: boolean;
  owner?: string;
  timestamp?: number;
  name?: string;
  errorMessage?: string;
  officialCert?: OfficialCertificate;
}

export type TxStep = "idle" | "hashing" | "preparing" | "waiting_signature" | "mining" | "confirmed" | "error";

export interface TxState {
  step: TxStep;
  txHash?: string;
  errorMessage?: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  currencyName: string;
  currencySymbol: string;
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    chainId: 31337,
    name: "Hardhat Localhost",
    currencyName: "Ethereum",
    currencySymbol: "ETH",
    rpcUrls: ["http://127.0.0.1:8545"],
  },
  11155111: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    currencyName: "Sepolia Ether",
    currencySymbol: "ETH",
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};
