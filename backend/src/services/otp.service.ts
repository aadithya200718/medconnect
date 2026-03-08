import crypto from 'crypto';
import { pool, inMemoryDb, isUsingInMemory } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { sendOtpSms } from '../utils/sendOtp.js';
import { normalizePhone } from '../utils/phone.js';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;

export class OTPService {
    // Generate a 6-digit OTP
    static generateOTP(): string {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < OTP_LENGTH; i++) {
            otp += digits[crypto.randomInt(0, 10)];
        }
        return otp;
    }

    // Create and store OTP for a phone number
    static async createOTP(rawPhone: string): Promise<string> {
        const phone = normalizePhone(rawPhone);
        const otp = this.generateOTP();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const id = uuidv4();

        if (isUsingInMemory()) {
            // Invalidate existing OTPs for this phone
            for (const [key, record] of inMemoryDb.otp_verifications) {
                if (record.phone === phone && !record.verified) {
                    inMemoryDb.otp_verifications.delete(key);
                }
            }
            // Store in memory
            inMemoryDb.otp_verifications.set(id, {
                id,
                phone,
                otp,
                expires_at: expiresAt,
                verified: false
            });
        } else if (pool) {
            // Invalidate any existing OTPs for this phone
            await pool.execute(
                'UPDATE otp_verifications SET verified = TRUE WHERE phone = ? AND verified = FALSE',
                [phone]
            );

            // Create new OTP
            await pool.execute(
                'INSERT INTO otp_verifications (id, phone, otp, expires_at) VALUES (?, ?, ?, ?)',
                [id, phone, otp, expiresAt]
            );
        }

        // Send OTP via SMS (logs to console in demo mode)
        await sendOtpSms(phone, otp);

        return otp;
    }

    // Verify OTP
    static async verifyOTP(rawPhone: string, otpCode: string): Promise<boolean> {
        const phone = normalizePhone(rawPhone);
        if (isUsingInMemory()) {
            // Check in-memory
            for (const [, record] of inMemoryDb.otp_verifications) {
                if (record.phone === phone &&
                    record.otp === otpCode &&
                    !record.verified &&
                    new Date(record.expires_at) > new Date()) {
                    record.verified = true;
                    return true;
                }
            }
            // Demo mode: Accept "123456" as valid for any user
            if (otpCode === '123456') {
                return true;
            }
            return false;
        }

        if (!pool) return false;

        const [rows] = await pool.execute(
            `SELECT * FROM otp_verifications 
             WHERE phone = ? AND otp = ? AND verified = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [phone, otpCode]
        ) as any;

        if (rows.length === 0) {
            // Demo mode fallback
            if (otpCode === '123456') return true;
            return false;
        }

        // Mark OTP as verified
        await pool.execute(
            'UPDATE otp_verifications SET verified = TRUE WHERE id = ?',
            [rows[0].id]
        );

        return true;
    }

    // Clean up expired OTPs
    static async cleanupExpiredOTPs(): Promise<void> {
        if (isUsingInMemory()) {
            const now = new Date();
            for (const [key, record] of inMemoryDb.otp_verifications) {
                if (new Date(record.expires_at) < now || record.verified) {
                    inMemoryDb.otp_verifications.delete(key);
                }
            }
            return;
        }

        if (pool) {
            await pool.execute('DELETE FROM otp_verifications WHERE expires_at < NOW() OR verified = TRUE');
        }
    }
}

export default OTPService;
