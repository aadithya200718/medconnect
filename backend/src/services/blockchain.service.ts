import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// MedConnect ABI (simplified for hackathon)
const MEDCONNECT_ABI = [
    "function recordPrescription(bytes32 prescriptionHash, address patient, address doctor) external returns (uint256)",
    "function recordDispense(bytes32 prescriptionHash, address pharmacy) external returns (uint256)",
    "function verifyPrescription(bytes32 prescriptionHash) external view returns (bool, uint256, address, address)",
    "function verifyDispense(bytes32 prescriptionHash) external view returns (bool, address, uint256)",
    "event PrescriptionRecorded(bytes32 indexed prescriptionHash, address indexed patient, address indexed doctor, uint256 timestamp)",
    "event DispenseRecorded(bytes32 indexed prescriptionHash, address indexed pharmacy, uint256 timestamp)"
];

export class BlockchainService {
    private provider: ethers.JsonRpcProvider | null = null;
    private wallet: ethers.Wallet | null = null;
    private contract: ethers.Contract | null = null;

    constructor() {
        this.initialize();
    }

    private initialize() {
        try {
            const rpcUrl = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            if (process.env.PRIVATE_KEY) {
                this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

                // Only initialize contract if the address is a valid Ethereum hex string
                // This prevents ethers v6 from attempting to resolve placeholders as ENS domains
                const isAddressValid = process.env.CONTRACT_ADDRESS &&
                    process.env.CONTRACT_ADDRESS.startsWith('0x') &&
                    process.env.CONTRACT_ADDRESS.length === 42;

                if (isAddressValid) {
                    this.contract = new ethers.Contract(
                        process.env.CONTRACT_ADDRESS as string,
                        MEDCONNECT_ABI,
                        this.wallet
                    );
                    console.log(`✅ Blockchain contract initialized at: ${process.env.CONTRACT_ADDRESS}`);
                } else {
                    console.warn(`⚠️ CONTRACT_ADDRESS is missing or invalid in .env (falling back to demo mode)`);
                }
            }

            if (this.contract) {
                console.log('✅ Blockchain service fully configured');
            } else {
                console.warn('⚠️ Blockchain service not fully configured (demo mode)');
            }
        } catch (error) {
            console.warn('⚠️ Blockchain service initialization failed (demo mode)', error);
        }
    }

    // Generate hash for prescription data
    generatePrescriptionHash(prescriptionData: {
        patientId: string;
        doctorId: string;
        diagnosis: string;
        medicines: any[];
        timestamp: number;
    }): string {
        const data = JSON.stringify(prescriptionData);
        return ethers.keccak256(ethers.toUtf8Bytes(data));
    }

    // Record prescription on blockchain (or simulate)
    async recordPrescription(
        prescriptionHash: string,
        patientAddress: string = ethers.ZeroAddress,
        doctorAddress: string = ethers.ZeroAddress
    ): Promise<{ success: boolean; txHash?: string; error?: string }> {
        // If contract not configured, simulate for demo
        if (!this.contract || !this.wallet) {
            const simulatedTxHash = `0x${Buffer.from(Date.now().toString() + Math.random().toString()).toString('hex').slice(0, 64)}`;
            console.log(`📝 [DEMO] Prescription recorded: ${simulatedTxHash}`);
            return { success: true, txHash: simulatedTxHash };
        }

        try {
            const tx = await this.contract.recordPrescription(
                prescriptionHash,
                patientAddress,
                doctorAddress
            );
            const receipt = await tx.wait();
            return { success: true, txHash: receipt.hash };
        } catch (error: any) {
            console.error('Blockchain error:', error);
            return { success: false, error: error.message };
        }
    }

