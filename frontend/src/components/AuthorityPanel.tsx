import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  UserCheck,
  ShieldAlert,
  Building2,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { useAuthorityContract } from "../hooks/useAuthorityContract";

export const AuthorityPanel: React.FC = () => {
  const { account, isConnected, connectWallet } = useWallet();
  const {
    accreditIssuer,
    issueOfficialCertificate,
    revokeOfficialCertificate,
    checkUserRoles,
    authorityAddress,
  } = useAuthorityContract();

  const [roles, setRoles] = useState<{ isAdmin: boolean; isIssuer: boolean; organization?: string }>({
    isAdmin: false,
    isIssuer: false,
  });
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

  // Formulaire d'accréditation (Admin)
  const [accreditAddr, setAccreditAddr] = useState<string>("");
  const [accreditOrg, setAccreditOrg] = useState<string>("");
  const [accreditLoading, setAccreditLoading] = useState<boolean>(false);

  // Formulaire d'émission officielle (Issuer)
  const [certHash, setCertHash] = useState<string>("");
  const [certLoading, setCertLoading] = useState<boolean>(false);

  // Formulaire de révocation (Revoker)
  const [revokeHash, setRevokeHash] = useState<string>("");
  const [revokeReason, setRevokeReason] = useState<string>("");
  const [revokeLoading, setRevokeLoading] = useState<boolean>(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const refreshRoles = useCallback(async () => {
    if (!account) return;
    setLoadingRoles(true);
    try {
      const res = await checkUserRoles(account);
      setRoles(res);
    } finally {
      setLoadingRoles(false);
    }
  }, [account, checkUserRoles]);

  useEffect(() => {
    if (isConnected && account) {
      refreshRoles();
    }
  }, [isConnected, account, refreshRoles]);

  const handleAccredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accreditAddr || !accreditOrg) return;
    try {
      setAccreditLoading(true);
      setFeedback(null);
      await accreditIssuer(accreditAddr.trim(), accreditOrg.trim());
      setFeedback({
        type: "success",
        message: `Institution "${accreditOrg}" accréditée avec succès (Rôle ISSUER_ROLE attribué) !`,
      });
      setAccreditAddr("");
      setAccreditOrg("");
      await refreshRoles();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de l'accréditation." });
    } finally {
      setAccreditLoading(false);
    }
  };

  const handleIssueCert = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHash = certHash.trim();
    if (!cleanHash) return;
    try {
      setCertLoading(true);
      setFeedback(null);
      await issueOfficialCertificate(cleanHash.startsWith("0x") ? cleanHash : `0x${cleanHash}`);
      setFeedback({
        type: "success",
        message: "Certificat officiel émis avec succès sur CertificateAuthority !",
      });
      setCertHash("");
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de l'émission." });
    } finally {
      setCertLoading(false);
    }
  };

  const handleRevokeCert = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHash = revokeHash.trim();
    if (!cleanHash || !revokeReason.trim()) return;
    try {
      setRevokeLoading(true);
      setFeedback(null);
      await revokeOfficialCertificate(
        cleanHash.startsWith("0x") ? cleanHash : `0x${cleanHash}`,
        revokeReason.trim()
      );
      setFeedback({
        type: "success",
        message: "Certificat officiellement révoqué sur la blockchain avec motif enregistré.",
      });
      setRevokeHash("");
      setRevokeReason("");
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de la révocation." });
    } finally {
      setRevokeLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <KeyRound className="w-12 h-12 text-indigo-400 mx-auto" />
        <h3 className="text-lg font-semibold text-white">Gestion des Rôles & Gouvernance (RBAC)</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Connectez votre portefeuille MetaMask pour vérifier vos privilèges d'administration et émettre des certificats officiels.
        </p>
        <button
          onClick={connectWallet}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
        >
          Connecter MetaMask
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Badge de statut du compte connecté */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-base font-bold text-white">Vos autorisations blockchain</h4>
              {loadingRoles && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {roles.isAdmin && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  DEFAULT_ADMIN_ROLE (Gouvernance)
                </span>
              )}
              {roles.isIssuer && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  ISSUER_ROLE ({roles.organization || "Émetteur Accrédité"})
                </span>
              )}
              {!roles.isAdmin && !roles.isIssuer && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  Utilisateur Standard (Vérificateur Public)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Contrat Authority : <span className="text-indigo-300">{authorityAddress.slice(0, 10)}...</span>
        </div>
      </div>

      {/* Bannière de feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-200"
              : "bg-rose-950/60 border border-rose-500/30 text-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1 : ACCRÉDITATION (ADMIN ONLY) */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          <h4 className="text-sm sm:text-base font-bold text-white">
            1. Accréditer une Institution (Admin)
          </h4>
        </div>
        <p className="text-xs text-slate-400">
          Attribue le rôle cryptographique <code>ISSUER_ROLE</code> à une adresse Ethereum (ex: Université, Cabinet Notarial).
        </p>

        <form onSubmit={handleAccredit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={accreditAddr}
              onChange={(e) => setAccreditAddr(e.target.value)}
              placeholder="Adresse Ethereum (0x...)"
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={accreditOrg}
              onChange={(e) => setAccreditOrg(e.target.value)}
              placeholder="Nom de l'organisme (ex: Universite Paris-Saclay)"
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={accreditLoading || !roles.isAdmin}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-all flex items-center space-x-2 cursor-pointer"
          >
            {accreditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Accréditer comme Institution Émettrice</span>
          </button>
          {!roles.isAdmin && (
            <p className="text-[11px] text-amber-400/80">
              * Réservé au compte administrateur déployeur.
            </p>
          )}
        </form>
      </div>

      {/* SECTION 2 : ÉMISSION ET RÉVOCATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Émission officielle */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Émettre un Certificat Officiel</h4>
          </div>
          <p className="text-xs text-slate-400">
            Ancre l'empreinte SHA-256 avec le sceau officiel de votre organisme accrédité.
          </p>

          <form onSubmit={handleIssueCert} className="space-y-3">
            <input
              type="text"
              value={certHash}
              onChange={(e) => setCertHash(e.target.value)}
              placeholder="Empreinte SHA-256 (0x...)"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={certLoading || !roles.isIssuer}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {certLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Certifier Officiellement</span>
            </button>
            {!roles.isIssuer && (
              <p className="text-[11px] text-amber-400/80">
                * Requiert le rôle <code>ISSUER_ROLE</code>.
              </p>
            )}
          </form>
        </div>

        {/* Révocation motivée */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Révoquer un Document avec Motif</h4>
          </div>
          <p className="text-xs text-slate-400">
            Invalide définitivement un document (ex: diplôme frauduleux, contrat caduc).
          </p>

          <form onSubmit={handleRevokeCert} className="space-y-3">
            <input
              type="text"
              value={revokeHash}
              onChange={(e) => setRevokeHash(e.target.value)}
              placeholder="Empreinte SHA-256 à révoquer (0x...)"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Motif officiel (ex: Fraude constatee au jury)"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={revokeLoading || !roles.isAdmin}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {revokeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              <span>Révoquer le Certificat</span>
            </button>
            {!roles.isAdmin && (
              <p className="text-[11px] text-amber-400/80">
                * Requiert le rôle <code>REVOKER_ROLE</code> ou Admin.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Pédagogie de sécurité pour la soutenance */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Justification d'architecture pour votre évaluation : </strong>
          Ce contrat applique le principe de <em>séparation des responsabilités</em>. Alors que <code>DocumentRegistry</code> permet à n'importe quel citoyen de prouver l'antériorité de son document, <code>CertificateAuthority</code> fournit la couche institutionnelle avec gouvernance, contrôle d'accès (RBAC) et droit de révocation motivée.
        </div>
      </div>
    </div>
  );
};
