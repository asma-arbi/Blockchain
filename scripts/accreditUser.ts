import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const authorityArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../frontend/src/contracts/CertificateAuthority.json"),
      "utf8"
    )
  );
  const authorityAddress = authorityArtifact.address;
  const userAddress = process.env.USER_ADDRESS || "0xf09A82ACe30d2Af3846758acb788340E9A421Aa8";

  console.log("==================================================");
  console.log("🏛️ Contrat CertificateAuthority :", authorityAddress);
  console.log("🎓 Accréditation de l'utilisateur :", userAddress);

  const [deployer] = await ethers.getSigners();
  const authority = await ethers.getContractAt("CertificateAuthority", authorityAddress, deployer);

  // Vérifier si déjà accrédité
  const isAlreadyIssuer = await authority.isAuthorizedIssuer(userAddress);
  if (!isAlreadyIssuer) {
    // 1. Accréditation comme institution émettrice
    const tx1 = await authority.accreditIssuer(userAddress, "ESPRIT - Ingénierie & Technologies");
    await tx1.wait();
    console.log("✅ Institution accréditée avec succès ! (Tx:", tx1.hash, ")");
  } else {
    console.log("ℹ️ L'utilisateur est déjà accrédité.");
  }

  // 2. Attribution du rôle DEFAULT_ADMIN_ROLE et REVOKER_ROLE
  const adminRole = await authority.DEFAULT_ADMIN_ROLE();
  const revokerRole = await authority.REVOKER_ROLE();

  if (!(await authority.hasRole(adminRole, userAddress))) {
    const tx2 = await authority.grantRole(adminRole, userAddress);
    await tx2.wait();
    console.log("✅ Rôle ADMIN octroyé avec succès à :", userAddress);
  }
  if (!(await authority.hasRole(revokerRole, userAddress))) {
    const tx3 = await authority.grantRole(revokerRole, userAddress);
    await tx3.wait();
    console.log("✅ Rôle REVOKER octroyé avec succès à :", userAddress);
  }

  const isIssuer = await authority.isAuthorizedIssuer(userAddress);
  console.log("🔍 isAuthorizedIssuer :", isIssuer);
  console.log("==================================================");
}

main().catch(console.error);