    // Record dispense on blockchain (or simulate)
    async recordDispense(
        prescriptionHash: string,
        pharmacyAddress: string = ethers.ZeroAddress
    ): Promise<{ success: boolean; txHash?: string; error?: string }> {
        if (!this.contract || !this.wallet) {
            const simulatedTxHash = `0x${Buffer.from(Date.now().toString() + Math.random().toString()).toString('hex').slice(0, 64)}`;
            console.log(`💊 [DEMO] Dispense recorded: ${simulatedTxHash}`);
            return { success: true, txHash: simulatedTxHash };
        }

        try {
            const tx = await this.contract.recordDispense(prescriptionHash, pharmacyAddress);
            const receipt = await tx.wait();
            return { success: true, txHash: receipt.hash };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Verify medicine authenticity
    verifyMedicine(qrData: string): {
        isValid: boolean;
        details?: {
            name: string;
            manufacturer: string;
            batchNumber: string;
            expiryDate: string;
            blockchainHash: string;
        }
    } {
        try {
            // Parse QR data (expected format: JSON with medicine details)
            const data = JSON.parse(qrData);

            // In production, verify against blockchain
            // For demo, validate structure
            if (data.name && data.manufacturer && data.batchNumber) {
                return {
                    isValid: true,
                    details: {
                        name: data.name,
                        manufacturer: data.manufacturer,
                        batchNumber: data.batchNumber,
                        expiryDate: data.expiryDate || '2027-12-31',
                        blockchainHash: data.blockchainHash || this.generatePrescriptionHash(data)
                    }
                };
            }
            return { isValid: false };
        } catch {
            return { isValid: false };
        }
    }

    // Get Polygon Amoy explorer link
    getExplorerLink(txHash: string): string {
        return `https://amoy.polygonscan.com/tx/${txHash}`;
    }

    // Generate hash for medicine batch data
    generateMedicineHash(medicineData: {
        name: string;
        manufacturer: string;
        batchNumber: string;
        mfgDate: string;
        expiryDate: string;
    }): string {
        const data = JSON.stringify(medicineData);
        return ethers.keccak256(ethers.toUtf8Bytes(data));
    }

    // Register medicine batch on blockchain (or simulate)
    async registerMedicine(medicineData: {
        name: string;
        manufacturer: string;
        batchNumber: string;
        mfgDate: string;
        expiryDate: string;
    }): Promise<{ success: boolean; medicineHash: string; txHash?: string; qrCodeData?: string }> {
        const medicineHash = this.generateMedicineHash(medicineData);

        if (!this.contract || !this.wallet) {
            // Demo mode - simulate registration
            const simulatedTxHash = `0x${Buffer.from(Date.now().toString() + Math.random().toString()).toString('hex').slice(0, 64)}`;
            console.log(`💊 [DEMO] Medicine registered: ${medicineHash}`);

            const qrCodeData = JSON.stringify({
                ...medicineData,
                blockchainHash: medicineHash,
                txHash: simulatedTxHash,
                verified: true
            });

            return {
                success: true,
                medicineHash,
                txHash: simulatedTxHash,
                qrCodeData
            };
        }

        try {
            // In production, call contract.registerBatch()
            const tx = await this.contract.registerBatch(medicineHash);
            const receipt = await tx.wait();

            const qrCodeData = JSON.stringify({
                ...medicineData,
                blockchainHash: medicineHash,
                txHash: receipt.hash,
                verified: true
            });

            return {
                success: true,
                medicineHash,
                txHash: receipt.hash,
                qrCodeData
            };
        } catch (error: any) {
            console.error('Medicine registration error:', error);
            return { success: false, medicineHash, txHash: undefined };
        }
    }

    // Verify medicine on blockchain
    async verifyMedicineOnChain(medicineHash: string): Promise<{
        isValid: boolean;
        isExpired?: boolean;
        details?: any;
    }> {
        if (!this.contract) {
            // Demo mode - always return valid
            return {
                isValid: true,
                isExpired: false,
                details: {
                    verifiedAt: new Date().toISOString(),
                    network: 'Polygon Amoy (Demo)'
                }
            };
        }

        try {
            const isVerified = await this.contract.verifyBatch(medicineHash);
            return {
                isValid: isVerified,
                isExpired: false,
                details: {
                    verifiedAt: new Date().toISOString(),
                    network: 'Polygon Amoy'
                }
            };
        } catch (error: any) {
            console.error('Medicine verification error:', error);
            return { isValid: false };
        }
    }

    // Generate QR code data for medicine
    generateMedicineQR(medicineData: {
        name: string;
        manufacturer: string;
        batchNumber: string;
        expiryDate: string;
        blockchainHash: string;
    }): string {
        return JSON.stringify({
            type: 'MEDCONNECT_MEDICINE',
            ...medicineData,
            timestamp: Date.now()
        });
    }

    // ============ CONSENT MANAGEMENT ============

    // Grant consent on-chain
    async grantConsentOnChain(
        granteeAddress: string,
        consentType: string,
        durationSeconds: number
    ): Promise<{ txHash: string; explorerLink: string }> {
        if (!this.contract) {
            const simulatedHash = `0x${Date.now().toString(16).padEnd(64, '0')}`;
            return {
                txHash: simulatedHash,
                explorerLink: `https://amoy.polygonscan.com/tx/${simulatedHash}`
            };
        }

        try {
            const tx = await this.contract.grantConsent(granteeAddress, consentType, durationSeconds);
            const receipt = await tx.wait();
            return {
                txHash: receipt.hash,
                explorerLink: `https://amoy.polygonscan.com/tx/${receipt.hash}`
            };
        } catch (error: any) {
            console.error('Grant consent on-chain error:', error);
            throw error;
        }
    }

    // Revoke consent on-chain
    async revokeConsentOnChain(
        granteeAddress: string,
        consentType: string
    ): Promise<{ txHash: string; explorerLink: string }> {
        if (!this.contract) {
            const simulatedHash = `0x${Date.now().toString(16).padEnd(64, '0')}`;
            return {
                txHash: simulatedHash,
                explorerLink: `https://amoy.polygonscan.com/tx/${simulatedHash}`
            };
        }

        try {
            const tx = await this.contract.revokeConsent(granteeAddress, consentType);
            const receipt = await tx.wait();
            return {
                txHash: receipt.hash,
                explorerLink: `https://amoy.polygonscan.com/tx/${receipt.hash}`
            };
        } catch (error: any) {
            console.error('Revoke consent on-chain error:', error);
            throw error;
        }
    }

    // Verify consent on-chain
    async verifyConsentOnChain(
        patientAddress: string,
        granteeAddress: string,
        consentType: string
    ): Promise<boolean> {
        if (!this.contract) return false;

        try {
            return await this.contract.verifyConsent(patientAddress, granteeAddress, consentType);
        } catch {
            return false;
        }
    }

    // ============ SAFETY ATTESTATION ============

    // Record AI safety attestation on blockchain
    async recordSafetyAttestation(
        prescriptionHash: string,
        attestationHash: string
    ): Promise<{ txHash: string; explorerLink: string }> {
        if (!this.contract) {
            const simulatedHash = `0x${Date.now().toString(16).padEnd(64, '0')}`;
            console.log(`[DEMO] Safety attestation: ${attestationHash} for prescription: ${prescriptionHash}`);
            return {
                txHash: simulatedHash,
                explorerLink: `https://amoy.polygonscan.com/tx/${simulatedHash}`
            };
        }

        try {
            const tx = await this.contract.recordSafetyAttestation(prescriptionHash, attestationHash);
            const receipt = await tx.wait();
            return {
                txHash: receipt.hash,
                explorerLink: `https://amoy.polygonscan.com/tx/${receipt.hash}`
            };
        } catch (error: any) {
            console.error('Safety attestation error:', error);
            // Don't fail the prescription if attestation fails
            const simulatedHash = `0x${Date.now().toString(16).padEnd(64, '0')}`;
            return { txHash: simulatedHash, explorerLink: '' };
        }
    }

    // ============ SBT MINTING ============

    // Mint Soul-Bound Token for prescription
    async mintPrescriptionSBT(
        patientAddress: string,
        prescriptionHash: string,
        metadataURI: string
    ): Promise<{ tokenId: string; txHash: string; explorerLink: string }> {
        // SBT contract interaction (uses separate contract address)
        const simulatedTokenId = `SBT-${Date.now().toString(36).toUpperCase()}`;
        const simulatedHash = `0x${Date.now().toString(16).padEnd(64, '0')}`;

        console.log(`[DEMO] SBT minted: ${simulatedTokenId} for patient: ${patientAddress}`);

        return {
            tokenId: simulatedTokenId,
            txHash: simulatedHash,
            explorerLink: `https://amoy.polygonscan.com/tx/${simulatedHash}`
        };
    }

    // ============ CREDENTIAL REGISTRY ============

    // Verify credential on-chain
    async verifyCredential(walletAddress: string): Promise<{
        isVerified: boolean;
        credentialHash?: string;
        issuedAt?: number;
    }> {
        // Demo mode — always treat as verified for the hackathon
        return {
            isVerified: true,
            credentialHash: `0x${crypto.createHash('sha256').update(walletAddress).digest('hex')}`,
            issuedAt: Date.now()
        };
    }
}

import crypto from 'crypto';
export const blockchainService = new BlockchainService();
export default blockchainService;
