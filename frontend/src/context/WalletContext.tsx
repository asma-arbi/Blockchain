import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";
import { SUPPORTED_NETWORKS } from "../types";
import { CONTRACT_CHAIN_ID } from "../contracts/contractConfig";

interface WalletContextType {
  account: string | null;
  chainId: number | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isMetaMaskInstalled: boolean;
  isWrongNetwork: boolean;
  targetChainId: number;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetId?: number) => Promise<void>;
  requestFaucet: () => Promise<boolean>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMetaMaskInstalled = typeof window !== "undefined" && Boolean(window.ethereum);
  const targetChainId: number = CONTRACT_CHAIN_ID || 31337;
  const isWrongNetwork = Boolean(account && chainId && chainId !== targetChainId);

  // Mise à jour du solde
  const refreshBalance = useCallback(async (currentAccount: string, currentProvider: BrowserProvider) => {
    try {
      const bal = await currentProvider.getBalance(currentAccount);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (err) {
      console.warn("Impossible de récupérer le solde :", err);
      setBalance(null);
    }
  }, []);

  // Initialisation et gestionnaires d'événements
  useEffect(() => {
    if (!isMetaMaskInstalled || !window.ethereum) return;

    const browserProvider = new BrowserProvider(window.ethereum as any);
    setProvider(browserProvider);

    // Vérifier si des comptes sont déjà connectés
    browserProvider
      .send("eth_accounts", [])
      .then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          const network = await browserProvider.getNetwork();
          const currentChainId = Number(network.chainId);
          const currentAccount = accounts[0];

          setAccount(currentAccount);
          setChainId(currentChainId);

          const currentSigner = await browserProvider.getSigner();
          setSigner(currentSigner);

          refreshBalance(currentAccount, browserProvider);
        }
      })
      .catch((err) => {
        console.warn("Erreur détection compte initial :", err);
      });

    // Écouteur de changement de compte
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null);
        setSigner(null);
        setBalance(null);
      } else {
        const nextAccount = accounts[0];
        setAccount(nextAccount);
        const nextSigner = await browserProvider.getSigner();
        setSigner(nextSigner);
        refreshBalance(nextAccount, browserProvider);
      }
    };

    // Écouteur de changement de chaîne
    const handleChainChanged = (hexChainId: string) => {
      const newChainId = parseInt(hexChainId, 16);
      setChainId(newChainId);
      window.location.reload();
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [isMetaMaskInstalled, refreshBalance]);

  // Connexion de portefeuille
  const connectWallet = async () => {
    setError(null);
    if (!isMetaMaskInstalled || !window.ethereum) {
      setError("MetaMask n'est pas détecté. Veuillez installer l'extension MetaMask.");
      return;
    }

    try {
      setIsConnecting(true);
      const browserProvider = new BrowserProvider(window.ethereum as any);
      setProvider(browserProvider);

      let accounts: string[] = [];
      try {
        // Tente de forcer la fenêtre de sélection et reconnexion de compte dans MetaMask
        await (window.ethereum as any).request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
        accounts = (await browserProvider.send("eth_accounts", [])) as string[];
      } catch (permErr: any) {
        if (permErr.code === 4001) {
          setError("Connexion refusée par l'utilisateur dans MetaMask.");
          return;
        }
        // Fallback standard si wallet_requestPermissions n'est pas supporté
        accounts = (await browserProvider.send("eth_requestAccounts", [])) as string[];
      }

      if (accounts.length === 0) {
        setError("Aucun compte sélectionné.");
        return;
      }

      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);
      const currentAccount = accounts[0];

      setAccount(currentAccount);
      setChainId(currentChainId);

      const currentSigner = await browserProvider.getSigner(currentAccount);
      setSigner(currentSigner);

      await refreshBalance(currentAccount, browserProvider);
    } catch (err: any) {
      console.error("Erreur de connexion :", err);
      if (err.code === 4001) {
        setError("Connexion refusée par l'utilisateur dans MetaMask.");
      } else {
        setError(err.message || "Erreur lors de la connexion à MetaMask.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Déconnexion logique
  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setBalance(null);
    setError(null);
  };

  // Basculement de réseau (switch / add network)
  const switchNetwork = async (targetId?: number) => {
    if (!window.ethereum) return;
    setError(null);

    const target = targetId ?? targetChainId;
    const hexChainId = `0x${target.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      // Le code 4902 indique que le réseau n'a pas encore été ajouté à MetaMask
      if (switchError.code === 4902) {
        const netConfig = SUPPORTED_NETWORKS[target];
        if (!netConfig) {
          setError(`Configuration indisponible pour le réseau chainId: ${target}`);
          return;
        }

        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: netConfig.name,
                rpcUrls: netConfig.rpcUrls,
                nativeCurrency: {
                  name: netConfig.currencyName,
                  symbol: netConfig.currencySymbol,
                  decimals: 18,
                },
                blockExplorerUrls: netConfig.blockExplorerUrls || undefined,
              },
            ],
          });
        } catch (addError: any) {
          setError(`Impossible d'ajouter le réseau : ${addError.message}`);
        }
      } else {
        setError(`Échec du changement de réseau : ${switchError.message}`);
      }
    }
  };

  // Demande de faucet automatique pour le nœud local Hardhat (100 ETH)
  const requestFaucet = useCallback(async (): Promise<boolean> => {
    if (!account) return false;
    try {
      const res = await fetch("http://127.0.0.1:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "hardhat_setBalance",
          params: [account, "0x56bc75e2d63100000"], // 100 ETH
          id: Date.now(),
        }),
      });
      const data = await res.json();
      if (data && data.result) {
        if (provider) {
          await refreshBalance(account, provider);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Échec du faucet :", err);
      return false;
    }
  }, [account, provider, refreshBalance]);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        balance,
        isConnected: Boolean(account),
        isConnecting,
        isMetaMaskInstalled,
        isWrongNetwork,
        targetChainId,
        provider,
        signer,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        requestFaucet,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet doit être utilisé à l'intérieur d'un WalletProvider");
  }
  return context;
};
