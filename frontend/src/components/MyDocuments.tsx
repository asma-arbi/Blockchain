import React, { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Clock,
  Hash,
  Copy,
  CheckCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  FolderOpen,
  ArrowUpRight,
} from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { useDocumentContract } from "../hooks/useDocumentContract";
import { DocumentRecord } from "../types";
import { formatTimestamp, copyToClipboard } from "../utils/crypto";

interface MyDocumentsProps {
  onVerifyDocument: (hash: string) => void;
  onNavigateToRegister: () => void;
}

export const MyDocuments: React.FC<MyDocumentsProps> = ({
  onVerifyDocument,
  onNavigateToRegister,
}) => {
  const { account, isConnected, connectWallet } = useWallet();
  const { getUserDocuments } = useDocumentContract();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!account) return;
    try {
      setLoading(true);
      const docs = await getUserDocuments(account);
      setDocuments(docs);
    } catch (err) {
      console.error("Erreur lors du chargement des documents :", err);
    } finally {
      setLoading(false);
    }
  }, [account, getUserDocuments]);

  useEffect(() => {
    if (isConnected && account) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [isConnected, account, fetchDocuments]);

  const handleCopy = async (hash: string) => {
    const ok = await copyToClipboard(hash);
    if (ok) {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  // Filtrage par recherche
  const filteredDocuments = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.hash.toLowerCase().includes(q)
    );
  });

  if (!isConnected) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
          <FolderOpen className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Consultez votre historique d'ancrage</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Connectez votre portefeuille MetaMask pour afficher tous les documents et empreintes que vous avez certifiés sur la blockchain.
          </p>
        </div>
        <button
          onClick={connectWallet}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          Connecter mon portefeuille
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre de contrôle : Recherche et Actualisation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom de fichier ou empreinte..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-2 text-xs font-medium"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      {loading && documents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Chargement de votre registre on-chain...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">Aucun document certifié pour le moment</h4>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Vous n'avez pas encore ancré de document avec cette adresse sur ce registre.
            </p>
          </div>
          <button
            onClick={onNavigateToRegister}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Enregistrer mon premier document</span>
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
          Aucun document ne correspond à votre recherche "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocuments.map((doc, idx) => (
            <div
              key={`${doc.hash}-${idx}`}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white">{doc.name}</h4>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTimestamp(doc.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-center">
                  <button
                    onClick={() => onVerifyDocument(doc.hash)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Vérifier</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Hash complet */}
              <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-xl border border-slate-800/70 text-xs font-mono">
                <div className="flex items-center space-x-2 overflow-hidden mr-2">
                  <Hash className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-slate-300 truncate select-all">{doc.hash}</span>
                </div>
                <button
                  onClick={() => handleCopy(doc.hash)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                  title="Copier le hash SHA-256"
                >
                  {copiedHash === doc.hash ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
