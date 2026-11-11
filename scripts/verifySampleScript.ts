import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

async function main() {
  const originalPath = path.join(__dirname, "../samples/contrat_original.txt");
  const modifiedPath = path.join(__dirname, "../samples/contrat_modifie_1_octet.txt");

  const origBuffer = fs.readFileSync(originalPath);
  const modBuffer = fs.readFileSync(modifiedPath);

  const origHash = "0x" + crypto.createHash("sha256").update(origBuffer).digest("hex");
  const modHash = "0x" + crypto.createHash("sha256").update(modBuffer).digest("hex");

  console.log("==================================================");
  console.log("📄 Analyse des fichiers d'exemple de test :");
  console.log("--------------------------------------------------");
  console.log(`Original: "${originalPath}"`);
  console.log(`  Taille: ${origBuffer.length} octets`);
  console.log(`  SHA-256: ${origHash}`);
  console.log("--------------------------------------------------");
  console.log(`Modifié: "${modifiedPath}"`);
  console.log(`  Taille: ${modBuffer.length} octets`);
  console.log(`  SHA-256: ${modHash}`);
  console.log("--------------------------------------------------");
  console.log(`Différence de hash détectée ? ${origHash !== modHash ? "OUI (Effet avalanche vérifié)" : "NON"}`);
  console.log("==================================================");
}

main().catch(console.error);
