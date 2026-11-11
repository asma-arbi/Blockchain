import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==================================================");
  console.log("🚀 Déploiement du contrat DocumentRegistry...");
  console.log(`🌐 Réseau cible : ${network.name} (Chain ID: ${network.config.chainId ?? "inconnu"})`);

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Déployeur : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Solde : ${ethers.formatEther(balance)} ETH`);

  // Déploiement
  const DocumentRegistryFactory = await ethers.getContractFactory("DocumentRegistry");
  const registry = await DocumentRegistryFactory.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`✅ DocumentRegistry déployé avec succès à l'adresse : ${contractAddress}`);

  // Récupération de l'ABI compilée
  const artifactPath = path.join(__dirname, "../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artefact introuvable à : ${artifactPath}`);
  }
  const artifactContent = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifactContent.abi;

  // Export pour le frontend
  const frontendContractsDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId ?? 31337,
    address: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: abi,
  };

  const jsonOutputPath = path.join(frontendContractsDir, "DocumentRegistry.json");
  fs.writeFileSync(jsonOutputPath, JSON.stringify(deploymentData, null, 2), "utf8");
  console.log(`📄 Données de déploiement enregistrées dans : ${jsonOutputPath}`);

  // Fichier helper TypeScript pour le frontend
  const tsContent = `// Fichier généré automatiquement par scripts/deploy.ts
export const CONTRACT_ADDRESS = "${contractAddress}" as const;
export const CONTRACT_NETWORK = "${network.name}" as const;
export const CONTRACT_CHAIN_ID = ${network.config.chainId ?? 31337} as const;
export const CONTRACT_ABI = ${JSON.stringify(abi, null, 2)} as const;
`;

  const tsOutputPath = path.join(frontendContractsDir, "contractConfig.ts");
  fs.writeFileSync(tsOutputPath, tsContent, "utf8");
  console.log(`📄 Configuration TypeScript enregistrée dans : ${tsOutputPath}`);

  console.log("==================================================");
  console.log("🎉 Déploiement et export frontend terminés !");
}

main().catch((error) => {
  console.error("❌ Erreur lors du déploiement :", error);
  process.exitCode = 1;
});
