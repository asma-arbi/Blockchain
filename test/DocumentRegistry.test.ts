import { expect } from "chai";
import { ethers } from "hardhat";
import { DocumentRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DocumentRegistry", function () {
  let registry: DocumentRegistry;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  // Calcul d'un hash SHA-256 standard pour les tests
  const sampleData = "Contrat de partenariat certifie 2026";
  const sampleHash = ethers.sha256(ethers.toUtf8Bytes(sampleData));
  const sampleFileName = "contrat_partenariat.pdf";

  const sampleData2 = "Deuxieme document juridique";
  const sampleHash2 = ethers.sha256(ethers.toUtf8Bytes(sampleData2));
  const sampleFileName2 = "annexe_technique.pdf";

  const nonExistentHash = ethers.sha256(ethers.toUtf8Bytes("Fichier introuvable"));

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const DocumentRegistryFactory = await ethers.getContractFactory("DocumentRegistry");
    registry = await DocumentRegistryFactory.deploy();
    await registry.waitForDeployment();
  });

  describe("Enregistrement (register)", function () {
    it("doit enregistrer un document avec succès et émettre l'événement DocumentRegistered", async function () {
      const tx = await registry.connect(alice).register(sampleHash, sampleFileName);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(registry, "DocumentRegistered")
        .withArgs(sampleHash, alice.address, block!.timestamp);
    });

    it("doit refuser un hash déjà enregistré (doublon) avec l'erreur personnalisée DocumentAlreadyExists", async function () {
      await registry.connect(alice).register(sampleHash, sampleFileName);

      // Tentative de ré-enregistrement par le même utilisateur
      await expect(
        registry.connect(alice).register(sampleHash, "autre_nom.pdf")
      ).to.be.revertedWithCustomError(registry, "DocumentAlreadyExists")
        .withArgs(sampleHash);

      // Tentative de ré-enregistrement par un tiers
      await expect(
        registry.connect(bob).register(sampleHash, "copie_bob.pdf")
      ).to.be.revertedWithCustomError(registry, "DocumentAlreadyExists")
        .withArgs(sampleHash);
    });

    it("doit refuser un hash vide (bytes32(0)) avec l'erreur InvalidHash", async function () {
      const emptyHash = ethers.ZeroHash;
      await expect(
        registry.connect(alice).register(emptyHash, sampleFileName)
      ).to.be.revertedWithCustomError(registry, "InvalidHash");
    });

    it("doit refuser un nom de fichier vide avec l'erreur EmptyName", async function () {
      await expect(
        registry.connect(alice).register(sampleHash, "")
      ).to.be.revertedWithCustomError(registry, "EmptyName");
    });
  });

  describe("Vérification (verify)", function () {
    it("doit vérifier avec succès un document enregistré (exists = true, bon owner, timestamp > 0, nom correct)", async function () {
      const beforeTime = await time.latest();
      await registry.connect(alice).register(sampleHash, sampleFileName);
      const afterTime = await time.latest();

      const [exists, docOwner, docTimestamp, docName] = await registry.verify(sampleHash);

      expect(exists).to.be.true;
      expect(docOwner).to.equal(alice.address);
      expect(docTimestamp).to.be.greaterThanOrEqual(beforeTime);
      expect(docTimestamp).to.be.lessThanOrEqual(afterTime);
      expect(docName).to.equal(sampleFileName);
    });

    it("doit retourner exists = false pour un hash inconnu ou jamais enregistré", async function () {
      const [exists, docOwner, docTimestamp, docName] = await registry.verify(nonExistentHash);

      expect(exists).to.be.false;
      expect(docOwner).to.equal(ethers.ZeroAddress);
      expect(docTimestamp).to.equal(0);
      expect(docName).to.equal("");
    });

    it("doit détecter une altération (un hash modifié d'un octet renvoie false)", async function () {
      await registry.connect(alice).register(sampleHash, sampleFileName);

      // Altération d'un seul caractère dans les données source
      const alteredData = "Contrat de partenariat certifie 2027";
      const alteredHash = ethers.sha256(ethers.toUtf8Bytes(alteredData));

      const [existsOriginal] = await registry.verify(sampleHash);
      const [existsAltered] = await registry.verify(alteredHash);

      expect(existsOriginal).to.be.true;
      expect(existsAltered).to.be.false;
    });
  });

  describe("Historique par propriétaire (getDocumentsByOwner & helpers)", function () {
    it("doit retourner la liste exacte des hashes enregistrés par un utilisateur", async function () {
      // Au départ, la liste est vide
      let aliceDocs = await registry.getDocumentsByOwner(alice.address);
      expect(aliceDocs.length).to.equal(0);

      // Enregistrement de deux documents par Alice
      await registry.connect(alice).register(sampleHash, sampleFileName);
      await registry.connect(alice).register(sampleHash2, sampleFileName2);

      // Enregistrement d'un document par Bob
      const bobData = "Fichier confidentiel Bob";
      const bobHash = ethers.sha256(ethers.toUtf8Bytes(bobData));
      await registry.connect(bob).register(bobHash, "rapport_bob.pdf");

      aliceDocs = await registry.getDocumentsByOwner(alice.address);
      expect(aliceDocs.length).to.equal(2);
      expect(aliceDocs[0]).to.equal(sampleHash);
      expect(aliceDocs[1]).to.equal(sampleHash2);

      const bobDocs = await registry.getDocumentsByOwner(bob.address);
      expect(bobDocs.length).to.equal(1);
      expect(bobDocs[0]).to.equal(bobHash);

      expect(await registry.getDocumentCountByOwner(alice.address)).to.equal(2n);
      expect(await registry.getDocumentCountByOwner(bob.address)).to.equal(1n);
    });

    it("doit rejeter l'adresse 0 avec ZeroAddress", async function () {
      await expect(
        registry.getDocumentsByOwner(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");

      await expect(
        registry.getDocumentCountByOwner(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");

      await expect(
        registry.getDocumentDetailsByOwner(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("doit retourner les détails complets (hashes et documents) via getDocumentDetailsByOwner", async function () {
      await registry.connect(alice).register(sampleHash, sampleFileName);
      await registry.connect(alice).register(sampleHash2, sampleFileName2);

      const [hashes, docs] = await registry.getDocumentDetailsByOwner(alice.address);

      expect(hashes.length).to.equal(2);
      expect(docs.length).to.equal(2);

      expect(hashes[0]).to.equal(sampleHash);
      expect(docs[0].name).to.equal(sampleFileName);
      expect(docs[0].owner).to.equal(alice.address);
      expect(docs[0].timestamp).to.be.greaterThan(0n);

      expect(hashes[1]).to.equal(sampleHash2);
      expect(docs[1].name).to.equal(sampleFileName2);
      expect(docs[1].owner).to.equal(alice.address);
    });
  });
});
