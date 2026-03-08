// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CredentialRegistry
 * @dev On-chain registry for verifying doctor/pharmacy credentials
 * @notice Maps wallet addresses to verified license hashes
 */
contract CredentialRegistry is Ownable {
    struct Credential {
        bytes32 licenseHash;
        string credentialType; // "doctor", "pharmacy"
        uint256 issuedAt;
        uint256 expiresAt;
        bool isActive;
        string name;
    }

    // wallet address => Credential
    mapping(address => Credential) public credentials;

    // Events
    event CredentialIssued(
        address indexed holder,
        bytes32 licenseHash,
        string credentialType,
        uint256 expiresAt
    );

    event CredentialRevoked(address indexed holder, string reason);

    constructor() Ownable() {}

    /**
     * @dev Issue a credential to a healthcare provider
     * @param holder Wallet address of the doctor/pharmacy
     * @param licenseHash Hash of the medical license
     * @param credentialType "doctor" or "pharmacy"
     * @param name Name of the credential holder
     * @param validDays Number of days the credential is valid
     */
    function issueCredential(
        address holder,
        bytes32 licenseHash,
        string calldata credentialType,
        string calldata name,
        uint256 validDays
    ) external onlyOwner {
        require(holder != address(0), "Invalid holder address");
        require(validDays > 0 && validDays <= 3650, "Valid days must be 1-3650");

        uint256 expiresAt = block.timestamp + (validDays * 1 days);

        credentials[holder] = Credential({
            licenseHash: licenseHash,
            credentialType: credentialType,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            name: name
        });

        emit CredentialIssued(holder, licenseHash, credentialType, expiresAt);
    }

    /**
     * @dev Verify if a credential is currently valid
     */
    function verifyCredential(address holder) external view returns (
        bool isValid,
        bytes32 licenseHash,
        string memory credentialType,
        string memory name,
        uint256 expiresAt
    ) {
        Credential memory cred = credentials[holder];
        bool valid = cred.isActive && cred.expiresAt > block.timestamp && cred.licenseHash != bytes32(0);

        return (
            valid,
            cred.licenseHash,
            cred.credentialType,
            cred.name,
            cred.expiresAt
        );
    }

    /**
     * @dev Revoke a credential
     */
    function revokeCredential(address holder, string calldata reason) external onlyOwner {
        credentials[holder].isActive = false;
        emit CredentialRevoked(holder, reason);
    }

    /**
     * @dev Check if a specific credential type is verified
     */
    function isVerified(address holder, string calldata credentialType) external view returns (bool) {
        Credential memory cred = credentials[holder];
        return cred.isActive &&
               cred.expiresAt > block.timestamp &&
               keccak256(bytes(cred.credentialType)) == keccak256(bytes(credentialType));
    }
}
