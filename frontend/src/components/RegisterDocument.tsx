import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileCheck,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { hashFile, HashResult, formatFileSize, copyToClipboard } from "../utils/crypto";
import { useWallet } from "../context/WalletContext";
import { useDocumentContract } from "../hooks/useDocumentContract";
import { TxState, SUPPORTED_NETWORKS } from "../types";

interface RegisterDocumentProps {
  onDocumentRegistered?: () => void;
  onNavigateToVerify?: (hash: string) => void;
}

export const RegisterDocument: React.FC<RegisterDocumentProps> = ({
  onDocumentRegistered,
  onNavigateToVerify,
}) => {
  const { isConnected, isWrongNetwork, connectWallet, targetChainId } = useWallet();
  const { registerDocument, verifyDocument } = useDocumentContract();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileHashResult, setFileHashResult] = useState<HashResult | null>(null);
  const [documentName, setDocumentName] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [hashProgress, setHashProgress] = useState<number>(0);
  const [alreadyRegisteredWarning, setAlreadyRegisteredWarning] = useState<boolean>(false);

  const [txState, setTxState] = useState<TxState>({ step: "idle" });
  const [confirmedBlock, setConfirmedBlock] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Traitement d'un fichier sélectionné ou déposé
  const processSelectedFile = async (file: File) => {
    try {
      setIsHashing(true);
      setHashProgress(0);
      setTxState({ step: "idle" });
      setAlreadyRegisteredWarning(false);
      setConfirmedBlock(null);

      const result = await hashFile(file, (progress) => {
        setHashProgress(progress);
      });

      setFileHashResult(result);
      setDocumentName(result.fileName);

      // Vérification préventive : est-ce que ce document existe déjà ?
      const check = await verifyDocument(result.bytes32Hash);
      if (check.exists) {
        setAlreadyRegisteredWarning(true);
      }
    } catch (err: any) {
      setTxState({
        step: "error",
        errorMessage: err.message || "Erreur lors du calcul de l'empreinte numérique.",
      });
    } finally {
      setIsHashing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleCopyHash = async () => {
    if (!fileHashResult) return;
    const ok = await copyToClipboard(fileHashResult.bytes32Hash);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegisterOnChain = async () => {
    if (!fileHashResult) return;
    if (!documentName.trim()) {
      setTxState({
        step: "error",
        errorMessage: "Veuillez renseigner un nom pour ce document.",
      });
      return;
    }

    try {
      setTxState({ step: "waiting_signature" });

      const { txHash, blockNumber } = await registerDocument(
        fileHashResult.bytes32Hash,
        documentName.trim(),
        (submittedHash) => {
          setTxState({ step: "mining", txHash: submittedHash });
        }
      );

      setConfirmedBlock(blockNumber);
      setTxState({ step: "confirmed", txHash });
      setAlreadyRegisteredWarning(false);

      if (onDocumentRegistered) {
        onDocumentRegistered();
      }
    } catch (err: any) {
      setTxState({
        step: "error",
        errorMessage: err.message || "Échec de l'enregistrement sur la blockchain.",
      });
    }
  };

  // URL explorateur si configuré
  const explorerBaseUrl = SUPPORTED_NETWORKS[targetChainId]?.blockExplorerUrls?.[0];
  const txExplorerUrl = explorerBaseUrl && txState.txHash ? `${explorerBaseUrl}/tx/${txState.txHash}` : null;

  return (
    <div className="space-y-6">
      {/* Bannière de confidentialité */}
      <div className="flex items-start space-x-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs sm:text-sm text-slate-300">
        <Lock className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white font-semibold">Garantie de stricte confidentialité : </strong>
          Votre document n'est <strong>jamais envoyé ni stocké sur la blockchain ou un serveur distant</strong>. Seule l'empreinte mathématique SHA-256 (32 octets) calculée localement par votre navigateur est ancrée.
        </div>
      </div>

      {/* Zone de Drag & Drop */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
            : "border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Déposez votre document ici ou{" "}
              <span className="text-indigo-400 underline decoration-indigo-400/30 underline-offset-4">
                parcourez vos fichiers
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Tous types de fichiers acceptés (PDF, images, archives, contrats, documents Office)
            </p>
          </div>
        </div>
      </div>

      {/* Calcul en cours */}
      {isHashing && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Calcul du hash SHA-256 via Web Crypto API...</span>
              <span>{hashProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 transition-all duration-200"
                style={{ width: `${hashProgress || 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fichier analysé et résultat du Hash */}
      {fileHashResult && !isHashing && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">{fileHashResult.fileName}</h4>
                <p className="text-xs text-slate-400">
                  {formatFileSize(fileHashResult.fileSize)} • Type : {fileHashResult.fileType}
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              SHA-256 calculé
            </span>
          </div>

          {/* Affichage du Hash bytes32 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Empreinte numérique unique (format Solidity bytes32)
            </label>
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-indigo-300 break-all select-all">
              <span className="flex-1">{fileHashResult.bytes32Hash}</span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                title="Copier le hash"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Édition du nom à enregistrer */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Nom du document sur la blockchain
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="ex: Contrat de prestation 2026.pdf"
            />
          </div>

          {/* Alerte si déjà enregistré */}
          {alreadyRegisteredWarning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-amber-200 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong>Document déjà enregistré :</strong> Cette empreinte existe déjà sur la blockchain. Une tentative d'enregistrement sera refusée par le smart contract.
                {onNavigateToVerify && (
                  <button
                    type="button"
                    onClick={() => onNavigateToVerify(fileHashResult.bytes32Hash)}
                    className="mt-2 flex items-center space-x-1 text-amber-300 font-semibold underline hover:text-white"
                  >
                    <span>Vérifier l'authenticité de ce document maintenant</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bouton d'action */}
          <div className="pt-2">
            {!isConnected ? (
              <button
                type="button"
                onClick={connectWallet}
                className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
              >
                <span>Connecter MetaMask pour enregistrer</span>
              </button>
            ) : isWrongNetwork ? (
              <div className="text-center py-2 text-rose-400 text-xs font-medium">
                Veuillez basculer sur le réseau supporté avant d'enregistrer.
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  txState.step === "waiting_signature" ||
                  txState.step === "mining" ||
                  alreadyRegisteredWarning ||
                  !documentName.trim()
                }
                onClick={handleRegisterOnChain}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {txState.step === "waiting_signature" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Confirmation requise dans MetaMask...</span>
                  </>
                ) : txState.step === "mining" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Validation du bloc sur la blockchain...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Enregistrer sur la blockchain</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cartes de Statut de Transaction */}
      {txState.step === "waiting_signature" && (
        <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center space-x-4 animate-pulse">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin flex-shrink-0" />
          <div className="text-sm">
            <h5 className="font-semibold text-white">Signature en attente dans votre portefeuille</h5>
            <p className="text-xs text-indigo-200 mt-0.5">
              Veuillez ouvrir votre extension MetaMask et approuver la transaction.
            </p>
          </div>
        </div>
      )}

      {txState.step === "mining" && (
        <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin flex-shrink-0" />
            <h5 className="font-semibold text-white text-sm">
              Transaction en cours de minage dans le réseau...
            </h5>
          </div>
          {txState.txHash && (
            <p className="text-xs font-mono text-slate-300 break-all pl-9">
              Hash Tx: {txState.txHash}
            </p>
          )}
        </div>
      )}

      {txState.step === "confirmed" && (
        <div className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 space-y-4 shadow-xl shadow-emerald-950/50 animate-fade-in">
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle className="w-7 h-7 flex-shrink-0" />
            <div>
              <h4 className="text-base font-bold text-white">
                Document certifié avec succès sur la blockchain !
              </h4>
              <p className="text-xs text-emerald-200">
                L'empreinte numérique a été définitivement ancrée dans le registre immuable.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-4 border border-emerald-500/20 space-y-2 text-xs">
            {confirmedBlock && (
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Numéro de bloc :</span>
                <span className="font-mono font-semibold text-white">#{confirmedBlock}</span>
              </div>
            )}
            {txState.txHash && (
              <div className="flex flex-col sm:flex-row sm:justify-between text-slate-300 gap-1">
                <span className="text-slate-400">Hash de transaction :</span>
                <span className="font-mono text-indigo-300 break-all">{txState.txHash}</span>
              </div>
            )}
          </div>

          {txExplorerUrl && (
            <a
              href={txExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-300 hover:text-white underline"
            >
              <span>Voir la transaction sur l'explorateur de blocs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {txState.step === "error" && (
        <div className="p-5 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-start space-x-3 text-rose-200">
          <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2 flex-1">
            <h5 className="font-semibold text-white">Échec de l'enregistrement</h5>
            <div className="text-xs text-rose-300 mt-1 whitespace-pre-line leading-relaxed font-sans">
              {txState.errorMessage}
            </div>
            {txState.errorMessage?.includes("autorisé") && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await connectWallet();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Reconnecter et autoriser MetaMask maintenant</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
