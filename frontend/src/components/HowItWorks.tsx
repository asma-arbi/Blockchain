import React from "react";
import { Cpu, Database, Eye, Zap } from "lucide-react";

export const HowItWorks: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          Comment fonctionne la certification d'intégrité ?
        </h3>
        <p className="text-sm text-slate-400">
          Un protocole décentralisé garantissant la preuve d'existence, l'antériorité et la non-altération de vos documents sans jamais divulguer vos données.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Étape 1 */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Étape 1 • Navigateur
            </span>
            <h4 className="text-base font-bold text-white">Calcul du Hash SHA-256</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Votre navigateur utilise l'API native <code>crypto.subtle</code> pour générer une empreinte de 256 bits (32 octets). Le fichier <strong>ne quitte jamais votre ordinateur</strong>.
          </p>
        </div>

        {/* Étape 2 */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
              Étape 2 • Blockchain
            </span>
            <h4 className="text-base font-bold text-white">Ancrage Immuable</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vous signez une transaction via MetaMask. Le smart contract enregistre l'empreinte, votre adresse Ethereum et l'horodatage exact du bloc (<code>block.timestamp</code>).
          </p>
        </div>

        {/* Étape 3 */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Eye className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Étape 3 • Vérification
            </span>
            <h4 className="text-base font-bold text-white">Audit Public & Gratuit</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            N'importe qui peut soumettre un document. Si son hash correspond, l'intégrité et la date d'enregistrement sont prouvées par un appel en lecture (<code>view</code>) sans frais de gas.
          </p>
        </div>
      </div>

      {/* Propriétés cryptographiques */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Pourquoi ce système est-il infalsifiable ?</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <strong className="text-slate-200 block mb-1">Effet d'avalanche :</strong>
            La modification d'un seul octet ou caractère dans le fichier produit une empreinte SHA-256 totalement méconnaissable et non concordante.
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <strong className="text-slate-200 block mb-1">Résistance aux collisions :</strong>
            Il est mathématiquement impossible de concevoir deux documents différents produisant le même hash SHA-256 (sécurité $2^{256}$ états).
          </div>
        </div>
      </div>
    </div>
  );
};
