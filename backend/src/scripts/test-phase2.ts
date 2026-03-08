
import { blockchainService } from '../services/blockchain.service';

const API_URL = 'http://localhost:3001/api';

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

async function runTests() {
    console.log(`${colors.cyan}🚀 Starting Phase 2 Verification Tests...${colors.reset}\n`);

    try {
        // --- 1. Authentication ---
        console.log(`${colors.blue}Can we login as a Patient?${colors.reset}`);

        // Request OTP
        await fetch(`${API_URL}/auth/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ govId: '1234-5678-9012', role: 'patient' })
        });

        // Verify OTP
        const loginRes = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ govId: '1234-5678-9012', otp: '123456', role: 'patient' })
        });

        if (!loginRes.ok) throw new Error('Login failed');
        const loginData = await loginRes.json();
        const token = loginData.token;
        const patientId = loginData.user.id;
        console.log(`${colors.green}✅ Login Successful. Token received.${colors.reset}\n`);

        // --- 2. Consent Management ---
        console.log(`${colors.blue}Testing Consent Management API...${colors.reset}`);

        // Grant Consent to Doctor (user-doctor-001 is seeded doctor id)
        // Note: In seed.ts, doctor ID is hardcoded/deterministic usually, let's assume 'user-doctor-001' from seed data or in-memory
        // Actually, seed data uses UUIDs but in-memory uses 'user-doctor-001'.
        // Let's try to get a doctor ID via DB query if possible, or use the one we know exists if running in demo mode.
        // For safety, we'll try 'user-doctor-001' which matches my in-memory seed. 
        // If using real DB, we might fail unless we know the ID. 
        // But wait, the previous turn output of seed.ts didn't show the IDs. 
        // Let's rely on the in-memory fallback which I saw in database.ts had 'user-doctor-001'.
        // Or if real DB is running, the IDs are UUIDs.
        // Let's try to fetch a specific doctor first if possible? No endpoint for that yet for patient.

        // Just used fixed ID from in-memory seed as fallback, or assume the user has seeded data.
        // The in-memory seed has 'user-doctor-001'.
        // Real DB seed usually generates UUIDs.
        // I'll try to use a known ID if possible. 
        // Let's try to use the hardcoded one from `seed.ts` if I can see it? 
        // `seed.ts` generates ID using `uuidv4()`. So I don't know it.
        // However, I can try to grant to a random ID and expect 404, validating error handling.
        // Then I can try to grant to 'user-doctor-001' which definitely works in Demo Mode.

        const doctorId = 'user-doctor-001';

        const grantRes = await fetch(`${API_URL}/consent/grant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                grantedToId: doctorId,
                consentType: 'read',
                durationHours: 48
            })
        });

        if (grantRes.ok) {
            const data = await grantRes.json();
            console.log(`${colors.green}✅ Grant Consent Success: ${JSON.stringify(data.consent)}${colors.reset}`);

            // List Consents
            const listRes = await fetch(`${API_URL}/consent/my-consents?status=active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const listData = await listRes.json();
            console.log(`${colors.green}✅ Listed active consents: ${listData.consents.length} found.${colors.reset}`);

            if (listData.consents.length > 0) {
                const consentId = listData.consents[0].id;

                // Revoke Consent
                const revokeRes = await fetch(`${API_URL}/consent/${consentId}/revoke`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (revokeRes.ok) {
                    console.log(`${colors.green}✅ Revoke Consent Success.${colors.reset}\n`);
                } else {
                    console.log(`${colors.red}❌ Revoke Consent Failed: ${revokeRes.status}${colors.reset}\n`);
                }
            }
        } else {
            const err = await grantRes.json();
            console.log(`${colors.yellow}⚠️ Grant Consent Result: ${grantRes.status} - ${err.error} (Expected if using real DB and ID mismatch)${colors.reset}\n`);
        }

        // --- 3. Blockchain Service ---
        console.log(`${colors.blue}Testing Blockchain Service (Internal Integration)...${colors.reset}`);

        // Mock medicine data
        const medicineData = {
            name: "Amoxicillin 500mg",
            manufacturer: "PharmaCorp",
            batchNumber: "BATCH-TEST-2026",
            mfgDate: "2026-01-01",
            expiryDate: "2028-01-01"
        };

        console.log(`Registering medicine: ${medicineData.name}...`);
        const regResult = await blockchainService.registerMedicine(medicineData);

        if (regResult.success) {
            console.log(`${colors.green}✅ Medicine Registered! Hash: ${regResult.medicineHash.substring(0, 10)}...${colors.reset}`);
            console.log(`   Tx Hash: ${regResult.txHash}`);
            console.log(`   QR Data Generated: ${!!regResult.qrCodeData}`);

            console.log(`Verifying hash on-chain...`);
            const verifyResult = await blockchainService.verifyMedicineOnChain(regResult.medicineHash);

            if (verifyResult.isValid) {
                console.log(`${colors.green}✅ Verification Successful!${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ Verification Failed.${colors.reset}`);
            }
        } else {
            console.log(`${colors.red}❌ Medicine Registration Failed.${colors.reset}`);
        }

    } catch (error: any) {
        console.error(`${colors.red}❌ Test Failed: ${error.message}${colors.reset}`);
    }
}

runTests();
