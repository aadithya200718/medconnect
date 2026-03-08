import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const inMemoryDb = {
    users: new Map<string, any>(),
    patients: new Map<string, any>(),
    doctors: new Map<string, any>(),
    pharmacies: new Map<string, any>(),
    prescriptions: new Map<string, any>(),
    consents: new Map<string, any>(),
    otp_verifications: new Map<string, any>(),
    dispensingRecords: new Map<string, any>(),
    isDemo: true
};

let pool: mysql.Pool | null = null;
let useInMemory = false;

// Try to create connection pool for TiDB
try {
    // We defer pool creation to initializeDatabase to ensure DB exists first
} catch (error) {
    console.warn('⚠️ Could not configure initial pool settings');
}

// Initialize database tables
export async function initializeDatabase() {
    // 1. Ensure Database Exists (Connect without DB selected)
    if (!process.env.TIDB_HOST?.includes('localhost') && !useInMemory) {
        try {
            const connection = await mysql.createConnection({
                host: process.env.TIDB_HOST,
                port: parseInt(process.env.TIDB_PORT || '4000'),
                user: process.env.TIDB_USER,
                password: process.env.TIDB_PASSWORD,
                ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
            });

            const dbName = process.env.TIDB_DATABASE || 'medconnect';
            await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
            await connection.end();
            console.log(`✅ Database '${dbName}' verified/created`);
        } catch (error: any) {
            console.warn('⚠️ Could not create database automatically:', error.message);
        }
    }

    // 2. Create Pool
    if (!pool && !useInMemory) {
        try {
            pool = mysql.createPool({
                host: process.env.TIDB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
                port: parseInt(process.env.TIDB_PORT || '4000'),
                user: process.env.TIDB_USER || 'your_user',
                password: process.env.TIDB_PASSWORD || 'your_password',
                database: process.env.TIDB_DATABASE || 'medconnect',
                ssl: {
                    minVersion: 'TLSv1.2',
                    rejectUnauthorized: true
                },
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });
        } catch (error) {
            console.warn('⚠️ Could not create connection pool, switching to in-memory');
            useInMemory = true;
        }
    }

    if (useInMemory || !pool) {
        console.log('📦 Using in-memory database for demo mode');
        seedInMemoryData();
        return;
    }

    try {
        const connection = await pool.getConnection();

        // Test connection
        await connection.execute('SELECT 1');

        // Users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20) UNIQUE NOT NULL,
                role ENUM('patient', 'doctor', 'pharmacy') NOT NULL,
                aadhar_number VARCHAR(12) UNIQUE NOT NULL,
                password VARCHAR(255),
                wallet_address VARCHAR(42),
                is_phone_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Patients table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS patients (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                dob DATE,
                gender ENUM('male', 'female', 'other'),
                blood_group VARCHAR(5),
                allergies JSON,
                chronic_conditions JSON,
                qr_identity_hash VARCHAR(255),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Doctors table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS doctors (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                specialization VARCHAR(100),
                license_number VARCHAR(50) UNIQUE,
                hospital VARCHAR(255),
                verified_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Pharmacies table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pharmacies (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                pharmacy_name VARCHAR(255) NOT NULL,
                license_number VARCHAR(50) UNIQUE,
                address TEXT,
                verified_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // OTP Verifications table (for phone-based OTP)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id VARCHAR(36) PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                otp VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_phone (phone)
            )
        `);

        // Consents table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS consents (
                id VARCHAR(36) PRIMARY KEY,
                patient_id VARCHAR(36) NOT NULL,
                granted_to_id VARCHAR(36) NOT NULL,
                granted_to_type ENUM('doctor', 'pharmacy') NOT NULL,
                consent_type VARCHAR(20),
                consent_types JSON,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id)
            )
        `);

        // Prescriptions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS prescriptions (
                id VARCHAR(36) PRIMARY KEY,
                patient_id VARCHAR(36) NOT NULL,
                doctor_id VARCHAR(36) NOT NULL,
                diagnosis TEXT,
                medicines JSON,
                blockchain_hash VARCHAR(255),
                status ENUM('active', 'dispensed', 'cancelled') DEFAULT 'active',
                prescription_date DATE NOT NULL,
                valid_until DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (doctor_id) REFERENCES doctors(id)
            )
        `);

        // Migration for existing tables
        try {
            await connection.execute('ALTER TABLE prescriptions ADD COLUMN notes TEXT');
        } catch (e) {
            // Ignore error if column already exists
        }

        // Migration for users table - add new columns for phone OTP auth
        const userMigrations = [
            'ALTER TABLE users ADD COLUMN name VARCHAR(255)',
            'ALTER TABLE users ADD COLUMN aadhar_number VARCHAR(12)',
            'ALTER TABLE users ADD COLUMN password VARCHAR(255)',
            'ALTER TABLE users ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE',
            'ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL',
            'UPDATE users SET is_phone_verified = is_verified WHERE is_phone_verified IS NULL',
            'UPDATE users SET aadhar_number = gov_id WHERE aadhar_number IS NULL',
            'UPDATE users SET name = CONCAT(role, \'-\', SUBSTRING(COALESCE(gov_id, id), 1, 4)) WHERE name IS NULL'
        ];

        for (const migration of userMigrations) {
            try {
                await connection.execute(migration);
            } catch (e) {
                // Ignore errors (column may already exist or migration may have run)
            }
        }

        // Create otp_verifications table if it doesn't exist (new table)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id VARCHAR(36) PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                otp VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_phone (phone)
            )
        `);


        // Medicines table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS medicines(
            id VARCHAR(36) PRIMARY KEY,
            medicine_name VARCHAR(255) NOT NULL,
            generic_name VARCHAR(255),
            manufacturer VARCHAR(255),
            strength VARCHAR(100),
            blockchain_hash VARCHAR(255),
            requires_prescription BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
            `);

        // Medicine Batches table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS medicine_batches(
                id VARCHAR(36) PRIMARY KEY,
                medicine_id VARCHAR(36) NOT NULL,
                batch_number VARCHAR(100) NOT NULL,
                mfg_date DATE,
                expiry_date DATE NOT NULL,
                qr_code_hash VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(medicine_id) REFERENCES medicines(id)
            )
            `);

        // Prescription Medicines (Junction table)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS prescription_medicines(
                id VARCHAR(36) PRIMARY KEY,
                prescription_id VARCHAR(36) NOT NULL,
                medicine_id VARCHAR(36) NOT NULL,
                dosage VARCHAR(100),
                frequency VARCHAR(100),
                duration VARCHAR(100),
                quantity INT,
                FOREIGN KEY(prescription_id) REFERENCES prescriptions(id),
                FOREIGN KEY(medicine_id) REFERENCES medicines(id)
            )
            `);

        // Dispensing Records table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS dispensing_records(
                id VARCHAR(36) PRIMARY KEY,
                prescription_id VARCHAR(36) NOT NULL,
                pharmacy_id VARCHAR(36) NOT NULL,
                patient_id VARCHAR(36) NOT NULL,
                dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                blockchain_tx_hash VARCHAR(255),
                patient_qr_verified BOOLEAN DEFAULT FALSE,
                medicine_qr_verified BOOLEAN DEFAULT FALSE,
                FOREIGN KEY(prescription_id) REFERENCES prescriptions(id),
                FOREIGN KEY(pharmacy_id) REFERENCES pharmacies(id),
                FOREIGN KEY(patient_id) REFERENCES patients(id)
            )
        `);
        console.log('✅ Database tables initialized successfully');
        connection.release();
    } catch (error: any) {
        console.warn('⚠️ Database connection failed, switching to in-memory mode');
        console.warn(`   Reason: ${error.message} `);
        useInMemory = true;
        seedInMemoryData();
    }
}

