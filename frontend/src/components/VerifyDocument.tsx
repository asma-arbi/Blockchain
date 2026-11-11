import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  CheckCircle2,
  XCircle,
  Search,
  Copy,
  CheckCircle,
  Clock,
  User,
  Hash,
  Loader2,
  FileText,
  AlertTriangle,
  Building2,
  ShieldAlert,
  Award,
} from "lucide-react";
import { hashFile, formatTimestamp, copyToClipboard } from "../utils/crypto";
import { useDocumentContract } from "../hooks/useDocumentContract";
import { useAuthorityContract } from "../hooks/useAuthorityContract";
import { VerificationResult, CertificateStatus } from "../types";

interface VerifyDocumentProps {
  initialHash?: string;
}

export const VerifyDocument: React.FC<VerifyDocumentProps> = ({ initialHash }) => {
  const { verifyDocument } = useDocumentContract();
  const { verifyOfficialCertificate } = useAuthorityContract();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [manualHashInput, setManualHashInput] = useState<string>("");
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [copiedOwner, setCopiedOwner] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exécution de la vérification on-chain (sur les 2 contrats)
  const executeVerification = async (targetHash: string) => {
    try {
      setIsVerifying(true);
      const [registryResult, officialCert] = await Promise.all([
        verifyDocument(targetHash),
        verifyOfficialCertificate(targetHash),
      ]);

      setVerificationResult({
        ...registryResult,
        officialCert: officialCert || undefined,
        // Si présent dans CertificateAuthority, il existe sur la blockchain
        exists: registryResult.exists || Boolean(officialCert?.exists),
      });
    } catch (err: any) {
      setVerificationResult({
        isVerified: false,
        checkedHash: targetHash,
        exists: false,
        errorMessage: err.message || "Erreur de communication avec la blockchain.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Traitement d'un fichier sélectionné
  const processFile = async (file: File) => {
    try {
      setIsHashing(true);
      setVerificationResult(null);
      const result = await hashFile(file);
      setManualHashInput(result.bytes32Hash);
      await executeVerification(result.bytes32Hash);
    } catch (err: any) {
      setVerificationResult({
        isVerified: false,
        checkedHash: "",
        exists: false,
        errorMessage: err.message || "Erreur lors du hachage du fichier.",
      });
    } finally {
      setIsHashing(false);
    }
  };

  // Support pour un hash initial passé en prop
  useEffect(() => {
    if (initialHash) {
      setManualHashInput(initialHash);
      executeVerification(initialHash);
    }
  }, [initialHash]);

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualHashInput.trim();
    if (!clean) return;
    executeVerification(clean.startsWith("0x") ? clean : `0x${clean}`);
  };

  const handleCopyText = async (text: string, type: "hash" | "owner") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      if (type === "hash") {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      } else {
        setCopiedOwner(true);
        setTimeout(() => setCopiedOwner(false), 2000);
      }
    }
  };

  const isRevoked = verificationResult?.officialCert?.status === CertificateStatus.REVOKED;

  return (
    <div className="space-y-6">
      {/* Zone de Drag & Drop */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-cyan-400 bg-cyan-500/10 scale-[1.01]"
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
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Déposez le document à vérifier ou{" "}
              <span className="text-cyan-400 underline decoration-cyan-400/30 underline-offset-4">
                sélectionnez-le sur votre appareil
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Interrogation simultanée du registre DocumentRegistry et de l'autorité CertificateAuthority
            </p>
          </div>
        </div>
      </div>

      {/* Recherche manuelle par Hash */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={manualHashInput}
              onChange={(e) => setManualHashInput(e.target.value)}
              placeholder="Ou collez directement une empreinte bytes32 (0x...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isVerifying || !manualHashInput.trim()}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-600/30 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Vérifier le hash</span>
          </button>
        </form>
      </div>

      {/* Indicateur de calcul de Hash en cours */}
      {isHashing && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span className="text-sm text-slate-300">
            Calcul de l'empreinte SHA-256 du fichier sélectionné...
          </span>
        </div>
      )}

      {/* RÉSULTAT CLAIR ET DISTINCTIF */}
      {verificationResult && (
        <div className="space-y-4">
          {/* CAS 1 : DOCUMENT RÉVOQUÉ (Alerte Orange/Ambre) */}
          {isRevoked ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-amber-950/80 to-slate-950 border-2 border-amber-500 shadow-2xl shadow-amber-950/60 space-y-6 animate-fade-in">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <ShieldAlert className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Alerte Révocation Officielle
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                    Document officiel RÉVOQUÉ / INVALIDÉ
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-200">
                    Ce document a bien été émis mais a été officiellement révoqué par l'institution émettrice.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Institution émettrice :</span>
                    <span className="font-semibold text-white">
                      {verificationResult.officialCert?.organization}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Date de révocation :</span>
                    <span className="font-semibold text-amber-300">
                      {formatTimestamp(verificationResult.officialCert?.revokedAt || 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block font-medium text-xs">Motif officiel de révocation :</span>
                  <p className="text-sm font-semibold text-amber-200 mt-1 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    "{verificationResult.officialCert?.revocationReason}"
                  </p>
                </div>
              </div>
            </div>
          ) : verificationResult.exists ? (
            /* CAS 2 : VERT - DOCUMENT INTÈGRE & ACTIF */
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-emerald-950/70 to-slate-950 border-2 border-emerald-500 shadow-2xl shadow-emerald-950/60 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-emerald-500/30 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Certification Validée
                      </span>
                      {verificationResult.officialCert?.status === CertificateStatus.ACTIVE && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                          <Award className="w-3 h-3 text-indigo-400" />
                          <span>Institution Accréditée (RBAC)</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                      Document intègre
                    </h3>
                    <p className="text-xs sm:text-sm text-emerald-200">
                      Ce document correspond exactement à l'empreinte ancrée sur la blockchain. Aucune altération détectée.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fiche détaillée du certificat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Organisme officiel si présent */}
                {verificationResult.officialCert?.organization && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex items-start space-x-3 md:col-span-2">
                    <Building2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                        Organisme accrédité émetteur
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {verificationResult.officialCert.organization}
                      </div>
                    </div>
                  </div>
                )}

                {/* Nom enregistré */}
                {verificationResult.name && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <div className="text-xs text-slate-400 font-medium">Nom du fichier</div>
                      <div className="text-sm font-semibold text-white truncate mt-0.5">
                        {verificationResult.name}
                      </div>
                    </div>
                  </div>
                )}

                {/* Date d'ancrage */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Date d'horodatage blockchain</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      {formatTimestamp(
                        verificationResult.timestamp || verificationResult.officialCert?.issuedAt || 0
                      )}
                    </div>
                  </div>
                </div>

                {/* Émetteur */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-start justify-between space-x-3 md:col-span-2">
                  <div className="flex items-start space-x-3 overflow-hidden">
                    <User className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <div className="text-xs text-slate-400 font-medium">Adresse de l'émetteur</div>
                      <div className="text-xs sm:text-sm font-mono text-emerald-300 break-all mt-0.5">
                        {verificationResult.owner || verificationResult.officialCert?.issuer}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyText(
                        verificationResult.owner || verificationResult.officialCert?.issuer || "",
                        "owner"
                      )
                    }
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Copier l'adresse"
                  >
                    {copiedOwner ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Hash vérifié */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-start justify-between space-x-3 md:col-span-2">
                  <div className="flex items-start space-x-3 overflow-hidden">
                    <Hash className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <div className="text-xs text-slate-400 font-medium">Empreinte SHA-256 certifiée (bytes32)</div>
                      <div className="text-xs font-mono text-slate-200 break-all mt-0.5">
                        {verificationResult.checkedHash}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyText(verificationResult.checkedHash, "hash")}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                    title="Copier le hash"
                  >
                    {copiedHash ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CAS 3 : ROUGE - DOCUMENT MODIFIÉ OU JAMAIS ENREGISTRÉ */
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-rose-950/70 to-slate-950 border-2 border-rose-500 shadow-2xl shadow-rose-950/60 space-y-6 animate-fade-in">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shadow-inner">
                  <XCircle className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Alerte d'intégrité
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                    Document modifié ou jamais enregistré
                  </h3>
                  <p className="text-xs sm:text-sm text-rose-200">
                    L'empreinte de ce document ne correspond à aucun ancrage dans le registre ni auprès de l'autorité.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/20 space-y-3">
                <div className="flex items-start space-x-2 text-xs text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>Deux causes possibles :</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-4">
                  <li>
                    <strong>Altération :</strong> Le document d'origine a été modifié même d'un seul octet (ponctuation, métadonnée, contenu). En vertu de l'effet d'avalanche de SHA-256, l'empreinte obtenue est totalement méconnaissable et différente.
                  </li>
                  <li>
                    <strong>Non-enregistrement :</strong> Ce fichier n'a jamais été certifié dans ce registre blockchain.
                  </li>
                </ul>

                {verificationResult.checkedHash && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Hash testé :
                    </span>
                    <span className="font-mono text-xs text-slate-300 break-all select-all">
                      {verificationResult.checkedHash}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
