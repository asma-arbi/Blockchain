// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CertificateAuthority
 * @author Senior Full-Stack Blockchain Developer
 * @notice Contrat d'Autorité de Certification, de Contrôle d'Accès basé sur les Rôles (RBAC)
 *         et de gestion du cycle de vie des documents (Émission officielle & Révocation).
 * @dev Complète DocumentRegistry en ajoutant une couche d'autorisation institutionnelle
 *      (ex: Universités, Notaires, Ministères) et un mécanisme d'invalidation/révocation motivée.
 */
contract CertificateAuthority is AccessControl {
    // =============================================================
    //                           RÔLES RBAC
    // =============================================================

    /// @notice Rôle autorisant une institution à émettre des certificats officiels.
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    /// @notice Rôle autorisant une entité d'audit ou un admin à révoquer un document falsifié/annulé.
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    // =============================================================
    //                           STRUCTURES
    // =============================================================

    enum DocumentStatus {
        UNKNOWN,   // Non certifié
        ACTIVE,    // Certifié officiel et valide
        REVOKED    // Révoqué (annulé, falsifié ou expiré)
    }

    struct Issuer {
        string organization;
        bool isActive;
        uint256 registeredAt;
    }

    struct Certificate {
        bytes32 documentHash;
        address issuer;
        string organization;
        uint256 issuedAt;
        DocumentStatus status;
        string revocationReason;
        uint256 revokedAt;
        address revokedBy;
    }

    // =============================================================
    //                          CUSTOM ERRORS
    // =============================================================

    error InvalidHash();
    error EmptyOrganization();
    error EmptyReason();
    error IssuerAlreadyRegistered(address issuer);
    error IssuerNotRegistered(address issuer);
    error IssuerDeactivated(address issuer);
    error CertificateAlreadyExists(bytes32 documentHash);
    error CertificateNotFound(bytes32 documentHash);
    error CertificateAlreadyRevoked(bytes32 documentHash);

    // =============================================================
    //                            ÉVÉNEMENTS
    // =============================================================

    event IssuerAccredited(address indexed issuer, string organization, uint256 timestamp);
    event IssuerDeactivatedEvent(address indexed issuer, uint256 timestamp);
    event CertificateIssued(
        bytes32 indexed documentHash,
        address indexed issuer,
        string organization,
        uint256 timestamp
    );
    event CertificateRevoked(
        bytes32 indexed documentHash,
        address indexed revoker,
        string reason,
        uint256 timestamp
    );

    // =============================================================
    //                       STORAGE VARIABLES
    // =============================================================

    /// @dev Informations sur les émetteurs institutionnels accrédités.
    mapping(address => Issuer) public issuers;

    /// @dev Registre des certificats officiels par hash SHA-256 (bytes32).
    mapping(bytes32 => Certificate) private _certificates;

    /// @dev Hashes des certificats émis par chaque institution.
    mapping(address => bytes32[]) private _issuerCertificates;

    // =============================================================
    //                        CONSTRUCTEUR
    // =============================================================

    /**
     * @notice Initialise le contrat en octroyant les rôles d'administration au déployeur.
     * @param admin Adresse du gestionnaire initial du contrat (gouvernance).
     */
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);

        issuers[admin] = Issuer({
            organization: "Autorite Centrale Initiale",
            isActive: true,
            registeredAt: block.timestamp
        });
    }

    // =============================================================
    //                  GESTION DES ÉMETTEURS (ADMIN)
    // =============================================================

    /**
     * @notice Accrédite une institution (ex: Université, Notaire) pour émettre des certificats officiels.
     * @dev Seul le détenteur du rôle DEFAULT_ADMIN_ROLE peut appeler cette fonction.
     * @param issuerAddress Adresse Ethereum de l'institution.
     * @param organization Nom de l'organisme (ex: 'Universite Paris-Saclay').
     */
    function accreditIssuer(address issuerAddress, string calldata organization)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (issuerAddress == address(0)) revert AccessControlBadConfirmation();
        if (bytes(organization).length == 0) revert EmptyOrganization();
        if (issuers[issuerAddress].isActive) revert IssuerAlreadyRegistered(issuerAddress);

        grantRole(ISSUER_ROLE, issuerAddress);
        grantRole(REVOKER_ROLE, issuerAddress); // Les émetteurs peuvent aussi révoquer leurs propres documents

        issuers[issuerAddress] = Issuer({
            organization: organization,
            isActive: true,
            registeredAt: block.timestamp
        });

        emit IssuerAccredited(issuerAddress, organization, block.timestamp);
    }

    /**
     * @notice Désactive une institution (retrait des droits d'émission).
     * @param issuerAddress Adresse de l'institution à révoquer.
     */
    function deactivateIssuer(address issuerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!issuers[issuerAddress].isActive) revert IssuerNotRegistered(issuerAddress);

        issuers[issuerAddress].isActive = false;
        revokeRole(ISSUER_ROLE, issuerAddress);

        emit IssuerDeactivatedEvent(issuerAddress, block.timestamp);
    }

    // =============================================================
    //              ÉMISSION & RÉVOCATION DE DOCUMENTS
    // =============================================================

    /**
     * @notice Émet un certificat officiel pour un document numérique.
     * @dev Requiert le rôle ISSUER_ROLE et un émetteur actif.
     * @param documentHash Empreinte SHA-256 du document (format bytes32).
     */
    function issueCertificate(bytes32 documentHash) external onlyRole(ISSUER_ROLE) {
        if (documentHash == bytes32(0)) revert InvalidHash();
        if (_certificates[documentHash].status != DocumentStatus.UNKNOWN) {
            revert CertificateAlreadyExists(documentHash);
        }

        Issuer storage issuer = issuers[msg.sender];
        if (!issuer.isActive) revert IssuerDeactivated(msg.sender);

        _certificates[documentHash] = Certificate({
            documentHash: documentHash,
            issuer: msg.sender,
            organization: issuer.organization,
            issuedAt: block.timestamp,
            status: DocumentStatus.ACTIVE,
            revocationReason: "",
            revokedAt: 0,
            revokedBy: address(0)
        });

        _issuerCertificates[msg.sender].push(documentHash);

        emit CertificateIssued(documentHash, msg.sender, issuer.organization, block.timestamp);
    }

    /**
     * @notice Révoque un document officiel (ex: diplôme falsifié, contrat résilié, perte de clé).
     * @dev Requiert le rôle REVOKER_ROLE ou l'émetteur d'origine.
     * @param documentHash Empreinte SHA-256 à révoquer.
     * @param reason Motif clair de la révocation (ex: 'Fraude detectee lors de l audit').
     */
    function revokeCertificate(bytes32 documentHash, string calldata reason)
        external
        onlyRole(REVOKER_ROLE)
    {
        if (documentHash == bytes32(0)) revert InvalidHash();
        if (bytes(reason).length == 0) revert EmptyReason();

        Certificate storage cert = _certificates[documentHash];
        if (cert.status == DocumentStatus.UNKNOWN) revert CertificateNotFound(documentHash);
        if (cert.status == DocumentStatus.REVOKED) revert CertificateAlreadyRevoked(documentHash);

        cert.status = DocumentStatus.REVOKED;
        cert.revocationReason = reason;
        cert.revokedAt = block.timestamp;
        cert.revokedBy = msg.sender;

        emit CertificateRevoked(documentHash, msg.sender, reason, block.timestamp);
    }

    // =============================================================
    //                       MÉTHODES DE LECTURE
    // =============================================================

    /**
     * @notice Vérifie l'état complet d'un certificat officiel (actif, révoqué ou inconnu).
     * @param documentHash Empreinte SHA-256 à auditer.
     * @return exists Vrai si le certificat existe.
     * @return status Statut actuel (UNKNOWN, ACTIVE ou REVOKED).
     * @return issuer Adresse de l'organisme émetteur.
     * @return organization Nom de l'organisme accrédité.
     * @return issuedAt Horodatage Unix d'émission.
     * @return revocationReason Motif de révocation (si révoqué).
     * @return revokedAt Horodatage Unix de révocation (si révoqué).
     */
    function verifyCertificate(bytes32 documentHash)
        external
        view
        returns (
            bool exists,
            DocumentStatus status,
            address issuer,
            string memory organization,
            uint256 issuedAt,
            string memory revocationReason,
            uint256 revokedAt
        )
    {
        Certificate storage cert = _certificates[documentHash];
        if (cert.status == DocumentStatus.UNKNOWN) {
            return (false, DocumentStatus.UNKNOWN, address(0), "", 0, "", 0);
        }

        return (
            true,
            cert.status,
            cert.issuer,
            cert.organization,
            cert.issuedAt,
            cert.revocationReason,
            cert.revokedAt
        );
    }

    /**
     * @notice Vérifie si une adresse est un émetteur actif accrédité.
     */
    function isAuthorizedIssuer(address account) external view returns (bool) {
        return issuers[account].isActive && hasRole(ISSUER_ROLE, account);
    }

    /**
     * @notice Récupère la liste des empreintes certifiées par une institution.
     */
    function getCertificatesByIssuer(address issuer) external view returns (bytes32[] memory) {
        return _issuerCertificates[issuer];
    }
}
