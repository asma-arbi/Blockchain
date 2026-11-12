import { ethers, network } from "hardhat";

async function main() {
  // Récupérer l'adresse et le montant passés en argument ou variables d'environnement
  const args = process.argv.slice(2);
  const targetAddress = args[0] || process.env.TARGET_ADDRESS;
  const amountStr = args[1] || process.env.AMOUNT_ETH || "10000.0";

  if (!targetAddress || !ethers.isAddress(targetAddress)) {
    console.log("==================================================");
    console.error("❌ Adresse invalide ou manquante.");
    console.log("Usage : npx hardhat run scripts/fund.ts --network localhost <adresse_0x> [montant_ETH]");
    console.log("Exemple : npx hardhat run scripts/fund.ts --network localhost 0xf09A82ACe30d2Af3846758acb788340E9A421Aa8 10000");
    console.log("==================================================");
    process.exit(1);
  }

  console.log("==================================================");
  console.log(`💰 Approvisionnement de l'adresse : ${targetAddress}`);
  console.log(`🌐 Réseau : ${network.name}`);
  console.log(`💎 Montant demandé : ${amountStr} ETH`);

  const amountWei = ethers.parseEther(amountStr);
  const hexBalance = "0x" + amountWei.toString(16);

  try {
    // Méthode Hardhat instantanée : hardhat_setBalance
    await ethers.provider.send("hardhat_setBalance", [targetAddress, hexBalance]);
    console.log(`⚡ Solde ajusté via hardhat_setBalance`);
  } catch {
    // Repli : transfert standard depuis le signer #0
    const [funder] = await ethers.getSigners();
    console.log(`👤 Compte source : ${funder.address}`);
    const tx = await funder.sendTransaction({
      to: targetAddress,
      value: amountWei,
    });
    await tx.wait();
    console.log(`✅ Transaction minée : ${tx.hash}`);
  }

  const newBalance = await ethers.provider.getBalance(targetAddress);
  console.log(`💳 Nouveau solde de ${targetAddress} : ${ethers.formatEther(newBalance)} ETH`);
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Erreur lors de l'approvisionnement :", error);
  process.exitCode = 1;
});
