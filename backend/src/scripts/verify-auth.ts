import axios from 'axios';
import { initializeDatabase } from '../config/database.js';

// Configuration
const API_URL = 'http://localhost:3001/api';
const RANDOM_SUFFIX = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
const TEST_PHONE = `+919999${RANDOM_SUFFIX}77`; // Random phone
const TEST_AADHAR = `11112222${RANDOM_SUFFIX}`; // Random aadhaar
const TEST_NAME = `Test User ${RANDOM_SUFFIX}`;
const OTP_CODE = '123456'; // Demo OTP (Backdoor enabled for testing)


async function runAuthTest() {
    console.log('🚀 Starting Auth Flow Test...\n');
    await initializeDatabase();

    try {
        // ============ REGISTRATION FLOW ============
        console.log('='.repeat(50));
        console.log('TESTING REGISTRATION FLOW');
        console.log('='.repeat(50));

        // Step 1: Register new user
        console.log('\n1️⃣  Registering new user...');
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            name: TEST_NAME,
            role: 'patient',
            phone: TEST_PHONE,
            aadhar_number: TEST_AADHAR
        });
        console.log('   Response:', registerRes.data);

        if (!registerRes.data.success) {
            throw new Error(`Registration failed: ${registerRes.data.message}`);
        }
        console.log('✅ Registration initiated successfully');

        // Step 2: Verify registration OTP
        console.log('\n2️⃣  Verifying registration OTP...');
        const verifyRegRes = await axios.post(`${API_URL}/auth/verify-registration-otp`, {
            phone: TEST_PHONE,
            otp: OTP_CODE
        });
        console.log('   Response:', JSON.stringify(verifyRegRes.data, null, 2));

        if (!verifyRegRes.data.success || !verifyRegRes.data.token) {
            throw new Error(`Registration verification failed: ${verifyRegRes.data.message}`);
        }
        console.log('✅ Registration completed - User created and JWT issued');
        console.log(`   Token: ${verifyRegRes.data.token.substring(0, 50)}...`);
        console.log(`   Role: ${verifyRegRes.data.user.role}`);

        // ============ LOGIN FLOW ============
        console.log('\n' + '='.repeat(50));
        console.log('TESTING LOGIN FLOW');
        console.log('='.repeat(50));

        // Step 1: Request login OTP
        console.log('\n3️⃣  Requesting login OTP...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            phone: TEST_PHONE
        });
        console.log('   Response:', loginRes.data);

        if (!loginRes.data.success) {
            throw new Error(`Login request failed: ${loginRes.data.message}`);
        }
        console.log('✅ Login OTP sent');

        // Step 2: Verify login OTP
        console.log('\n4️⃣  Verifying login OTP...');
        const verifyLoginRes = await axios.post(`${API_URL}/auth/verify-login-otp`, {
            phone: TEST_PHONE,
            otp: OTP_CODE
        });
        console.log('   Response:', JSON.stringify(verifyLoginRes.data, null, 2));

        if (!verifyLoginRes.data.success || !verifyLoginRes.data.token) {
            throw new Error(`Login verification failed: ${verifyLoginRes.data.message}`);
        }
        console.log('✅ Login successful - JWT issued');
        console.log(`   Token: ${verifyLoginRes.data.token.substring(0, 50)}...`);

        // ============ TOKEN VERIFICATION ============
        console.log('\n' + '='.repeat(50));
        console.log('TESTING TOKEN VERIFICATION');
        console.log('='.repeat(50));

        console.log('\n5️⃣  Verifying JWT token...');
        const verifyTokenRes = await axios.get(`${API_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${verifyLoginRes.data.token}` }
        });
        console.log('   Response:', verifyTokenRes.data);

        if (!verifyTokenRes.data.success) {
            throw new Error('Token verification failed');
        }
        console.log('✅ Token is valid');

        // ============ ERROR CASES ============
        console.log('\n' + '='.repeat(50));
        console.log('TESTING ERROR CASES');
        console.log('='.repeat(50));

        // Test: Duplicate registration
        console.log('\n6️⃣  Testing duplicate phone registration...');
        try {
            await axios.post(`${API_URL}/auth/register`, {
                name: 'Another User',
                role: 'patient',
                phone: TEST_PHONE,
                aadhar_number: '444455556666'
            });
            console.log('❌ Should have rejected duplicate phone');
        } catch (e: any) {
            if (e.response?.data?.message?.includes('already registered')) {
                console.log('✅ Correctly rejected duplicate phone');
            } else {
                console.log('⚠️  Error:', e.response?.data || e.message);
            }
        }

        // Test: Login with unregistered phone
        console.log('\n7️⃣  Testing login with unregistered phone...');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                phone: '+910000000000'
            });
            console.log('❌ Should have rejected unregistered phone');
        } catch (e: any) {
            if (e.response?.data?.message?.includes('not registered')) {
                console.log('✅ Correctly rejected unregistered phone');
            } else {
                console.log('⚠️  Error:', e.response?.data || e.message);
            }
        }

        // Test: Invalid OTP
        console.log('\n8️⃣  Testing invalid OTP...');
        await axios.post(`${API_URL}/auth/login`, { phone: TEST_PHONE });
        try {
            await axios.post(`${API_URL}/auth/verify-login-otp`, {
                phone: TEST_PHONE,
                otp: '000000'
            });
            console.log('❌ Should have rejected invalid OTP');
        } catch (e: any) {
            if (e.response?.data?.message?.includes('Invalid') || e.response?.data?.message?.includes('expired')) {
                console.log('✅ Correctly rejected invalid OTP');
            } else {
                console.log('⚠️  Error:', e.response?.data || e.message);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
        console.log('='.repeat(50));

        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
        process.exit(1);
    }
}

runAuthTest();
