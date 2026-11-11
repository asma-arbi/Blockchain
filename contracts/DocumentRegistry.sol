// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocumentRegistry
 * @author Senior Full-Stack Blockchain Developer
 * @notice Contrat d'ancrage et de vérification d'intégrité de documents numériques sur la blockchain.
 * @dev Seule l'empreinte SHA-256 (convertie en bytes32) est enregistrée pour garantir la confidentialité
 *      et optimiser la consommation de gas. Le fichier physique n'est jamais stocké on-chain.
 */
contract DocumentRegistry {
    // =============================================================
    //                           STRUCTURES
    // =============================================================

    /**
     * @notice Structure représentant les métadonnées d'un document ancré.
     * @param owner Adresse Ethereum de l'émetteur ayant enregistré le document.
     * @param timestamp Horodatage de bloc (block.timestamp) au moment de l'enregistrement.
     * @param name Nom original du fichier documenté.
     */
    struct Document {
        address owner;
        uint256 timestamp;
        string name;
    }

    // =============================================================
    //                          CUSTOM ERRORS
    // =============================================================

    /// @notice Émis lorsqu'une tentative d'enregistrement utilise un hash nul (bytes32(0)).
    error InvalidHash();

    /// @notice Émis lorsqu'une tentative d'enregistrement utilise un nom de fichier vide.
    error EmptyName();

    /// @notice Émis lorsqu'un hash a déjà été enregistré dans le registre.
    /// @param hash L'empreinte SHA-256 déjà existante.
    error DocumentAlreadyExists(bytes32 hash);

    /// @notice Émis lorsqu'une adresse nulle (address(0)) est fournie en paramètre de recherche.
    error ZeroAddress();

    // =============================================================
    //                            EVENTS
    // =============================================================

    /**
     * @notice Événement émis lors de l'enregistrement réussi d'un document.
     * @param hash Empreinte numérique (bytes32) du document.
     * @param owner Adresse de l'utilisateur ayant déposé l'empreinte.
     * @param timestamp Timestamp Unix du bloc lors de l'enregistrement.
     */
    event DocumentRegistered(
        bytes32 indexed hash,
        address indexed owner,
        uint256 timestamp
    );

    // =============================================================
    //                       STORAGE VARIABLES
    // =============================================================

    /// @dev Mapping principal associant le hash SHA-256 (bytes32) à la structure Document.
    mapping(bytes32 => Document) private _documents;

    /// @dev Mapping associant chaque adresse de propriétaire à la liste des hashes enregistrés.
    mapping(address => bytes32[]) private _ownerDocuments;

    // =============================================================
    //                         WRITE METHODS
    // =============================================================

    /**
     * @notice Enregistre l'empreinte SHA-256 d'un document sur la blockchain.
     * @dev Rejette les hashes nuls, noms vides et hashes déjà enregistrés.
     *      Émet l'événement `DocumentRegistered`.
     * @param hash Empreinte numérique SHA-256 du document (bytes32).
     * @param name Nom original du fichier.
     */
    function register(bytes32 hash, string calldata name) external {
        if (hash == bytes32(0)) {
            revert InvalidHash();
        }
        if (bytes(name).length == 0) {
            revert EmptyName();
        }
        if (_documents[hash].timestamp != 0) {
            revert DocumentAlreadyExists(hash);
        }

        _documents[hash] = Document({
            owner: msg.sender,
            timestamp: block.timestamp,
            name: name
        });

        _ownerDocuments[msg.sender].push(hash);

        emit DocumentRegistered(hash, msg.sender, block.timestamp);
    }

    // =============================================================
    //                          READ METHODS
    // =============================================================

    /**
     * @notice Vérifie l'existence et l'intégrité d'un document à partir de son hash.
     * @param hash Empreinte SHA-256 (bytes32) à rechercher.
     * @return exists Vrai si le document est enregistré, faux sinon.
     * @return owner Adresse de l'émetteur ayant enregistré le document (ou address(0)).
     * @return timestamp Horodatage de l'enregistrement (ou 0).
     * @return name Nom du fichier enregistré (ou chaîne vide).
     */
    function verify(bytes32 hash)
        external
        view
        returns (
            bool exists,
            address owner,
            uint256 timestamp,
            string memory name
        )
    {
        Document storage doc = _documents[hash];
        if (doc.timestamp != 0) {
            return (true, doc.owner, doc.timestamp, doc.name);
        }
        return (false, address(0), 0, "");
    }

    /**
     * @notice Récupère la liste des empreintes enregistrées par un propriétaire donné.
     * @param owner Adresse de l'utilisateur.
     * @return hashes Liste des hashes bytes32 enregistrés par cette adresse.
     */
    function getDocumentsByOwner(address owner)
        external
        view
        returns (bytes32[] memory hashes)
    {
        if (owner == address(0)) {
            revert ZeroAddress();
        }
        return _ownerDocuments[owner];
    }

    /**
     * @notice Récupère le nombre de documents enregistrés par une adresse.
     * @param owner Adresse de l'utilisateur.
     * @return count Nombre de documents.
     */
    function getDocumentCountByOwner(address owner)
        external
        view
        returns (uint256 count)
    {
        if (owner == address(0)) {
            revert ZeroAddress();
        }
        return _ownerDocuments[owner].length;
    }

    /**
     * @notice Récupère simultanément les hashes et les détails complets des documents d'une adresse.
     * @dev Optimisé pour les appels en lecture (view) du frontend afin d'éviter les requêtes N+1.
     * @param owner Adresse de l'utilisateur.
     * @return hashes Liste des hashes bytes32.
     * @return docs Liste des structures Document associées.
     */
    function getDocumentDetailsByOwner(address owner)
        external
        view
        returns (bytes32[] memory hashes, Document[] memory docs)
    {
        if (owner == address(0)) {
            revert ZeroAddress();
        }
        bytes32[] storage ownerHashes = _ownerDocuments[owner];
        uint256 total = ownerHashes.length;

        hashes = new bytes32[](total);
        docs = new Document[](total);

        for (uint256 i = 0; i < total; ) {
            bytes32 h = ownerHashes[i];
            hashes[i] = h;
            docs[i] = _documents[h];
            unchecked {
                ++i;
            }
        }

        return (hashes, docs);
    }
}
