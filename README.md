# 🛡️ DocShield — Vérification d'Intégrité de Documents par la Blockchain

Application Web décentralisée (dApp) complète permettant d'assurer la preuve d'existence, l'antériorité et la non-altération de documents numériques grâce à l'ancrage de leur empreinte cryptographique (SHA-256) sur un smart contract Ethereum (Solidity ^0.8.20).

---

## 📌 Principe Fondamental & Respect de la Confidentialité

* **Le fichier n'est JAMAIS envoyé ni stocké sur la blockchain ou un serveur distant** : seul son hash est transmis.
* **Calcul client-side sécurisé** : L'empreinte SHA-256 est calculée directement dans le navigateur via la [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) native (`crypto.subtle.digest`), puis convertie au format Solidity `bytes32`.
* **Ancrage on-chain immuable** : Le smart contract stocke l'empreinte, l'adresse du signataire (`owner`), le timestamp de bloc (`block.timestamp`) et le nom original du fichier.
* **Vérification universelle et gratuite** : Tout utilisateur peut vérifier l'intégrité d'un document via un simple appel en lecture (`view`), sans frais de gas et sans obligation de connecter un portefeuille.

---

## 🏗️ Architecture & Stack Technique

```
┌─────────────────────────────────────────────────────────────┐
│                       NAVIGATEUR                            │
│  1. Glisser-déposer du document                             │
│  2. Web Crypto API : crypto.subtle.digest("SHA-256")        │
│  3. Conversion hexadécimale -> bytes32                      │
└──────────────┬──────────────────────────────▲───────────────┘
               │ (Transaction d'écriture)     │ (Appel view gratuit)
               │ register(hash, name)         │ verify(hash)
               ▼                              │
┌─────────────────────────────────────────────┴───────────────┐
│              SMART CONTRACT (DocumentRegistry.sol)          │
│  • mapping(bytes32 => Document)                             │
│  • Struct: { owner, timestamp, name }                       │
│  • Custom Errors & NatSpec Documentation                    │
│  • Événement: DocumentRegistered(hash, owner, timestamp)    │
└─────────────────────────────────────────────────────────────┘
```

* **Smart Contract** : Solidity `^0.8.20`
* **Environnement de développement & Tests** : Hardhat (TypeScript), TypeChain, Chai
* **Frontend** : React 18, Vite, TypeScript, Tailwind CSS, Lucide React
* **Interaction Blockchain** : ethers.js `v6`
* **Portefeuille** : MetaMask (avec écoute dynamique des changements de compte et de réseau)

---

## 📁 Structure du Projet

```text
.
├── contracts/
│   └── DocumentRegistry.sol        # Smart contract Solidity avec Custom Errors & NatSpec
├── test/
│   ├── DocumentRegistry.test.ts    # Tests unitaires complets (Chai / Hardhat)
│   └── e2eScenario.test.ts         # Scénario E2E : enregistrement -> intègre -> modif 1 octet -> altéré
├── scripts/
│   ├── deploy.ts                   # Déploiement + export automatique ABI & adresse vers le frontend
│   └── verifySampleScript.ts       # Script CLI d'analyse d'effet d'avalanche
├── samples/
│   ├── contrat_original.txt        # Fichier d'exemple original
│   └── contrat_modifie_1_octet.txt # Fichier d'exemple altéré d'un seul caractère
├── frontend/                       # Application Web React + Vite + Tailwind
│   ├── src/
│   │   ├── components/             # Navbar, RegisterDocument, VerifyDocument, MyDocuments, etc.
│   │   ├── context/                # WalletContext (gestion MetaMask & réseaux)
│   │   ├── contracts/              # ABI et adresse exportées par Hardhat
│   │   ├── hooks/                  # useDocumentContract (interactions ethers.js v6)
│   │   ├── utils/                  # crypto.ts (Web Crypto SHA-256, formatters)
│   │   └── types/                  # Définitions TypeScript
│   ├── tailwind.config.js
│   └── vite.config.ts
├── hardhat.config.ts               # Configuration Hardhat (localhost & Sepolia)
├── package.json                    # Dépendances root & scripts
└── README.md                       # Guide complet
```

---

