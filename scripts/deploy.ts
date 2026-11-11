import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==================================================");
  console.log("🚀 Déploiement des Smart Contracts...");
  console.log(`🌐 Réseau cible : ${network.name} (Chain ID: ${network.config.chainId ?? "inconnu"})`);

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Déployeur : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Solde : ${ethers.formatEther(balance)} ETH`);

  // 1. Déploiement de DocumentRegistry
  console.log("\n1️⃣ Déploiement de DocumentRegistry...");
  const DocumentRegistryFactory = await ethers.getContractFactory("DocumentRegistry");
  const registry = await DocumentRegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`✅ DocumentRegistry déployé à : ${registryAddress}`);

  // 2. Déploiement de CertificateAuthority (RBAC & Révocation)
  console.log("\n2️⃣ Déploiement de CertificateAuthority (Gouvernance & Rôles)...");
  const AuthorityFactory = await ethers.getContractFactory("CertificateAuthority");
  const authority = await AuthorityFactory.deploy(deployer.address);
  await authority.waitForDeployment();
  const authorityAddress = await authority.getAddress();
  console.log(`✅ CertificateAuthority déployé à : ${authorityAddress}`);

  // Récupération des ABIs compilées
  const registryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json"),
      "utf8"
    )
  );

  const authorityArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/CertificateAuthority.sol/CertificateAuthority.json"),
      "utf8"
    )
  );

  // Export pour le frontend
  const frontendContractsDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  // Sauvegarde des JSON d'artefacts
  fs.writeFileSync(
    path.join(frontendContractsDir, "DocumentRegistry.json"),
    JSON.stringify(
      {
        address: registryAddress,
        network: network.name,
        chainId: network.config.chainId ?? 31337,
        abi: registryArtifact.abi,
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(frontendContractsDir, "CertificateAuthority.json"),
    JSON.stringify(
      {
        address: authorityAddress,
        network: network.name,
        chainId: network.config.chainId ?? 31337,
        abi: authorityArtifact.abi,
      },
      null,
      2
    )
  );

  // Configuration TypeScript pour le frontend (rétrocompatible avec CONTRACT_ADDRESS)
  const tsContent = `// Fichier généré automatiquement par scripts/deploy.ts
export const CONTRACT_ADDRESS = "${registryAddress}" as const;
export const CONTRACT_ABI = ${JSON.stringify(registryArtifact.abi, null, 2)} as const;

export const DOCUMENT_REGISTRY_ADDRESS = "${registryAddress}" as const;
export const DOCUMENT_REGISTRY_ABI = ${JSON.stringify(registryArtifact.abi, null, 2)} as const;

export const AUTHORITY_ADDRESS = "${authorityAddress}" as const;
export const AUTHORITY_ABI = ${JSON.stringify(authorityArtifact.abi, null, 2)} as const;

export const CONTRACT_NETWORK = "${network.name}" as const;
export const CONTRACT_CHAIN_ID = ${network.config.chainId ?? 31337} as const;
`;

  fs.writeFileSync(path.join(frontendContractsDir, "contractConfig.ts"), tsContent, "utf8");
  console.log(`📄 Configuration TypeScript mise à jour dans : frontend/src/contracts/contractConfig.ts`);

  console.log("==================================================");
  console.log("🎉 Les 2 contrats sont déployés et synchronisés avec le frontend !");
}

main().catch((error) => {
  console.error("❌ Erreur lors du déploiement :", error);
  process.exitCode = 1;
});
