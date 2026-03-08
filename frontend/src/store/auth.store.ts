import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/services/api';
import walletService from '@/services/wallet';
import type { Patient, Doctor, Pharmacy } from '@/types';

interface AuthState {
    user: Patient | Doctor | Pharmacy | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    otpSent: boolean;
    pendingPhone: string | null;

    // Wallet state
    walletAddress: string | null;
    isWalletConnected: boolean;
    walletChainId: number | null;

    // Actions
    requestLoginOTP: (phone: string) => Promise<boolean>;
    verifyLoginOTP: (phone: string, otp: string) => Promise<boolean>;
    registerUser: (data: { name: string; role: string; phone: string; aadhar_number: string }) => Promise<boolean>;
    verifyRegistrationOTP: (phone: string, otp: string) => Promise<boolean>;
    connectWallet: () => Promise<boolean>;
    disconnectWallet: () => void;
    logout: () => void;
    setUser: (user: Patient | Doctor | Pharmacy) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            otpSent: false,
            pendingPhone: null,
            walletAddress: null,
            isWalletConnected: false,
            walletChainId: null,

            // Login Flow
            requestLoginOTP: async (phone: string) => {
                set({ isLoading: true });
                try {
                    const result = await authApi.login(phone);
                    if (result.success) {
                        set({ otpSent: true, pendingPhone: phone, isLoading: false });
                        return true;
                    }
                } catch (error) {
                    console.error('Login request failed:', error);
                }
                set({ isLoading: false });
                return false;
            },

            verifyLoginOTP: async (phone: string, otp: string) => {
                set({ isLoading: true });
                try {
                    const result = await authApi.verifyLoginOTP(phone, otp);
                    if (result.success && result.token) {
                        localStorage.setItem('medconnect-token', result.token);
                        set({
                            user: result.user, token: result.token,
                            isAuthenticated: true, isLoading: false,
                            otpSent: false, pendingPhone: null,
                        });
                        return true;
                    }
                } catch (error) {
                    console.error('Login verification failed:', error);
                }
                set({ isLoading: false });
                return false;
            },

            // Registration Flow
            registerUser: async (data) => {
                set({ isLoading: true });
                try {
                    const result = await authApi.register(data);
                    if (result.success) {
                        set({ otpSent: true, pendingPhone: data.phone, isLoading: false });
                        return true;
                    }
                } catch (error) {
                    console.error('Registration failed:', error);
                }
                set({ isLoading: false });
                return false;
            },

            verifyRegistrationOTP: async (phone: string, otp: string) => {
                set({ isLoading: true });
                try {
                    const result = await authApi.verifyRegistrationOTP(phone, otp);
                    if (result.success && result.token) {
                        localStorage.setItem('medconnect-token', result.token);
                        set({
                            user: result.user, token: result.token,
                            isAuthenticated: true, isLoading: false,
                            otpSent: false, pendingPhone: null,
                        });
                        return true;
                    }
                } catch (error) {
                    console.error('Registration verification failed:', error);
                }
                set({ isLoading: false });
                return false;
            },

            // Wallet actions
            connectWallet: async () => {
                try {
                    const { address, chainId } = await walletService.connectWallet();
                    set({
                        walletAddress: address,
                        isWalletConnected: true,
                        walletChainId: chainId
                    });

                    // Listen for changes
                    walletService.onAccountsChanged((accounts) => {
                        if (accounts.length === 0) {
                            set({ walletAddress: null, isWalletConnected: false, walletChainId: null });
                        } else {
                            set({ walletAddress: accounts[0] });
                        }
                    });

                    walletService.onChainChanged((chainIdHex) => {
                        set({ walletChainId: parseInt(chainIdHex, 16) });
                    });

                    // Auto-switch to Amoy if on wrong network
                    if (!walletService.isCorrectNetwork(chainId)) {
                        await walletService.switchToAmoy();
                    }

                    return true;
                } catch (error) {
                    console.error('Wallet connection failed:', error);
                    return false;
                }
            },

            disconnectWallet: () => {
                walletService.disconnect();
                set({ walletAddress: null, isWalletConnected: false, walletChainId: null });
            },

            logout: () => {
                localStorage.removeItem('medconnect-token');
                walletService.disconnect();
                set({
                    user: null, token: null, isAuthenticated: false,
                    otpSent: false, pendingPhone: null,
                    walletAddress: null, isWalletConnected: false, walletChainId: null,
                });
            },

            setUser: (user) => {
                set({ user });
            },
        }),
        {
            name: 'medconnect-auth',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                walletAddress: state.walletAddress,
                isWalletConnected: state.isWalletConnected,
            }),
        }
    )
);
