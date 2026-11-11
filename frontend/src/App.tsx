import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { NetworkAlert } from "./components/NetworkAlert";
import { RegisterDocument } from "./components/RegisterDocument";
import { VerifyDocument } from "./components/VerifyDocument";
import { MyDocuments } from "./components/MyDocuments";
import { HowItWorks } from "./components/HowItWorks";
import { CONTRACT_ADDRESS, CONTRACT_NETWORK, CONTRACT_CHAIN_ID } from "./contracts/contractConfig";
import { shortenAddress } from "./utils/crypto";
import { Shield, Search, FileText, HelpCircle } from "lucide-react";

export type TabKey = "register" | "verify" | "my-docs" | "how-it-works";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("register");
  const [verifyInitialHash, setVerifyInitialHash] = useState<string>("");

  const handleNavigateToVerify = (hash: string) => {
    setVerifyInitialHash(hash);
    setActiveTab("verify");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <NetworkAlert />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* En-tête de page / Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>Preuve d'existence & Non-répudiation Décentralisée</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Vérification d'intégrité de documents
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Ancrez l'empreinte cryptographique de vos fichiers sur la blockchain Ethereum.
            Prouvez leur authenticité et détectez toute altération au bit près.
          </p>
        </div>

        {/* Barre d'onglets de navigation */}
        <div className="flex justify-center">
          <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1 shadow-lg">
            <button
              onClick={() => setActiveTab("register")}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Enregistrer un document</span>
            </button>

            <button
              onClick={() => setActiveTab("verify")}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "verify"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Vérifier un document</span>
            </button>

            <button
              onClick={() => setActiveTab("my-docs")}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "my-docs"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Mes documents</span>
            </button>

            <button
              onClick={() => setActiveTab("how-it-works")}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "how-it-works"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Principe</span>
            </button>
          </div>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="mt-6">
          {activeTab === "register" && (
            <RegisterDocument
              onDocumentRegistered={() => setActiveTab("my-docs")}
              onNavigateToVerify={handleNavigateToVerify}
            />
          )}

          {activeTab === "verify" && (
            <VerifyDocument initialHash={verifyInitialHash} />
          )}

          {activeTab === "my-docs" && (
            <MyDocuments
              onVerifyDocument={handleNavigateToVerify}
              onNavigateToRegister={() => setActiveTab("register")}
            />
          )}

          {activeTab === "how-it-works" && <HowItWorks />}
        </div>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-8 mt-auto text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span>Smart Contract :</span>
            <code className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              {shortenAddress(CONTRACT_ADDRESS, 8, 6)}
            </code>
            <span className="text-slate-600">•</span>
            <span>Réseau : {CONTRACT_NETWORK} ({CONTRACT_CHAIN_ID})</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Solidity ^0.8.20 • Ethers.js v6 • Web Crypto API</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
