import { expect } from "chai";
import { ethers } from "hardhat";
import * as crypto from "crypto";

describe("Scénario Complet E2E : Intégrité et Détection d'altération", function () {
  it("Scénario : Enregistrer un PDF -> Vérifier (intègre) -> Modifier d'un octet -> Revérifier (altéré)", async function () {
    console.log("\n--- Début du Scénario Réel ---");

    // 1. Déploiement du contrat
    const [deployer, verifierUser] = await ethers.getSigners();
    const DocumentRegistryFactory = await ethers.getContractFactory("DocumentRegistry");
    const registry = await DocumentRegistryFactory.deploy();
    await registry.waitForDeployment();
    console.log("1. Contrat DocumentRegistry déployé par :", deployer.address);

    // 2. Création d'un document PDF simulé (en mémoire)
    const originalPdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Title (Contrat de Confidentialite 2026) /Author (Entreprise A) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
      "utf-8"
    );

    // 3. Calcul du hash SHA-256 (Web Crypto équivalent)
    const originalHashHex = crypto.createHash("sha256").update(originalPdfBuffer).digest("hex");
    const originalBytes32 = `0x${originalHashHex}`;
    const fileName = "Contrat_Confidentialite_2026.pdf";

    console.log("2. Fichier original créé :");
    console.log("   - Taille :", originalPdfBuffer.length, "octets");
    console.log("   - Empreinte SHA-256 :", originalBytes32);

    // 4. Enregistrement sur la blockchain
    console.log("3. Enregistrement sur la blockchain...");
    const tx = await registry.connect(deployer).register(originalBytes32, fileName);
    const receipt = await tx.wait();
    console.log("   - Transaction minée dans le bloc #", receipt!.blockNumber);

    // 5. Première vérification : le document doit être INTÈGRE
    console.log("4. Vérification du document d'origine par un tiers...");
    const [existsOrig, ownerOrig, timestampOrig, nameOrig] = await registry
      .connect(verifierUser)
      .verify(originalBytes32);

    expect(existsOrig).to.be.true;
    expect(ownerOrig).to.equal(deployer.address);
    expect(timestampOrig).to.be.greaterThan(0);
    expect(nameOrig).to.equal(fileName);
    console.log("   -> SUCCÈS : Document intègre !");
    console.log("   - Émetteur certifié :", ownerOrig);
    console.log("   - Horodatage :", new Date(Number(timestampOrig) * 1000).toISOString());
    console.log("   - Nom officiel :", nameOrig);

    // 6. Modification du fichier d'UN SEUL OCTET
    console.log("\n5. Simulation d'une tentative de fraude / altération :");
    const modifiedPdfBuffer = Buffer.from(originalPdfBuffer);
    // On modifie un seul caractère ('2026' devient '2027')
    const indexToMutate = modifiedPdfBuffer.indexOf(Buffer.from("2026"));
    modifiedPdfBuffer[indexToMutate + 3] = "7".charCodeAt(0);

    const modifiedHashHex = crypto.createHash("sha256").update(modifiedPdfBuffer).digest("hex");
    const modifiedBytes32 = `0x${modifiedHashHex}`;

    console.log("   - Modification effectuée : 1 seul caractère changé ('6' -> '7')");
    console.log("   - Nouvelle empreinte SHA-256 :", modifiedBytes32);
    console.log("   - Les hashs sont-ils différents ?", originalBytes32 !== modifiedBytes32);

    // 7. Deuxième vérification avec le fichier altéré
    console.log("6. Vérification du fichier altéré sur la blockchain...");
    const [existsMod, ownerMod, timestampMod, nameMod] = await registry
      .connect(verifierUser)
      .verify(modifiedBytes32);

    expect(existsMod).to.be.false;
    expect(ownerMod).to.equal(ethers.ZeroAddress);
    expect(timestampMod).to.equal(0);
    expect(nameMod).to.equal("");
    console.log("   -> SUCCÈS : Altération détectée ! Le document est refusé (non intègre).");

    // 8. Vérification que l'historique du propriétaire est préservé
    const ownerHashes = await registry.getDocumentsByOwner(deployer.address);
    expect(ownerHashes.length).to.equal(1);
    expect(ownerHashes[0]).to.equal(originalBytes32);
    console.log("\n7. Historique du propriétaire vérifié : 1 document certifié.");
    console.log("--- Fin du Scénario Réel avec Succès ---\n");
  });
});
