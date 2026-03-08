import { ethers } from 'ethers';

// Polygon Amoy Testnet
const AMOY_CHAIN_ID = 80002;
const AMOY_CHAIN_CONFIG = {
    chainId: `0x${AMOY_CHAIN_ID.toString(16)}`,
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/']
};

// MedConnect contract ABI (consent-related functions)
const MEDCONNECT_ABI = [
    "function recordPrescription(bytes32 prescriptionHash, address patient, address doctor) external returns (uint256)",
    "function recordDispense(bytes32 prescriptionHash) external returns (uint256)",
    "function verifyPrescription(bytes32 prescriptionHash) external view returns (bool, uint256, address, address, bool)",
    "function grantConsent(address grantee, string consentType, uint256 durationSeconds) external",
    "function revokeConsent(address grantee, string consentType) external",
    "function verifyConsent(address patient, address grantee, string consentType) external view returns (bool)",
    "event ConsentGranted(address indexed patient, address indexed grantee, string consentType, uint256 expiresAt)",
    "event ConsentRevoked(address indexed patient, address indexed grantee, string consentType)"
];

// Contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

export interface WalletState {
    address: string | null;
    isConnected: boolean;
    chainId: number | null;
    isCorrectNetwork: boolean;
}

class WalletService {
    private provider: ethers.BrowserProvider | null = null;
    private signer: ethers.JsonRpcSigner | null = null;

    /**
     * Check if MetaMask is installed
     */
    isMetaMaskInstalled(): boolean {
        return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
    }

    /**
     * Connect to MetaMask wallet
     */
    async connectWallet(): Promise<{ address: string; chainId: number }> {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
        }

        const ethereum = (window as any).ethereum;
        this.provider = new ethers.BrowserProvider(ethereum);

        // Request account access
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        this.signer = await this.provider.getSigner();

        const address = accounts[0];
        const network = await this.provider.getNetwork();
        const chainId = Number(network.chainId);

        return { address, chainId };
    }

    /**
     * Switch to Polygon Amoy network
     */
    async switchToAmoy(): Promise<void> {
        if (!this.isMetaMaskInstalled()) return;

        const ethereum = (window as any).ethereum;

        try {
            await ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: AMOY_CHAIN_CONFIG.chainId }]
            });
        } catch (switchError: any) {
            // Chain not added to MetaMask, add it
            if (switchError.code === 4902) {
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [AMOY_CHAIN_CONFIG]
                });
            } else {
                throw switchError;
            }
        }
    }

    /**
     * Get connected wallet address
     */
    async getAddress(): Promise<string | null> {
        if (!this.signer) return null;
        return await this.signer.getAddress();
    }

    /**
     * Getting the current chain ID
     */
    async getChainId(): Promise<number | null> {
        if (!this.provider) return null;
        const network = await this.provider.getNetwork();
        return Number(network.chainId);
    }

    /**
     * Check if on correct network
     */
    isCorrectNetwork(chainId: number | null): boolean {
        return chainId === AMOY_CHAIN_ID;
    }

    /**
     * Get contract instance
     */
    private getContract(): ethers.Contract | null {
        if (!this.signer || !CONTRACT_ADDRESS) return null;
        return new ethers.Contract(CONTRACT_ADDRESS, MEDCONNECT_ABI, this.signer);
    }

    /**
     * Grant consent on-chain
     */
    async grantConsentOnChain(
        granteeAddress: string,
        consentType: string,
        durationHours: number
    ): Promise<{ txHash: string; explorerLink: string }> {
        const contract = this.getContract();

        if (!contract) {
            // Demo mode - simulate transaction
            const simulatedHash = `0x${Date.now().toString(16).padEnd(64, '0')}`;
            return {
                txHash: simulatedHash,
                explorerLink: `https://amoy.polygonscan.com/tx/${simulatedHash}`
            };
        }

        const durationSeconds = durationHours * 60 * 60;
        const tx = await contract.grantConsent(granteeAddress, consentType, durationSeconds);
        const receipt = await tx.wait();

        return {
            txHash: receipt.hash,
            explorerLink: `https://amoy.polygonscan.com/tx/${receipt.hash}`
        };
    }

    /**
     * Revoke consent on-chain
     */
    async revokeConsentOnChain(
        granteeAddress: string,
        consentType: string
    ): Promise<{ txHash: string; explorerLink: string }> {
        const contract = this.getContract();

        if (!contract) {
            const simulatedHash = `0x${Date.now().toString(16).padEnd(64, '0')}`;
            return {
                txHash: simulatedHash,
                explorerLink: `https://amoy.polygonscan.com/tx/${simulatedHash}`
            };
        }

        const tx = await contract.revokeConsent(granteeAddress, consentType);
        const receipt = await tx.wait();

        return {
            txHash: receipt.hash,
            explorerLink: `https://amoy.polygonscan.com/tx/${receipt.hash}`
        };
    }

    /**
     * Verify consent on-chain
     */
    async verifyConsentOnChain(
        patientAddress: string,
        granteeAddress: string,
        consentType: string
    ): Promise<boolean> {
        const contract = this.getContract();
        if (!contract) return false;

        try {
            return await contract.verifyConsent(patientAddress, granteeAddress, consentType);
        } catch {
            return false;
        }
    }

    /**
     * Disconnect wallet
     */
    disconnect(): void {
        this.provider = null;
        this.signer = null;
    }

    /**
     * Listen for account/chain changes
     */
    onAccountsChanged(callback: (accounts: string[]) => void): void {
        if (this.isMetaMaskInstalled()) {
            (window as any).ethereum.on('accountsChanged', callback);
        }
    }

    onChainChanged(callback: (chainId: string) => void): void {
        if (this.isMetaMaskInstalled()) {
            (window as any).ethereum.on('chainChanged', callback);
        }
    }

    /**
     * Get explorer link for a transaction
     */
    getExplorerLink(txHash: string): string {
        return `https://amoy.polygonscan.com/tx/${txHash}`;
    }
}

export const walletService = new WalletService();
export default walletService;
