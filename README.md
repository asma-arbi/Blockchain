# 🛡️ DocShield — Vérification d'Intégrité & Autorité de Certification Blockchain

Application Web décentralisée (dApp) complète et sécurisée permettant :
1. **L'ancrage d'intégrité de documents (SHA-256 / Solidity bytes32)** garantissant la non-altération mathématique au bit près.
2. **L'accréditation institutionnelle et le contrôle d'accès basé sur les rôles (RBAC)** via OpenZeppelin (`DEFAULT_ADMIN_ROLE`, `ISSUER_ROLE`, `REVOKER_ROLE`).
3. **La révocation motivée et traçable** en cas d'annulation ou de fraude constatée.

---

## 🏗️ Architecture Multi-Contrats

```
                                  NAVIGATEUR (Client)
                      ┌─────────────────────────────────────────┐
                      │  • Web Crypto API : SHA-256 local       │
                      │  • MetaMask (Signatures ethers.js v6)   │
                      └─────────────┬───────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│     DocumentRegistry.sol     │        │   CertificateAuthority.sol   │
├──────────────────────────────┤        ├──────────────────────────────┤
│ • Ancrage public des hashs   │        │ • OpenZeppelin AccessControl │
│ • Nom original & timestamp   │        │ • Accréditation Universités/ │
│ • Anti-doublon strict        │        │   Notaires (ISSUER_ROLE)     │
│ • Historique par propriétaire│        │ • Révocation motivée avec    │
│ • Vérification en lecture    │        │   motif officiel traçable    │
└──────────────────────────────┘        └──────────────────────────────┘
```

---

## 📊 Rôles & Sécurité Cryptographique (RBAC)

* **`DEFAULT_ADMIN_ROLE`** : Administrateur du protocole. Il est le seul à pouvoir accréditer (`accreditIssuer`) ou désactiver (`deactivateIssuer`) une institution officielle.
* **`ISSUER_ROLE`** : Accordé aux organismes vérifiés (Universités, Ministères, Notaires). Permet d'apposer le sceau institutionnel officiel sur un document (`issueCertificate`).
* **`REVOKER_ROLE`** : Permet à l'émetteur d'origine ou à un auditeur assermenté d'invalider un certificat frauduleux ou caduc (`revokeCertificate(hash, reason)`).

---

## 🧪 Tests Automatisés & Sécurité (23 tests au vert)

Le projet comporte **23 tests unitaires et de sécurité**, incluant des tests spécifiques de vulnérabilités :
```bash
npx hardhat test
```

### Couverture des tests :
* **Tests de vulnérabilités RBAC** : Vérification qu'un compte non autorisé (attaquant) ne peut ni s'auto-accréditer, ni certifier officiellement, ni révoquer un document.
* **Tests d'intégrité & effet d'avalanche** : Détection immédiate d'une altération d'un seul octet dans un fichier.
* **Tests de cycle de vie** : Émission, double-revendication (anti-doublon), révocation motivée, double-révocation impossible.
* **Tests de robustesse** : Hashes nuls (`bytes32(0)`), noms vides, adresses zéro.

---

## 🚀 Guide de Démarrage Rapide

### 1. Démarrer la blockchain locale (Terminal 1)
```bash
npx hardhat node
```

### 2. Déployer les 2 contrats (Terminal 2)
```bash
npx hardhat run scripts/deploy.ts --network localhost
```
*Déploie `DocumentRegistry` et `CertificateAuthority` et exporte automatiquement les adresses et ABIs vers le frontend.*

### 3. Lancer l'application Web (Terminal 2)
```bash
npm --prefix frontend run dev
```
Accédez à l'application sur : **`http://localhost:5173`**

---

## 📱 Fonctionnalités de l'Application

1. **Enregistrer un document** : Drag & drop, calcul de l'empreinte SHA-256 dans le navigateur (Web Crypto API, zéro upload), transaction MetaMask et confirmation on-chain.
2. **Vérifier un document** :
   * 🟢 **VERT « Document intègre »** : Empreinte concordante, date d'ancrage et émetteur certifiés.
   * 🏆 **BADGE « Institution Accréditée »** : Si émis par un organisme officiel vérifié (ex: Université, Notaire).
   * 🟠 **ORANGE « Document Révoqué »** : Affiche le motif officiel de révocation et la date d'invalidation.
   * 🔴 **ROUGE « Document altéré ou non enregistré »** : Fraude ou modification détectée.
3. **Gouvernance & Rôles (RBAC)** : Interface réservée aux administrateurs et institutions pour accréditer de nouveaux émetteurs et révoquer des certificats.
4. **Mes documents** : Historique complet avec recherche instantanée et vérification en un clic.

---

## 📄 Licence
Ce projet est distribué sous licence MIT.
