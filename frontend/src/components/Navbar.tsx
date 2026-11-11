import React from "react";
import { Shield, Wallet, AlertTriangle, ExternalLink, LogOut } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { shortenAddress } from "../utils/crypto";
import { SUPPORTED_NETWORKS } from "../types";

export const Navbar: React.FC = () => {
  const {
    account,
    balance,
    chainId,
    isConnected,
    isConnecting,
    isMetaMaskInstalled,
    isWrongNetwork,
    targetChainId,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  } = useWallet();

  const currentNetwork = chainId ? SUPPORTED_NETWORKS[chainId] : null;
  const targetNetwork = SUPPORTED_NETWORKS[targetChainId];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Titre */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">
                  Doc<span className="text-indigo-400">Shield</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Blockchain v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Certification d'intégrité de documents via Smart Contract
              </p>
            </div>
          </div>

          {/* Section Réseau & Portefeuille */}
          <div className="flex items-center space-x-3">
            {/* Indicateur Réseau */}
            {isConnected && (
              <div className="hidden md:flex items-center">
                {isWrongNetwork ? (
                  <button
                    onClick={() => switchNetwork(targetChainId)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-medium cursor-pointer"
                    title="Cliquer pour basculer sur le bon réseau"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Mauvais réseau (Basculer sur {targetNetwork?.name || targetChainId})</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{currentNetwork?.name || `Chain ID ${chainId}`}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bouton de connexion ou Profil */}
            {!isMetaMaskInstalled ? (
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Installer MetaMask</span>
              </a>
            ) : !isConnected ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? "Connexion..." : "Connecter MetaMask"}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 pl-3">
                {balance !== null && (
                  <span className="text-xs font-semibold text-slate-300 pr-2 border-r border-slate-800 hidden sm:inline">
                    {balance} ETH
                  </span>
                )}
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {account?.slice(2, 4)}
                  </div>
                  <span className="text-xs font-mono text-slate-200">
                    {shortenAddress(account || "")}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  title="Déconnecter la session"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