// Seed in-memory data for demo
function seedInMemoryData() {
    // Demo patient
    inMemoryDb.users.set('user-patient-001', {
        id: 'user-patient-001',
        name: 'Harish Kumar',
        phone: '+919876543001',
        role: 'patient',
        aadhar_number: '123456789012',
        is_phone_verified: true
    });
    inMemoryDb.patients.set('patient-001', {
        id: 'patient-001',
        user_id: 'user-patient-001',
        full_name: 'Harish Kumar',
        qr_identity_hash: 'PATIENT-001-HASH'
    });

    // Demo doctor
    inMemoryDb.users.set('user-doctor-001', {
        id: 'user-doctor-001',
        name: 'Dr. Priya Sharma',
        phone: '+919876543002',
        role: 'doctor',
        aadhar_number: '987654321098',
        is_phone_verified: true
    });
    inMemoryDb.doctors.set('doctor-001', {
        id: 'doctor-001',
        user_id: 'user-doctor-001',
        full_name: 'Dr. Priya Sharma',
        specialization: 'General Medicine',
        license_number: 'MCI-12345',
        hospital: 'Apollo Hospital'
    });

    // Demo pharmacy
    inMemoryDb.users.set('user-pharmacy-001', {
        id: 'user-pharmacy-001',
        name: 'Apollo Pharmacy',
        phone: '+919876543003',
        role: 'pharmacy',
        aadhar_number: '567890123456',
        is_phone_verified: true
    });
    inMemoryDb.pharmacies.set('pharmacy-001', {
        id: 'pharmacy-001',
        user_id: 'user-pharmacy-001',
        pharmacy_name: 'Apollo Pharmacy - Indiranagar',
        license_number: 'PH-56789',
        address: '123 MG Road, Bangalore'
    });

    // --- User Requested Demo Data ---

    // Patient: Aadhi
    inMemoryDb.users.set('user-patient-aadhi', {
        id: 'user-patient-aadhi',
        name: 'Aadhi',
        phone: '+919150590195',
        role: 'patient',
        aadhar_number: '111122223333',
        is_phone_verified: true
    });
    inMemoryDb.patients.set('patient-aadhi', {
        id: 'patient-aadhi',
        user_id: 'user-patient-aadhi',
        full_name: 'Aadhi',
        qr_identity_hash: 'PATIENT-AADHI-HASH'
    });

    // Doctor: For Aadhi
    inMemoryDb.users.set('user-doctor-aadhi', {
        id: 'user-doctor-aadhi',
        name: 'Dr. Aadhi Care',
        phone: '+919790830025',
        role: 'doctor',
        aadhar_number: '444455556666',
        is_phone_verified: true
    });
    inMemoryDb.doctors.set('doctor-aadhi', {
        id: 'doctor-aadhi',
        user_id: 'user-doctor-aadhi',
        full_name: 'Dr. Aadhi Care',
        specialization: 'General Medicine',
        license_number: 'MCI-00000',
        hospital: 'City Hospital'
    });

    // Generate 15 consents from Aadhi to Dr. Aadhi Care
    for (let i = 1; i <= 15; i++) {
        const consentId = `consent-aadhi-${i}`;
        inMemoryDb.consents.set(consentId, {
            id: consentId,
            patient_id: 'patient-aadhi',
            granted_to_id: 'doctor-aadhi',
            granted_to_type: 'doctor',
            consent_types: ['read', 'write'],
            consent_type: 'read',
            expires_at: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
            is_active: i % 3 !== 0, // Make every 3rd consent inactive to simulate some history
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        });
    }

    // Pharmacy consent for Aadhi → Apollo Pharmacy (so dispense flow works in demo)
    inMemoryDb.consents.set('consent-aadhi-pharmacy', {
        id: 'consent-aadhi-pharmacy',
        patient_id: 'patient-aadhi',
        granted_to_id: 'pharmacy-001',
        granted_to_type: 'pharmacy',
        consent_types: ['dispense', 'read'],
        consent_type: 'dispense',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
    });

    console.log('✅ In-memory demo data seeded successfully');
}

// Export pool and check function
export { pool };
export function getPool(): typeof pool {
    return pool;
}
export function isUsingInMemory(): boolean {
    return useInMemory || !pool;
}

export default { pool, inMemoryDb, isUsingInMemory, getPool };
