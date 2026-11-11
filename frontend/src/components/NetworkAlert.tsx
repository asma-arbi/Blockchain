import React from "react";
import { AlertTriangle, ArrowRight, Info, ExternalLink } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { SUPPORTED_NETWORKS } from "../types";

export const NetworkAlert: React.FC = () => {
  const { isConnected, isWrongNetwork, targetChainId, switchNetwork, isMetaMaskInstalled } = useWallet();

  const targetNetwork = SUPPORTED_NETWORKS[targetChainId];

  if (!isMetaMaskInstalled) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-amber-200 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              MetaMask n'est pas détecté. Vous pouvez toujours vérifier des documents publiquement, mais pour en enregistrer un nouveau, vous aurez besoin de MetaMask.
            </span>
          </div>
          <a
            href="https://metamask.io"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center space-x-1 underline hover:text-white font-medium"
          >
            <span>Obtenir MetaMask</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (isConnected && isWrongNetwork) {
    return (
      <div className="bg-rose-950/60 border-b border-rose-500/30 px-4 py-3 text-rose-200 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>
              Votre portefeuille est connecté à un autre réseau. Le contrat DocumentRegistry est configuré sur <strong>{targetNetwork?.name || `Chain ID ${targetChainId}`}</strong>.
            </span>
          </div>
          <button
            onClick={() => switchNetwork(targetChainId)}
            className="flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Basculer sur {targetNetwork?.name || "le bon réseau"}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
