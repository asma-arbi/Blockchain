import { ethers } from "hardhat";

async function main() {
  const authorityAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const userAddress = "0xf09A82ACe30d2Af3846758acb788340E9A421Aa8";

  console.log("==================================================");
  console.log("🎓 Accréditation de l'utilisateur :", userAddress);

  const [deployer] = await ethers.getSigners();
  const authority = await ethers.getContractAt("CertificateAuthority", authorityAddress, deployer);

  // 1. Accréditation comme institution émettrice
  const tx1 = await authority.accreditIssuer(userAddress, "ESPRIT - Ingénierie & Technologies");
  await tx1.wait();
  console.log("✅ Institution accréditée avec succès ! (Tx:", tx1.hash, ")");

  // 2. Attribution du rôle DEFAULT_ADMIN_ROLE et REVOKER_ROLE
  const adminRole = await authority.DEFAULT_ADMIN_ROLE();
  const revokerRole = await authority.REVOKER_ROLE();

  const tx2 = await authority.grantRole(adminRole, userAddress);
  await tx2.wait();
  const tx3 = await authority.grantRole(revokerRole, userAddress);
  await tx3.wait();
  console.log("✅ Rôles ADMIN et REVOKER octroyés avec succès à :", userAddress);

  const isIssuer = await authority.isAuthorizedIssuer(userAddress);
  console.log("🔍 isAuthorizedIssuer :", isIssuer);
  console.log("==================================================");
}

main().catch(console.error);
