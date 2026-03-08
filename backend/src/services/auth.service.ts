import jwt from 'jsonwebtoken';
import { pool, inMemoryDb, isUsingInMemory } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import OTPService from './otp.service.js';
import { normalizePhone } from '../utils/phone.js';

const JWT_SECRET = process.env.JWT_SECRET || 'medconnect-secret';
const JWT_EXPIRY = '24h';

export interface UserPayload {
    id: string;
    phone: string;
    role: 'patient' | 'doctor' | 'pharmacy';
}

export interface RegistrationData {
    name: string;
    role: 'patient' | 'doctor' | 'pharmacy';
    phone: string;
    aadhar_number: string;
}

// Temporary storage for pending registrations (before OTP verification)
const pendingRegistrations = new Map<string, RegistrationData>();

export class AuthService {
    // ============ REGISTRATION FLOW ============

    /**
     * Step 1: Initiate registration - validate data, check if phone exists, send OTP
     */
    static async register(data: RegistrationData): Promise<{ success: boolean; message: string }> {
        const { name, role, aadhar_number } = data;
        const phone = normalizePhone(data.phone);

        // Validate required fields
        if (!name || !role || !phone || !aadhar_number) {
            return { success: false, message: 'All fields are required: name, role, phone, aadhar_number' };
        }

        // Validate role
        if (!['patient', 'doctor', 'pharmacy'].includes(role)) {
            return { success: false, message: 'Invalid role. Must be patient, doctor, or pharmacy' };
        }

        // Validate Aadhaar format (12 digits)
        const cleanedAadhar = aadhar_number.replace(/\s/g, '');
        if (!/^\d{12}$/.test(cleanedAadhar)) {
            return { success: false, message: 'Invalid Aadhaar number. Must be 12 digits.' };
        }

        // Check if phone already registered
        const phoneExists = await this.checkPhoneExists(phone);
        if (phoneExists) {
            return { success: false, message: 'Phone number already registered. Please login instead.' };
        }

        // Check if Aadhaar already registered
        const aadharExists = await this.checkAadharExists(cleanedAadhar);
        if (aadharExists) {
            return { success: false, message: 'Aadhaar number already registered.' };
        }

        // Store pending registration data
        pendingRegistrations.set(phone, { ...data, aadhar_number: cleanedAadhar });

        // Generate and send OTP
        await OTPService.createOTP(phone);

        return {
            success: true,
            message: 'OTP sent successfully to your phone number.'
        };
    }

