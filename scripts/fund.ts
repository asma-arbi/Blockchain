import { ethers, network } from "hardhat";

async function main() {
  // Récupérer l'adresse passée en argument ou variable d'environnement
  const args = process.argv.slice(2);
  const targetAddress = args[0] || process.env.TARGET_ADDRESS;

  if (!targetAddress || !ethers.isAddress(targetAddress)) {
    console.log("==================================================");
    console.error("❌ Adresse invalide ou manquante.");
    console.log("Usage : npx hardhat run scripts/fund.ts --network localhost <adresse_0x>");
    console.log("Exemple : npx hardhat run scripts/fund.ts --network localhost 0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    console.log("==================================================");
    process.exit(1);
  }

  console.log("==================================================");
  console.log(`💰 Approvisionnement de l'adresse : ${targetAddress}`);
  console.log(`🌐 Réseau : ${network.name}`);

  const [funder] = await ethers.getSigners();
  console.log(`👤 Compte source : ${funder.address}`);

  // Envoi de 100 ETH
  const amount = ethers.parseEther("100.0");
  const tx = await funder.sendTransaction({
    to: targetAddress,
    value: amount,
  });
  await tx.wait();

  const newBalance = await ethers.provider.getBalance(targetAddress);
  console.log(`✅ 100 ETH transférés avec succès ! (Tx: ${tx.hash})`);
  console.log(`💳 Nouveau solde de ${targetAddress} : ${ethers.formatEther(newBalance)} ETH`);
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Erreur lors de l'approvisionnement :", error);
  process.exitCode = 1;
});
