// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PrescriptionSBT
 * @dev Soul-Bound Token for prescriptions - non-transferable ERC721
 * @notice Each prescription mints an SBT to the patient's wallet
 */
contract PrescriptionSBT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Prescription data stored per token
    struct PrescriptionData {
        bytes32 prescriptionHash;
        address doctor;
        uint256 timestamp;
        string diagnosis;
    }

    mapping(uint256 => PrescriptionData) public prescriptionData;
    mapping(bytes32 => uint256) public prescriptionToToken;

    event PrescriptionSBTMinted(
        uint256 indexed tokenId,
        address indexed patient,
        address indexed doctor,
        bytes32 prescriptionHash
    );

    constructor() ERC721("MedConnect Prescription", "MCRX") {}

    /**
     * @dev Mint a new prescription SBT to a patient
     * @param patient Address of the patient receiving the SBT
     * @param prescriptionHash Hash of the prescription data
     * @param doctor Address of the prescribing doctor
     * @param diagnosis Text diagnosis
     * @param uri Metadata URI for the prescription
     */
    function mintPrescription(
        address patient,
        bytes32 prescriptionHash,
        address doctor,
        string calldata diagnosis,
        string calldata uri
    ) external onlyOwner returns (uint256) {
        require(prescriptionToToken[prescriptionHash] == 0, "Prescription already minted");

        uint256 tokenId = ++_nextTokenId;

        _safeMint(patient, tokenId);
        _setTokenURI(tokenId, uri);

        prescriptionData[tokenId] = PrescriptionData({
            prescriptionHash: prescriptionHash,
            doctor: doctor,
            timestamp: block.timestamp,
            diagnosis: diagnosis
        });

        prescriptionToToken[prescriptionHash] = tokenId;

        emit PrescriptionSBTMinted(tokenId, patient, doctor, prescriptionHash);
        return tokenId;
    }

    /**
     * @dev Override _beforeTokenTransfer to make tokens non-transferable (soul-bound)
     * Only allow minting (from == address(0)) and burning (to == address(0))
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721) {
        // Allow minting (from = 0) and burning (to = 0), block transfers
        if (from != address(0) && to != address(0)) {
            revert("PrescriptionSBT: Soul-bound token cannot be transferred");
        }
        
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Get prescription data by token ID
     */
    function getPrescription(uint256 tokenId) external view returns (
        bytes32 prescriptionHash,
        address doctor,
        uint256 timestamp,
        string memory diagnosis
    ) {
        PrescriptionData memory data = prescriptionData[tokenId];
        return (data.prescriptionHash, data.doctor, data.timestamp, data.diagnosis);
    }

    // Required overrides for ERC721URIStorage
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
