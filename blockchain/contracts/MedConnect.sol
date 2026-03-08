// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MedConnect
 * @dev Blockchain-based prescription, dispensing, and consent verification system
 * @notice Deployed on Polygon Amoy Testnet
 */
contract MedConnect {
    // ============ PRESCRIPTION MANAGEMENT ============

    struct Prescription {
        bytes32 prescriptionHash;
        address patient;
        address doctor;
        uint256 timestamp;
        bool isDispensed;
        address dispensedBy;
        uint256 dispensedAt;
    }

    // ============ CONSENT MANAGEMENT ============

    struct Consent {
        address patient;
        address grantee;
        string consentType;
        uint256 expiresAt;
        bool isActive;
        uint256 createdAt;
    }

    // ============ STATE VARIABLES ============

    address public owner;

    // Prescription records by hash
    mapping(bytes32 => Prescription) public prescriptions;

    // Licensed pharmacy mapping
    mapping(address => bool) public licensedPharmacies;

    // Medicine batch verification
    mapping(bytes32 => bool) public verifiedBatches;

    // Consent records: keccak256(patient, grantee, consentType) => Consent
    mapping(bytes32 => Consent) public consents;

    // Safety attestation: prescriptionHash => attestationHash
    mapping(bytes32 => bytes32) public safetyAttestations;

    // ============ EVENTS ============

    event PrescriptionRecorded(
        bytes32 indexed prescriptionHash,
        address indexed patient,
        address indexed doctor,
        uint256 timestamp
    );

    event DispenseRecorded(
        bytes32 indexed prescriptionHash,
        address indexed pharmacy,
        uint256 timestamp
    );

    event PharmacyLicensed(address indexed pharmacy, bool status);

    event BatchVerified(bytes32 indexed batchHash, uint256 timestamp);

    event ConsentGranted(
        address indexed patient,
        address indexed grantee,
        string consentType,
        uint256 expiresAt
    );

    event ConsentRevoked(
        address indexed patient,
        address indexed grantee,
        string consentType
    );

    event SafetyAttestationRecorded(
        bytes32 indexed prescriptionHash,
        bytes32 attestationHash,
        uint256 timestamp
    );

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyLicensedPharmacy() {
        require(licensedPharmacies[msg.sender], "Pharmacy not licensed");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() {
        owner = msg.sender;
    }

    // ============ PRESCRIPTION FUNCTIONS ============

    /**
     * @dev Record a new prescription on the blockchain
     */
    function recordPrescription(
        bytes32 prescriptionHash,
        address patient,
        address doctor
    ) external returns (uint256) {
        require(prescriptions[prescriptionHash].timestamp == 0, "Prescription already exists");

        prescriptions[prescriptionHash] = Prescription({
            prescriptionHash: prescriptionHash,
            patient: patient,
            doctor: doctor,
            timestamp: block.timestamp,
            isDispensed: false,
            dispensedBy: address(0),
            dispensedAt: 0
        });

        emit PrescriptionRecorded(prescriptionHash, patient, doctor, block.timestamp);
        return block.timestamp;
    }

    /**
     * @dev Record dispensing of a prescription
     */
    function recordDispense(bytes32 prescriptionHash) external returns (uint256) {
        Prescription storage prescription = prescriptions[prescriptionHash];

        require(prescription.timestamp > 0, "Prescription does not exist");
        require(!prescription.isDispensed, "Prescription already dispensed");

        prescription.isDispensed = true;
        prescription.dispensedBy = msg.sender;
        prescription.dispensedAt = block.timestamp;

        emit DispenseRecorded(prescriptionHash, msg.sender, block.timestamp);
        return block.timestamp;
    }

    /**
     * @dev Verify a prescription exists and get details
     */
    function verifyPrescription(bytes32 prescriptionHash)
        external
        view
        returns (
            bool exists,
            uint256 timestamp,
            address patient,
            address doctor,
            bool isDispensed
        )
    {
        Prescription memory prescription = prescriptions[prescriptionHash];
        return (
            prescription.timestamp > 0,
            prescription.timestamp,
            prescription.patient,
            prescription.doctor,
            prescription.isDispensed
        );
    }

    /**
     * @dev Verify dispensing status
     */
    function verifyDispense(bytes32 prescriptionHash)
        external
        view
        returns (
            bool isDispensed,
            address dispensedBy,
            uint256 dispensedAt
        )
    {
        Prescription memory prescription = prescriptions[prescriptionHash];
        return (
            prescription.isDispensed,
            prescription.dispensedBy,
            prescription.dispensedAt
        );
    }

    // ============ BATCH & PHARMACY FUNCTIONS ============

    /**
     * @dev Register a medicine batch as verified
     */
    function registerBatch(bytes32 batchHash) external onlyOwner {
        verifiedBatches[batchHash] = true;
        emit BatchVerified(batchHash, block.timestamp);
    }

    /**
     * @dev License a pharmacy
     */
    function setPharmacyLicense(address pharmacy, bool status) external onlyOwner {
        licensedPharmacies[pharmacy] = status;
        emit PharmacyLicensed(pharmacy, status);
    }

    /**
     * @dev Verify if a medicine batch is authentic
     */
    function verifyBatch(bytes32 batchHash) external view returns (bool) {
        return verifiedBatches[batchHash];
    }

    // ============ CONSENT FUNCTIONS ============

    /**
     * @dev Generate consent key from patient, grantee, and consent type
     */
    function _consentKey(address patient, address grantee, string memory consentType) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(patient, grantee, consentType));
    }

    /**
     * @dev Patient grants consent to a doctor or pharmacy
     * @param grantee Address of the doctor/pharmacy receiving consent
     * @param consentType Type of consent: "read", "write", or "dispense"
     * @param durationSeconds Duration of consent in seconds
     */
    function grantConsent(
        address grantee,
        string calldata consentType,
        uint256 durationSeconds
    ) external {
        require(grantee != address(0), "Invalid grantee address");
        require(durationSeconds > 0 && durationSeconds <= 30 * 24 * 3600, "Duration must be 1 second to 30 days");

        bytes32 key = _consentKey(msg.sender, grantee, consentType);
        uint256 expiresAt = block.timestamp + durationSeconds;

        consents[key] = Consent({
            patient: msg.sender,
            grantee: grantee,
            consentType: consentType,
            expiresAt: expiresAt,
            isActive: true,
            createdAt: block.timestamp
        });

        emit ConsentGranted(msg.sender, grantee, consentType, expiresAt);
    }

    /**
     * @dev Patient revokes consent
     */
    function revokeConsent(address grantee, string calldata consentType) external {
        bytes32 key = _consentKey(msg.sender, grantee, consentType);
        Consent storage consent = consents[key];

        require(consent.isActive, "Consent not active or does not exist");
        consent.isActive = false;

        emit ConsentRevoked(msg.sender, grantee, consentType);
    }

    /**
     * @dev Verify if consent is currently active
     */
    function verifyConsent(
        address patient,
        address grantee,
        string calldata consentType
    ) external view returns (bool) {
        bytes32 key = _consentKey(patient, grantee, consentType);
        Consent memory consent = consents[key];
        return consent.isActive && consent.expiresAt > block.timestamp;
    }

    // ============ SAFETY ATTESTATION ============

    /**
     * @dev Record AI safety attestation for a prescription
     */
    function recordSafetyAttestation(
        bytes32 prescriptionHash,
        bytes32 attestationHash
    ) external {
        require(prescriptions[prescriptionHash].timestamp > 0, "Prescription does not exist");
        safetyAttestations[prescriptionHash] = attestationHash;
        emit SafetyAttestationRecorded(prescriptionHash, attestationHash, block.timestamp);
    }

    /**
     * @dev Verify safety attestation exists for a prescription
     */
    function verifySafetyAttestation(bytes32 prescriptionHash)
        external
        view
        returns (bool exists, bytes32 attestationHash)
    {
        bytes32 hash = safetyAttestations[prescriptionHash];
        return (hash != bytes32(0), hash);
    }
}
