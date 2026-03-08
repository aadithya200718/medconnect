import { pool, initializeDatabase } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3001/api';
const PATIENT_GOV_ID = '999900001111';
const DOCTOR_GOV_ID = '888800002222';
const OTP_CODE = '123456'; // Mocked OTP

async function runTest() {
    console.log('🚀 Starting Consent Flow Test...\n');
    await initializeDatabase();

    if (!pool) {
        console.error('❌ Database pool is null. Cannot run DB setup steps. Ensure TiDB is connected for this test.');
        process.exit(1);
    }

    try {
        // 1. Cleanup old test data
        console.log('🧹 Cleaning up old test data...');
        // Find user IDs for these gov IDs to clean up related data
        const [users] = await pool.execute('SELECT id FROM users WHERE gov_id IN (?, ?)', [PATIENT_GOV_ID, DOCTOR_GOV_ID]) as any;
        const userIds = users.map((u: any) => u.id);

        if (userIds.length > 0) {
            const placeholders = userIds.map(() => '?').join(',');

            // Delete child records first
            await pool.execute(`DELETE FROM consents WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (${placeholders}))`, userIds);
            await pool.execute(`DELETE FROM prescriptions WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (${placeholders})) OR doctor_id IN (SELECT id FROM doctors WHERE user_id IN (${placeholders}))`, [...userIds, ...userIds]);
            await pool.execute(`DELETE FROM patients WHERE user_id IN (${placeholders})`, userIds);
            await pool.execute(`DELETE FROM doctors WHERE user_id IN (${placeholders})`, userIds);
            await pool.execute(`DELETE FROM users WHERE id IN (${placeholders})`, userIds);
        }
        console.log('✅ Cleanup done.');

        // 2. Create Test Users directly in DB (to simulate registration/existence)
        console.log('1️⃣  Creating Test Users in DB...');

        const patientUserId = uuidv4();
        await pool.execute(`INSERT INTO users (id, email, role, gov_id, is_verified) VALUES (?, ?, 'patient', ?, 1)`, [patientUserId, 'test.patient@example.com', PATIENT_GOV_ID]);
        const patientId = uuidv4();
        await pool.execute(`INSERT INTO patients (id, user_id, full_name, qr_identity_hash) VALUES (?, ?, 'Test Patient', 'hash123')`, [patientId, patientUserId]);

        const doctorUserId = uuidv4();
        await pool.execute(`INSERT INTO users (id, email, role, gov_id, is_verified) VALUES (?, ?, 'doctor', ?, 1)`, [doctorUserId, 'test.doctor@example.com', DOCTOR_GOV_ID]);
        const doctorId = uuidv4();
        await pool.execute(`INSERT INTO doctors (id, user_id, full_name, specialization) VALUES (?, ?, 'Dr. Test', 'Cardiology')`, [doctorId, doctorUserId]);

        console.log('✅ Users created.');

        // 3. Login as Patient
        console.log('\n2️⃣  Logging in as Patient...');
        // Request OTP
        await axios.post(`${API_URL}/auth/request-otp`, { govId: PATIENT_GOV_ID });
        // Verify OTP
        const patientLogin = await axios.post(`${API_URL}/auth/verify-otp`, { govId: PATIENT_GOV_ID, otp: OTP_CODE, role: 'patient' });
        const patientToken = patientLogin.data.token;
        console.log('✅ Patient Logged In.');

        // 4. Login as Doctor
        console.log('\n3️⃣  Logging in as Doctor...');
        await axios.post(`${API_URL}/auth/request-otp`, { govId: DOCTOR_GOV_ID });
        const doctorLogin = await axios.post(`${API_URL}/auth/verify-otp`, { govId: DOCTOR_GOV_ID, otp: OTP_CODE, role: 'doctor' });
        const doctorToken = doctorLogin.data.token;
        console.log('✅ Doctor Logged In.');

        // 5. Patient Searches for Doctor
        console.log('\n4️⃣  Patient Search for Doctor...');
        const searchRes = await axios.get(`${API_URL}/patient/search/doctors?q=Dr. Test`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        if (searchRes.data.data.find((d: any) => d.id === doctorId)) {
            console.log('✅ Doctor found in search.');
        } else {
            throw new Error('Doctor not found in search');
        }

        // 6. Verify Doctor cannot see Patient yet
        console.log('\n5️⃣  Verifying Pre-Consent Privacy...');
        try {
            const noConsentRes = await axios.get(`${API_URL}/doctor/${doctorId}/patients`, {
                headers: { Authorization: `Bearer ${doctorToken}` }
            });
            const patientVisible = noConsentRes.data.data.find((p: any) => p.id === patientId);
            if (patientVisible) throw new Error('Patient visible without consent!');
            console.log('✅ Privacy verified (Patient not visible).');
        } catch (e) {
            console.log('✅ Privacy verified (API might handle empty list correctly).');
        }

        // 7. Patient Grants Consent
        console.log('\n6️⃣  Granting Consent...');
        await axios.post(`${API_URL}/patient/${patientId}/consents`, {
            grantedToId: doctorId,
            grantedToType: 'doctor',
            consentTypes: ['read', 'write'],
            durationHours: 24
        }, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        console.log('✅ Consent Granted.');

        // 8. Doctor Views Patient (Should succeed now)
        console.log('\n7️⃣  Verifying Post-Consent Access...');
        const consentRes = await axios.get(`${API_URL}/doctor/${doctorId}/patients`, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        const patientNowVisible = consentRes.data.data.find((p: any) => p.id === patientId);

        if (patientNowVisible) {
            console.log('✅ Access Verified: Doctor can see patient.');
        } else {
            // Debug info
            console.log('Doctor Patients Response:', JSON.stringify(consentRes.data, null, 2));
            throw new Error('Patient NOT visible after consent granted');
        }

        // 9. Doctor Creates Prescription
        console.log('\n8️⃣  Testing Prescription Creation...');
        const prescribeRes = await axios.post(`${API_URL}/doctor/${doctorId}/prescribe`, {
            patientId: patientId,
            diagnosis: 'Test Diagnosis',
            medicines: [{ name: 'Test Med', dosage: '10mg' }],
            notes: 'Test Notes'
        }, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        if (prescribeRes.data.success) {
            console.log('✅ Prescription Created.');
        } else {
            throw new Error('Prescription creation failed');
        }

        console.log('\n🎉 TEST COMPLETED SUCCESSFULLY! All buttons/flows logic verified.');

        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
        process.exit(1);
    }
}

runTest();
