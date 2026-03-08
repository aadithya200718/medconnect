import { pool, initializeDatabase } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

async function seedDatabase() {
    await initializeDatabase();

    if (!pool) {
        console.error('❌ Database pool not available. Cannot seed — are you in in-memory mode?');
        process.exit(1);
    }

    console.log('🌱 Seeding database with demo data...\n');

    try {
        // Create demo users
        const patientUserId = uuidv4();
        const doctorUserId = uuidv4();
        const pharmacyUserId = uuidv4();

        // Patient User
        await pool.execute(`
            INSERT IGNORE INTO users (id, email, phone, role, gov_id, wallet_address, is_verified)
            VALUES (?, ?, ?, 'patient', '123456789012', '0x1234567890abcdef1234567890abcdef12345678', TRUE)
        `, [patientUserId, 'harish.kumar@email.com', '+919876543210']);

        // Doctor User
        await pool.execute(`
            INSERT IGNORE INTO users (id, email, phone, role, gov_id, wallet_address, is_verified)
            VALUES (?, ?, ?, 'doctor', '987654321098', '0xabcdef1234567890abcdef1234567890abcdef12', TRUE)
        `, [doctorUserId, 'dr.sharma@hospital.com', '+919876543211']);

        // Pharmacy User
        await pool.execute(`
            INSERT IGNORE INTO users (id, email, phone, role, gov_id, wallet_address, is_verified)
            VALUES (?, ?, ?, 'pharmacy', '567890123456', '0x567890abcdef1234567890abcdef1234567890ab', TRUE)
        `, [pharmacyUserId, 'apollo@pharmacy.com', '+919876543212']);

        console.log('✅ Created demo users');

        // Create profiles
        const patientId = uuidv4();
        const doctorId = uuidv4();
        const pharmacyId = uuidv4();

        // Patient Profile
        await pool.execute(`
            INSERT IGNORE INTO patients (id, user_id, full_name, dob, gender, blood_group, allergies, chronic_conditions, qr_identity_hash)
            VALUES (?, ?, 'Harish Kumar', '1990-08-12', 'male', 'O+', '["Penicillin"]', '["Diabetes Type 2"]', ?)
        `, [patientId, patientUserId, `PATIENT-${patientId.slice(0, 8)}`]);

        // Doctor Profile
        await pool.execute(`
            INSERT IGNORE INTO doctors (id, user_id, full_name, specialization, license_number, hospital, verified_status)
            VALUES (?, ?, 'Dr. Priya Sharma', 'General Medicine', 'MCI-12345', 'Apollo Hospital', 'verified')
        `, [doctorId, doctorUserId]);

        // Pharmacy Profile
        await pool.execute(`
            INSERT IGNORE INTO pharmacies (id, user_id, pharmacy_name, license_number, address, verified_status)
            VALUES (?, ?, 'Apollo Pharmacy - Indiranagar', 'PH-56789', '123 MG Road, Indiranagar, Bangalore', 'verified')
        `, [pharmacyId, pharmacyUserId]);

        console.log('✅ Created demo profiles');

        // Create sample consent (24-hour)
        const consentId = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.execute(`
            INSERT IGNORE INTO consents (id, patient_id, granted_to_id, granted_to_type, consent_types, expires_at, is_active)
            VALUES (?, ?, ?, 'doctor', '["read", "write"]', ?, TRUE)
        `, [consentId, patientId, doctorId, expiresAt]);

        await pool.execute(`
            INSERT IGNORE INTO consents (id, patient_id, granted_to_id, granted_to_type, consent_types, expires_at, is_active)
            VALUES (?, ?, ?, 'pharmacy', '["read", "dispense"]', ?, TRUE)
        `, [uuidv4(), patientId, pharmacyId, expiresAt]);

        console.log('✅ Created demo consents (24-hour access)');

        // Create sample prescription
        const prescriptionId = uuidv4();
        const medicines = JSON.stringify([
            {
                id: 'med-001',
                name: 'Metformin 500mg',
                dosage: '500mg',
                frequency: 'Twice daily',
                duration: '30 days',
                quantity: 60,
                instructions: 'Take after meals'
            }
        ]);

        await pool.execute(`
            INSERT IGNORE INTO prescriptions (id, patient_id, doctor_id, diagnosis, medicines, blockchain_hash, status, prescription_date, valid_until)
            VALUES (?, ?, ?, 'Type 2 Diabetes Management', ?, ?, 'active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))
        `, [prescriptionId, patientId, doctorId, medicines, `0x${Buffer.from(prescriptionId).toString('hex').slice(0, 64)}`]);

        console.log('✅ Created demo prescription');

        // --- User Requested Demo Data (Aadhi) ---
        const patientAadhiUserId = uuidv4();
        const doctorAadhiUserId = uuidv4();
        const patientAadhiProfileId = 'patient-aadhi'; // Using predictable ID to match memory DB
        const doctorAadhiProfileId = 'doctor-aadhi';

        // Insert Aadhi User
        await pool.execute(`
            INSERT IGNORE INTO users (id, email, phone, role, gov_id, wallet_address, is_verified, name)
            VALUES (?, ?, ?, 'patient', '111122223333', '0xaadhi1234567890abcdef1234567890abcdef123', TRUE, 'Aadhi')
        `, [patientAadhiUserId, 'aadhi@email.com', '+919150590195']);

        // Insert Doctor User
        await pool.execute(`
            INSERT IGNORE INTO users (id, email, phone, role, gov_id, wallet_address, is_verified, name)
            VALUES (?, ?, ?, 'doctor', '444455556666', '0xdoc1234567890abcdef1234567890abcdef12345', TRUE, 'Dr. Aadhi Care')
        `, [doctorAadhiUserId, 'dr.aadhi@hospital.com', '+919790830025']);

        // Insert Aadhi Profile
        await pool.execute(`
            INSERT IGNORE INTO patients (id, user_id, full_name, dob, gender, blood_group, allergies, chronic_conditions, qr_identity_hash)
            VALUES (?, ?, 'Aadhi', '2000-01-01', 'male', 'B+', '[]', '[]', 'PATIENT-AADHI-HASH')
        `, [patientAadhiProfileId, patientAadhiUserId]);

        // Insert Doctor Profile
        await pool.execute(`
            INSERT IGNORE INTO doctors (id, user_id, full_name, specialization, license_number, hospital, verified_status)
            VALUES (?, ?, 'Dr. Aadhi Care', 'General Medicine', 'MCI-00000', 'City Hospital', 'verified')
        `, [doctorAadhiProfileId, doctorAadhiUserId]);

        // Insert 15 Consents
        for (let i = 1; i <= 15; i++) {
            const is_active = i % 3 !== 0; // Every 3rd consent is inactive
            const consentId = `consent-aadhi-${i}`;
            const expiresAt = new Date(Date.now() + i * 24 * 60 * 60 * 1000); // i days in the future

            await pool.execute(`
                INSERT IGNORE INTO consents (id, patient_id, granted_to_id, granted_to_type, consent_types, expires_at, is_active)
                VALUES (?, ?, ?, 'doctor', '["read", "write"]', ?, ?)
            `, [consentId, patientAadhiProfileId, doctorAadhiProfileId, expiresAt, is_active]);
        }

        console.log('✅ Created User Requested Demo Data (Aadhi & Doctor Aadhi Care with 15 consents)');

        console.log(`
╔════════════════════════════════════════════════════════════╗
║ 🎉 Demo Data Seeded Successfully!                          ║
╠════════════════════════════════════════════════════════════╣
║ Demo Login Credentials:                                    ║
║ ----------------------------------------                   ║
║ Patient:  Gov-ID: 1234-5678-9012                          ║
║ Doctor:   Gov-ID: 9876-5432-1098                          ║
║ Pharmacy: Gov-ID: 5678-9012-3456                          ║
║                                                            ║
║ Use any 12-digit number + OTP from console to login        ║
╚════════════════════════════════════════════════════════════╝
        `);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();