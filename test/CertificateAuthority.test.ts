import { expect } from "chai";
import { ethers } from "hardhat";
import { CertificateAuthority } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CertificateAuthority & RBAC Security Tests", function () {
  let authority: CertificateAuthority;
  let admin: HardhatEthersSigner;
  let university: HardhatEthersSigner;
  let notary: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;

  const sampleDocHash = ethers.sha256(ethers.toUtf8Bytes("Diplome Master Blockchain 2026"));
  const sampleDocHash2 = ethers.sha256(ethers.toUtf8Bytes("Acte Notarie Vente 2026"));

  beforeEach(async function () {
    [admin, university, notary, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateAuthority");
    authority = await Factory.deploy(admin.address);
    await authority.waitForDeployment();
  });

  describe("Initialisation & Rôles d'administration", function () {
    it("doit attribuer les rôles DEFAULT_ADMIN_ROLE, ISSUER_ROLE et REVOKER_ROLE au déployeur", async function () {
      const adminRole = await authority.DEFAULT_ADMIN_ROLE();
      const issuerRole = await authority.ISSUER_ROLE();
      const revokerRole = await authority.REVOKER_ROLE();

      expect(await authority.hasRole(adminRole, admin.address)).to.be.true;
      expect(await authority.hasRole(issuerRole, admin.address)).to.be.true;
      expect(await authority.hasRole(revokerRole, admin.address)).to.be.true;
      expect(await authority.isAuthorizedIssuer(admin.address)).to.be.true;
    });

    it("un compte tiers ne doit posséder aucun rôle par défaut", async function () {
      const issuerRole = await authority.ISSUER_ROLE();
      expect(await authority.hasRole(issuerRole, attacker.address)).to.be.false;
      expect(await authority.isAuthorizedIssuer(attacker.address)).to.be.false;
    });
  });

  describe("Accréditation des Émetteurs (Gouvernance)", function () {
    it("l'admin peut accréditer une institution (ex: Université)", async function () {
      await expect(
        authority.connect(admin).accreditIssuer(university.address, "Universite Paris-Saclay")
      )
        .to.emit(authority, "IssuerAccredited")
        .withArgs(university.address, "Universite Paris-Saclay", (val: any) => val > 0);

      expect(await authority.isAuthorizedIssuer(university.address)).to.be.true;

      const issuerData = await authority.issuers(university.address);
      expect(issuerData.organization).to.equal("Universite Paris-Saclay");
      expect(issuerData.isActive).to.be.true;
    });

    it("[TEST DE SÉCURITÉ] un attaquant ne peut pas s'auto-accréditer ou accréditer un tiers", async function () {
      const adminRole = await authority.DEFAULT_ADMIN_ROLE();
      await expect(
        authority.connect(attacker).accreditIssuer(attacker.address, "Faux Organisme")
      ).to.be.revertedWithCustomError(authority, "AccessControlUnauthorizedAccount")
        .withArgs(attacker.address, adminRole);
    });

    it("l'admin peut désactiver une institution en cas de compromission", async function () {
      await authority.connect(admin).accreditIssuer(notary.address, "Office Notarial 75");
      expect(await authority.isAuthorizedIssuer(notary.address)).to.be.true;

      await authority.connect(admin).deactivateIssuer(notary.address);
      expect(await authority.isAuthorizedIssuer(notary.address)).to.be.false;

      // L'institution désactivée ne peut plus émettre de certificats
      await expect(
        authority.connect(notary).issueCertificate(sampleDocHash)
      ).to.be.revertedWithCustomError(authority, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Émission de Certificats Officiels (Logique Métier)", function () {
    beforeEach(async function () {
      await authority.connect(admin).accreditIssuer(university.address, "Universite Paris-Saclay");
    });

    it("une institution accréditée peut certifier un document", async function () {
      const tx = await authority.connect(university).issueCertificate(sampleDocHash);
      await expect(tx)
        .to.emit(authority, "CertificateIssued")
        .withArgs(sampleDocHash, university.address, "Universite Paris-Saclay", (val: any) => val > 0);

      const [exists, status, issuer, org] = await authority.verifyCertificate(sampleDocHash);
      expect(exists).to.be.true;
      expect(status).to.equal(1); // DocumentStatus.ACTIVE
      expect(issuer).to.equal(university.address);
      expect(org).to.equal("Universite Paris-Saclay");
    });

    it("[TEST DE VULNÉRABILITÉ] un pirate sans rôle ISSUER_ROLE ne peut PAS certifier de document", async function () {
      const issuerRole = await authority.ISSUER_ROLE();
      await expect(
        authority.connect(attacker).issueCertificate(sampleDocHash)
      ).to.be.revertedWithCustomError(authority, "AccessControlUnauthorizedAccount")
        .withArgs(attacker.address, issuerRole);
    });

    it("doit refuser un certificat en double (anti-doublon)", async function () {
      await authority.connect(university).issueCertificate(sampleDocHash);
      await expect(
        authority.connect(university).issueCertificate(sampleDocHash)
      ).to.be.revertedWithCustomError(authority, "CertificateAlreadyExists")
        .withArgs(sampleDocHash);
    });

    it("doit refuser une empreinte nulle (bytes32(0))", async function () {
      await expect(
        authority.connect(university).issueCertificate(ethers.ZeroHash)
      ).to.be.revertedWithCustomError(authority, "InvalidHash");
    });
  });

  describe("Cycle de Vie & Révocation Motivée (Sécurité Juridique)", function () {
    beforeEach(async function () {
      await authority.connect(admin).accreditIssuer(university.address, "Universite Paris-Saclay");
      await authority.connect(university).issueCertificate(sampleDocHash);
    });

    it("l'institution émettrice ou l'admin peut révoquer un document avec motif officiel", async function () {
      const reason = "Diplome annule suite a une fraude constatee au jury";
      const tx = await authority.connect(university).revokeCertificate(sampleDocHash, reason);

      await expect(tx)
        .to.emit(authority, "CertificateRevoked")
        .withArgs(sampleDocHash, university.address, reason, (val: any) => val > 0);

      const [exists, status, issuer, org, issuedAt, revReason, revokedAt] =
        await authority.verifyCertificate(sampleDocHash);

      expect(exists).to.be.true;
      expect(status).to.equal(2); // DocumentStatus.REVOKED
      expect(org).to.equal("Universite Paris-Saclay");
      expect(revReason).to.equal(reason);
      expect(revokedAt).to.be.greaterThan(0);
    });

    it("[TEST DE VULNÉRABILITÉ] un compte non autorisé ne peut pas révoquer un certificat", async function () {
      const revokerRole = await authority.REVOKER_ROLE();
      await expect(
        authority.connect(attacker).revokeCertificate(sampleDocHash, "Tentative malveillante")
      ).to.be.revertedWithCustomError(authority, "AccessControlUnauthorizedAccount")
        .withArgs(attacker.address, revokerRole);
    });

    it("ne peut pas révoquer deux fois le même certificat", async function () {
      await authority.connect(university).revokeCertificate(sampleDocHash, "Premier motif");
      await expect(
        authority.connect(university).revokeCertificate(sampleDocHash, "Second motif")
      ).to.be.revertedWithCustomError(authority, "CertificateAlreadyRevoked")
        .withArgs(sampleDocHash);
    });
  });
});