## 🚀 Guide d'Installation et Lancement Pas à Pas

### 1. Prérequis
* [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
* Extension de navigateur [MetaMask](https://metamask.io/)

### 2. Cloner et Installer les Dépendances

Dans le dossier racine du projet :
```bash
# Installation des dépendances Hardhat (racine)
npm install

# Installation des dépendances du frontend
cd frontend
npm install
cd ..
```

---

### 3. Exécuter les Tests Unitaires & E2E

Le projet inclut une suite de tests complète garantissant le bon fonctionnement de chaque méthode du smart contract :
```bash
npx hardhat test
```

*Sortie attendue :*
```text
  DocumentRegistry
    Enregistrement (register)
      ✔ doit enregistrer un document avec succès et émettre l'événement DocumentRegistered
      ✔ doit refuser un hash déjà enregistré (doublon) avec l'erreur personnalisée DocumentAlreadyExists
      ✔ doit refuser un hash vide (bytes32(0)) avec l'erreur InvalidHash
      ✔ doit refuser un nom de fichier vide avec l'erreur EmptyName
    Vérification (verify)
      ✔ doit vérifier avec succès un document enregistré (exists = true, bon owner, timestamp > 0, nom correct)
      ✔ doit retourner exists = false pour un hash inconnu ou jamais enregistré
      ✔ doit détecter une altération (un hash modifié d'un octet renvoie false)
    Historique par propriétaire (getDocumentsByOwner & helpers)
      ✔ doit retourner la liste exacte des hashes enregistrés par un utilisateur
      ✔ doit rejeter l'adresse 0 avec ZeroAddress
      ✔ doit retourner les détails complets (hashes et documents) via getDocumentDetailsByOwner

  Scénario Complet E2E : Intégrité et Détection d'altération
    ✔ Scénario : Enregistrer un PDF -> Vérifier (intègre) -> Modifier d'un octet -> Revérifier (altéré)

  11 passing
```

---

### 4. Lancement d'un Nœud Local Hardhat & Déploiement

#### Étape A : Démarrer le nœud local Hardhat
Dans un premier terminal :
```bash
npx hardhat node
```
*Le nœud démarrera sur `http://127.0.0.1:8545` (Chain ID : `31337`) et affichera 20 comptes de test crédités de 10 000 ETH chacun.*

#### Étape B : Déployer le contrat sur le nœud local
Dans un second terminal :
```bash
npx hardhat run scripts/deploy.ts --network localhost
```
*Le script déploie le contrat et génère automatiquement l'adresse et l'ABI dans `frontend/src/contracts/`.*

#### Étape C : Lancer l'Application Frontend
```bash
npm run frontend:dev
```
L'application est accessible sur : **`http://localhost:5173`**

---

### 5. Configuration de MetaMask pour le Nœud Local

1. Ouvrez MetaMask > cliquez sur le sélecteur de réseau en haut à gauche > **Ajouter un réseau manuellement** :
   * **Nom du réseau** : `Hardhat Localhost`
   * **URL de RPC** : `http://127.0.0.1:8545`
   * **ID de chaîne** : `31337`
   * **Symbole de la devise** : `ETH`
2. **Importer un compte de test** :
   * Cliquez sur le sélecteur de compte dans MetaMask > **Ajouter un compte ou du matériel** > **Importer un compte**.
   * Copiez la clé privée du premier compte fourni par `npx hardhat node` (par exemple : `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
   * Vous disposez immédiatement de 10 000 ETH de test pour interagir.

---

### 6. Déploiement sur le Testnet Sepolia (Optionnel)

1. Dupliquez `.env.example` en `.env` :
```bash
cp .env.example .env
```
2. Renseignez votre `SEPOLIA_RPC_URL` (Alchemy / Infura) et votre `PRIVATE_KEY` (compte approvisionné en Sepolia ETH).
3. Déployez avec la commande :
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

---

## 🧪 Scénario de Test Pratique (Démonstration de l'Intégrité)

Deux fichiers de test sont directement inclus dans le répertoire `/samples` :

1. **Enregistrement du document original** :
   * Rendez-vous sur `http://localhost:5173` dans l'onglet **"Enregistrer un document"**.
   * Glissez-déposez le fichier `samples/contrat_original.txt`.
   * L'application calcule son hash SHA-256 localement (`0xe30e...9d6e`).
   * Cliquez sur **« Enregistrer sur la blockchain »** et validez la transaction MetaMask.
   * La notification de succès s'affiche avec le numéro de bloc et le hash de transaction.

2. **Vérification du document d'origine (Intégrité confirmée)** :
   * Basculez sur l'onglet **"Vérifier un document"**.
   * Glissez-déposez à nouveau `samples/contrat_original.txt`.
   * L'écran affiche instantanément le bandeau **VERT « Document intègre »**, avec le nom officiel, la date exacte d'horodatage et l'adresse de l'émetteur.

3. **Vérification d'un fichier altéré d'un seul caractère (Fraude détectée)** :
   * Glissez-déposez le fichier `samples/contrat_modifie_1_octet.txt` (où `50000 EUR` a été changé en `50001 EUR`).
   * Bien qu'un seul chiffre diffère, l'effet d'avalanche produit un hash totalement distinct (`0x96c0...378d`).
   * L'écran affiche instantanément le bandeau **ROUGE « Document modifié ou jamais enregistré »**.

---

## 🔬 Détails du Smart Contract (`DocumentRegistry.sol`)

* **Optimisation Gas** :
  * Utilisation de `bytes32` natif pour le stockage de l'empreinte au lieu de chaînes de caractères dynamiques.
  * Utilisation de **Custom Errors** (`error DocumentAlreadyExists(bytes32 hash);`, `error InvalidHash();`, `error EmptyName();`, `error ZeroAddress();`) au lieu de `require` avec chaînes littérales, réduisant drastiquement la taille du bytecode et le coût en gas lors des reverts.
* **Sécurité & Données privées** :
  * Aucune donnée confidentielle n'est stockée on-chain.
  * Vérification stricte des entrées (rejet des hashes nuls `bytes32(0)` et des noms vides).
* **Documentation NatSpec** complète sur toutes les structures, fonctions et événements.

---

## 🔮 Limites et Améliorations Possibles

Bien que l'ancrage de hash SHA-256 fournisse une preuve mathématique d'intégrité et d'antériorité solide, un système de production d'entreprise peut être enrichi selon les axes suivants :

1. **Stockage Décentralisé du Document (IPFS / Arweave / Filecoin)** :
   * *Principe* : Associer au hash SHA-256 un identifiant de contenu IPFS (**CID**) pour permettre le téléchargement décentralisé et chiffré du document physique si les parties le souhaitent, sans passer par un serveur central.

2. **Signature Numérique Multi-parties (ECDSA / EIP-712)** :
   * *Principe* : Permettre à plusieurs parties prenantes de co-signer cryptographiquement un même document (comme un contrat de vente). L'intégration du standard **EIP-712** permet d'afficher lisiblement les métadonnées du document dans MetaMask avant signature.

3. **Arbres de Merkle (Merkle Trees) & Batching** :
   * *Principe* : Dans un cadre industriel (milliers de factures ou de logs par minute), ancrer chaque hash individuellement entraînerait des coûts de transaction cumulés élevés. En regroupant $N$ documents dans un arbre de Merkle, seule la **racine de Merkle** (32 octets) est écrite on-chain. Tout document individuel peut ensuite être prouvé par une simple preuve de Merkle (*Merkle Proof*) en temps $O(\log N)$.

4. **Contrôle d'Accès & Cycle de Vie (RBAC & Révocation)** :
   * *Principe* : Ajouter des rôles certifiés (ex: autorité de certification, notaires) via `AccessControl` d'OpenZeppelin, et permettre la révocation motivée ou l'expiration d'un document caduc avec historique d'auditabilité.

5. **Preuves à Divulgation Nulle de Connaissance (Zero-Knowledge / zk-SNARKs)** :
   * *Principe* : Permettre à un utilisateur de prouver qu'il possède un document valide satisfaisant certains critères (par exemple : majorité civile, conformité financière) sans révéler ni le document, ni son empreinte publique.

---

## 📄 Licence
Ce projet est distribué sous licence MIT.