    /**
     * Step 2: Verify registration OTP and create user
     */
    static async verifyRegistrationOTP(
        rawPhone: string,
        otpCode: string
    ): Promise<{ success: boolean; token?: string; user?: any; message?: string }> {
        const phone = normalizePhone(rawPhone);
        // Get pending registration data
        const registrationData = pendingRegistrations.get(phone);
        if (!registrationData) {
            return { success: false, message: 'No pending registration found. Please register first.' };
        }

        // Verify OTP
        const isValid = await OTPService.verifyOTP(phone, otpCode);
        if (!isValid) {
            return { success: false, message: 'Invalid or expired OTP' };
        }

        // Create user
        const userId = uuidv4();
        const { name, role, aadhar_number } = registrationData;

        if (isUsingInMemory()) {
            // In-memory mode
            inMemoryDb.users.set(userId, {
                id: userId,
                name,
                phone,
                role,
                aadhar_number,
                password: null,
                is_phone_verified: true
            });

            // Create role-specific profile
            this.createInMemoryProfile(userId, role, name);
        } else if (pool) {
            // Database mode - include gov_id for backward compatibility
            await pool.execute(
                `INSERT INTO users (id, name, phone, role, aadhar_number, gov_id, is_phone_verified, is_verified) 
                 VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
                [userId, name, phone, role, aadhar_number, aadhar_number]
            );

            // Create role-specific profile
            await this.createRoleProfile(userId, role, name);
        }

        // Clear pending registration
        pendingRegistrations.delete(phone);

        // Get user with profile
        const user = isUsingInMemory()
            ? this.getInMemoryUserWithProfile(userId, role)
            : await this.getUserWithProfile(userId, role);

        // Generate JWT
        const token = jwt.sign(
            { id: userId, phone, role } as UserPayload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        return { success: true, token, user };
    }

    // ============ LOGIN FLOW ============

    /**
     * Step 1: Request login OTP - check if user exists and is verified
     */
    static async requestLoginOTP(rawPhone: string): Promise<{ success: boolean; message: string }> {
        if (!rawPhone) {
            return { success: false, message: 'Phone number is required' };
        }
        const phone = normalizePhone(rawPhone);

        // Check if user exists and is verified
        const user = await this.getUserByPhone(phone);
        if (!user) {
            return { success: false, message: 'Phone number not registered. Please register first.' };
        }

        if (!user.is_phone_verified) {
            return { success: false, message: 'Phone number not verified. Please complete registration.' };
        }

        // Generate and send OTP
        await OTPService.createOTP(phone);

        return {
            success: true,
            message: 'OTP sent successfully to your phone number.'
        };
    }

    /**
     * Step 2: Verify login OTP and issue JWT
     */
    static async verifyLoginOTP(
        rawPhone: string,
        otpCode: string
    ): Promise<{ success: boolean; token?: string; user?: any; message?: string }> {
        const phone = normalizePhone(rawPhone);
        // Verify OTP
        const isValid = await OTPService.verifyOTP(phone, otpCode);
        if (!isValid) {
            return { success: false, message: 'Invalid or expired OTP' };
        }

        // Get user
        const user = await this.getUserByPhone(phone);
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        if (!user.is_phone_verified) {
            return { success: false, message: 'Phone number not verified' };
        }

        // Get full user profile
        const userWithProfile = isUsingInMemory()
            ? this.getInMemoryUserWithProfile(user.id, user.role)
            : await this.getUserWithProfile(user.id, user.role);

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, phone, role: user.role } as UserPayload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        return { success: true, token, user: userWithProfile };
    }

    // ============ HELPER METHODS ============

    private static async checkPhoneExists(phone: string): Promise<boolean> {
        if (isUsingInMemory()) {
            return Array.from(inMemoryDb.users.values()).some(u => u.phone === phone);
        }

        if (!pool) return false;

        const [rows] = await pool.execute(
            'SELECT id FROM users WHERE phone = ?',
            [phone]
        ) as any;

        return rows.length > 0;
    }

    private static async checkAadharExists(aadhar: string): Promise<boolean> {
        if (isUsingInMemory()) {
            return Array.from(inMemoryDb.users.values()).some(u => u.aadhar_number === aadhar);
        }

        if (!pool) return false;

        const [rows] = await pool.execute(
            'SELECT id FROM users WHERE aadhar_number = ?',
            [aadhar]
        ) as any;

        return rows.length > 0;
    }

    private static async getUserByPhone(phone: string): Promise<any | null> {
        if (isUsingInMemory()) {
            return Array.from(inMemoryDb.users.values()).find(u => u.phone === phone) || null;
        }

        if (!pool) return null;

        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE phone = ?',
            [phone]
        ) as any;

        return rows[0] || null;
    }

    // In-memory profile creation
    private static createInMemoryProfile(userId: string, role: string, name: string): void {
        const profileId = uuidv4();

        switch (role) {
            case 'patient':
                inMemoryDb.patients.set(profileId, {
                    id: profileId,
                    user_id: userId,
                    full_name: name,
                    qr_identity_hash: `PATIENT-${profileId.slice(0, 8)}`
                });
                break;
            case 'doctor':
                inMemoryDb.doctors.set(profileId, {
                    id: profileId,
                    user_id: userId,
                    full_name: name,
                    specialization: 'General Medicine',
                    license_number: `MCI-${uuidv4().slice(0, 5)}`,
                    hospital: 'Pending Assignment'
                });
                break;
            case 'pharmacy':
                inMemoryDb.pharmacies.set(profileId, {
                    id: profileId,
                    user_id: userId,
                    pharmacy_name: name,
                    license_number: `PH-${uuidv4().slice(0, 5)}`,
                    address: 'Pending Address'
                });
                break;
        }
    }

    // Get user with profile from in-memory
    private static getInMemoryUserWithProfile(userId: string, role: string): any {
        const user = inMemoryDb.users.get(userId);
        if (!user) return null;

        let profile: any = null;
        switch (role) {
            case 'patient':
                profile = Array.from(inMemoryDb.patients.values()).find(p => p.user_id === userId);
                break;
            case 'doctor':
                profile = Array.from(inMemoryDb.doctors.values()).find(d => d.user_id === userId);
                break;
            case 'pharmacy':
                profile = Array.from(inMemoryDb.pharmacies.values()).find(p => p.user_id === userId);
                break;
        }

        return { ...user, profile };
    }

    // Create role-specific profile in database
    private static async createRoleProfile(userId: string, role: string, name: string): Promise<void> {
        if (!pool) return;
        const profileId = uuidv4();

        switch (role) {
            case 'patient':
                await pool.execute(
                    `INSERT INTO patients (id, user_id, full_name, qr_identity_hash) VALUES (?, ?, ?, ?)`,
                    [profileId, userId, name, `PATIENT-${profileId.slice(0, 8)}`]
                );
                break;
            case 'doctor':
                await pool.execute(
                    `INSERT INTO doctors (id, user_id, full_name, specialization, license_number, hospital, verified_status) 
                     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                    [profileId, userId, name, 'General Medicine', `MCI-${uuidv4().slice(0, 5)}`, 'Pending Assignment']
                );
                break;
            case 'pharmacy':
                await pool.execute(
                    `INSERT INTO pharmacies (id, user_id, pharmacy_name, license_number, address, verified_status) 
                     VALUES (?, ?, ?, ?, ?, 'pending')`,
                    [profileId, userId, name, `PH-${uuidv4().slice(0, 5)}`, 'Pending Address']
                );
                break;
        }
    }

    // Get user with role-specific profile from database
    private static async getUserWithProfile(userId: string, role: string): Promise<any> {
        if (!pool) return null;

        let query: string;

        switch (role) {
            case 'patient':
                query = `SELECT u.*, p.id as profile_id, p.full_name, p.qr_identity_hash
                         FROM users u LEFT JOIN patients p ON u.id = p.user_id WHERE u.id = ?`;
                break;
            case 'doctor':
                query = `SELECT u.*, d.id as profile_id, d.full_name, d.specialization, d.hospital
                         FROM users u LEFT JOIN doctors d ON u.id = d.user_id WHERE u.id = ?`;
                break;
            case 'pharmacy':
                query = `SELECT u.*, p.id as profile_id, p.pharmacy_name, p.address
                         FROM users u LEFT JOIN pharmacies p ON u.id = p.user_id WHERE u.id = ?`;
                break;
            default:
                return null;
        }

        const [rows] = await pool.execute(query, [userId]) as any;
        return rows[0] || null;
    }

    // Verify JWT token
    static verifyToken(token: string): UserPayload | null {
        try {
            return jwt.verify(token, JWT_SECRET) as UserPayload;
        } catch {
            return null;
        }
    }
}

export default AuthService;
