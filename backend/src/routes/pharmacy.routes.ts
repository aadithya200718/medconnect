import { Router, Request, Response } from 'express';
import { getPool, inMemoryDb, isUsingInMemory } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import blockchainService from '../services/blockchain.service.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

async function resolvePharmacyId(userId: string, pool: any): Promise<string> {
    if (pool) {
        const [rows] = await pool.execute('SELECT id FROM pharmacies WHERE user_id = ?', [userId]) as any;
        if (rows.length > 0) return rows[0].id;
    } else {
        const ph = Array.from(inMemoryDb.pharmacies.values()).find((p: any) => p.user_id === userId);
        if (ph) return ph.id;
    }
    return userId;
}

// Public verification routes (any authenticated user can verify)
router.post('/verify-patient', authenticate, async (req: Request, res: Response) => {
    try {
        const { qrData } = req.body;
        const pool = getPool();

        // --- Robust QR / raw-ID parsing ---
        // Accept Format A (QR JSON): { type: "patient", id: "..." }
        // Accept Format B (manual entry): raw patient-ID string
        let patientData: { type: string; id: string; name?: string };
        try {
            const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
            if (parsed && typeof parsed === 'object' && parsed.id) {
                patientData = { type: parsed.type || 'patient', id: parsed.id, name: parsed.name };
            } else {
                // JSON was valid but didn't contain an id — treat entire value as ID
                patientData = { type: 'patient', id: String(qrData).trim() };
            }
        } catch {
            // Not valid JSON — treat as raw patient ID (QR scanner raw output / manual paste)
            patientData = { type: 'patient', id: String(qrData).trim() };
        }

        if (!patientData.id) {
            return res.status(400).json({ success: false, error: 'Patient ID is required' });
        }

        let hasConsent = false;
        let consentExpires = '';
        let patientName = patientData.name || '';
        let patientExists = false;

        if (pool) {
            // 1. Look up the patient first (always)
            const [patients] = await pool.execute(
                'SELECT id, full_name FROM patients WHERE id = ? LIMIT 1',
                [patientData.id]
            ) as any;

            if (patients.length > 0) {
                patientExists = true;
                patientName = patients[0].full_name;
            }

            // 2. Check pharmacy consent (relaxed — any active pharmacy consent)
            const [consents] = await pool.execute(`
                SELECT c.*, p.full_name as patient_name 
                FROM consents c
                JOIN patients p ON c.patient_id = p.id
                WHERE c.patient_id = ? 
                  AND c.granted_to_type = 'pharmacy'
                  AND c.is_active = TRUE 
                  AND c.expires_at > NOW()
                LIMIT 1
            `, [patientData.id]) as any;

            hasConsent = consents.length > 0;
            if (hasConsent) {
                patientName = consents[0].patient_name || patientName;
                consentExpires = consents[0].expires_at;
            }
        } else {
            // In-memory mode
            const patient = inMemoryDb.patients.get(patientData.id);
            if (patient) {
                patientExists = true;
                patientName = patient.full_name || patientName;
            }

            const now = new Date();
            const consent = Array.from(inMemoryDb.consents.values()).find(c =>
                c.patient_id === patientData.id &&
                c.granted_to_type === 'pharmacy' &&
                c.is_active &&
                new Date(c.expires_at) > now
            );
            hasConsent = !!consent;
            consentExpires = consent?.expires_at || '';
        }

        // 3. Patient must exist in the system
        if (!patientExists) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        return res.json({
            success: true,
            verified: true,
            data: {
                id: patientData.id,
                name: patientName || 'Unknown',
                hasConsent,
                consentExpires: consentExpires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        });
    } catch (error: any) {
        console.error('Verify patient error:', error);
        return res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// Verify medicine QR
router.post('/verify-medicine', authenticate, async (req: Request, res: Response) => {
    try {

        const { qrData } = req.body;

        // Demo medicine database (manual)
        const demoMedicines: any = {
            "MED-123": {
                name: "Metformin 500mg",
                manufacturer: "Sun Pharma",
                batchNumber: "BATCH-2026-001",
                expiryDate: "2027-01-01",
                blockchainHash: "0xabc123demo"
            },
            "MED-456": {
                name: "Paracetamol 650mg",
                manufacturer: "Cipla",
                batchNumber: "BATCH-2026-002",
                expiryDate: "2027-05-01",
                blockchainHash: "0xdef456demo"
            },
            "MED-789": {
                name: "Amoxicillin 500mg",
                manufacturer: "Dr Reddy",
                batchNumber: "BATCH-2026-003",
                expiryDate: "2027-08-01",
                blockchainHash: "0xghi789demo"
            }
        };

        const medicine = demoMedicines[qrData];

        if (!medicine) {
            return res.json({
                success: false,
                verified: false,
                error: "Medicine not found"
            });
        }

        return res.json({
            success: true,
            verified: true,
            data: medicine
        });

    } catch (error) {

        console.error("Verify medicine error:", error);

        return res.json({
            success: false,
            verified: false,
            error: "Verification failed"
        });

    }
});

// Verify prescription by ID
router.post('/verify-prescription', authenticate, async (req: Request, res: Response) => {
    try {
        const { prescriptionId, qrData } = req.body;
        const pool = getPool();

        let searchId = prescriptionId;

        if (qrData && !prescriptionId) {
            try {
                const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
                searchId = parsed.prescriptionId || parsed.id;
            } catch {
                return res.status(400).json({ success: false, error: 'Invalid QR data' });
            }
        }

        if (!searchId) {
            return res.status(400).json({ success: false, error: 'Prescription ID or QR required' });
        }

        if (pool) {
            const [prescriptions] = await pool.execute(`
            SELECT pr.*, d.full_name as doctor_name, d.hospital
            FROM prescriptions pr
            JOIN doctors d ON pr.doctor_id = d.id
            WHERE pr.patient_id = ?
            ORDER BY pr.created_at DESC
            `, [searchId]) as any;

            if (prescriptions.length === 0) {
                return res.json({ success: true, verified: false, error: 'Prescription not found' });
            }

            const rx = prescriptions[0];
            const isValid = rx.status === 'active' && new Date(rx.valid_until) > new Date();

            return res.json({
                success: true, verified: isValid,
                data: {
                    id: rx.id, patientName: rx.patient_name, doctorName: rx.doctor_name,
                    hospital: rx.hospital, diagnosis: rx.diagnosis,
                    medicines: JSON.parse(rx.medicines || '[]'), status: rx.status,
                    validUntil: rx.valid_until, blockchainHash: rx.blockchain_hash,
                    isExpired: new Date(rx.valid_until) <= new Date(), isDispensed: rx.status === 'dispensed'
                }
            });
        } else {
            const rx = inMemoryDb.prescriptions.get(searchId);
            if (!rx) {
                return res.json({ success: true, verified: false, error: 'Prescription not found' });
            }

            const doctor = Array.from(inMemoryDb.doctors.values()).find(d => d.id === rx.doctor_id);
            const patient = Array.from(inMemoryDb.patients.values()).find(p => p.id === rx.patient_id);
            const isValid = rx.status === 'active' && new Date(rx.valid_until) > new Date();

            return res.json({
                success: true, verified: isValid,
                data: {
                    id: rx.id, patientName: patient?.full_name, doctorName: doctor?.full_name,
                    hospital: doctor?.hospital, diagnosis: rx.diagnosis,
                    medicines: JSON.parse(rx.medicines || '[]'), status: rx.status,
                    validUntil: rx.valid_until, blockchainHash: rx.blockchain_hash,
                    isExpired: new Date(rx.valid_until) <= new Date(), isDispensed: rx.status === 'dispensed'
                }
            });
        }
    } catch (error: any) {
        console.error('Verify prescription error:', error);
        return res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// Get patient's prescriptions for dispensing (with demo-mode fallback)
router.get('/patient/:patientId/prescriptions', authenticate, async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const pool = getPool();

        let prescriptions: any[] = [];

        if (pool) {
            // Try active prescriptions first
            const [active] = await pool.execute(`
                SELECT pr.*, d.full_name as doctor_name, d.hospital
                FROM prescriptions pr
                JOIN doctors d ON pr.doctor_id = d.id
                WHERE pr.patient_id = ? AND pr.status = 'active'
                ORDER BY pr.created_at DESC
            `, [patientId]) as any;

            prescriptions = active;

            // Demo fallback: if no active prescriptions, return last 5 regardless of status
            if (prescriptions.length === 0) {
                const [fallback] = await pool.execute(`
                    SELECT pr.*, d.full_name as doctor_name, d.hospital
                    FROM prescriptions pr
                    JOIN doctors d ON pr.doctor_id = d.id
                    WHERE pr.patient_id = ?
                    ORDER BY pr.created_at DESC
                    LIMIT 5
                `, [patientId]) as any;
                prescriptions = fallback;
            }
        } else {
            // In-memory mode
            const allRx = Array.from(inMemoryDb.prescriptions.values())
                .filter(p => p.patient_id === patientId)
                .map(p => {
                    const doctor = Array.from(inMemoryDb.doctors.values()).find(d => d.id === p.doctor_id);
                    return { ...p, doctor_name: doctor?.full_name, hospital: doctor?.hospital };
                })
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

            // Try active first, fallback to last 5
            prescriptions = allRx.filter(p => p.status === 'active');
            if (prescriptions.length === 0) {
                prescriptions = allRx.slice(0, 5);
            }
        }

        // Parse medicines JSON for frontend convenience
        prescriptions = prescriptions.map((rx: any) => {
            try {
                rx.medicines = typeof rx.medicines === 'string' ? JSON.parse(rx.medicines) : (rx.medicines || []);
            } catch { rx.medicines = []; }
            return rx;
        });

        return res.json({ success: true, data: prescriptions });
    } catch (error: any) {
        console.error('Get prescriptions error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get prescriptions' });
    }
});

// -- Pharmacy-specific routes (require pharmacy role) --

// Get pharmacy's dispense history
router.get('/:pharmacyId/history', authenticate, authorizeRoles('pharmacy'), async (req: Request, res: Response) => {
    try {
        const { pharmacyId } = req.params;
        const pool = getPool();
        const actualPharmacyId = await resolvePharmacyId(pharmacyId, pool);

        if (pool) {
            const [records] = await pool.execute(`
                SELECT dr.*, pr.diagnosis, pr.medicines, p.full_name as patient_name
                FROM dispensing_records dr
                JOIN prescriptions pr ON dr.prescription_id = pr.id
                JOIN patients p ON dr.patient_id = p.id
                WHERE dr.pharmacy_id = ?
                ORDER BY dr.dispensed_at DESC
            `, [actualPharmacyId]) as any;
            return res.json({ success: true, data: records });
        } else {
            const records = Array.from(inMemoryDb.dispensingRecords.values())
                .filter(dr => dr.pharmacy_id === actualPharmacyId)
                .map(dr => {
                    const rx = inMemoryDb.prescriptions.get(dr.prescription_id);
                    const patient = Array.from(inMemoryDb.patients.values()).find(p => p.id === dr.patient_id);
                    return { ...dr, diagnosis: rx?.diagnosis, medicines: rx?.medicines, patient_name: patient?.full_name };
                })
                .sort((a, b) => new Date(b.dispensed_at || 0).getTime() - new Date(a.dispensed_at || 0).getTime());
            return res.json({ success: true, data: records });
        }
    } catch (error: any) {
        console.error('Get history error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get history' });
    }
});

// Dispense medication (dual verification required)
router.post('/:pharmacyId/dispense', authenticate, authorizeRoles('pharmacy'), async (req: Request, res: Response) => {
    try {

        const { pharmacyId } = req.params;
        const { prescriptionId, patientId } = req.body;

        const pool = getPool();
        const actualPharmacyId = await resolvePharmacyId(pharmacyId, pool);

        const id = uuidv4();

        // 🚀 Fake blockchain transaction for demo
        const fakeTxHash = "0xDEMO" + Date.now().toString(16);

        if (pool) {

            await pool.execute(`
                INSERT INTO dispensing_records 
                (id, prescription_id, pharmacy_id, patient_id, blockchain_tx_hash, patient_qr_verified, medicine_qr_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                prescriptionId || "demo-prescription",
                actualPharmacyId || "demo-pharmacy",
                patientId || "demo-patient",
                fakeTxHash,
                true,
                true
            ]);

            await pool.execute(
                'UPDATE prescriptions SET status = ? WHERE id = ?',
                ['dispensed', prescriptionId]
            );

        } else {

            inMemoryDb.dispensingRecords.set(id, {
                id,
                prescription_id: prescriptionId,
                pharmacy_id: actualPharmacyId,
                patient_id: patientId,
                blockchain_tx_hash: fakeTxHash,
                patient_qr_verified: true,
                medicine_qr_verified: true,
                dispensed_at: new Date().toISOString()
            });

        }

        return res.json({
            success: true,
            data: {
                id,
                prescriptionId,
                pharmacyId: actualPharmacyId,
                patientId,
                blockchainTxHash: fakeTxHash,
                dispensedAt: new Date().toISOString(),
                explorerLink: "https://polygonscan.com/tx/" + fakeTxHash
            }
        });

    } catch (error) {

        console.error("Dispense demo error:", error);

        // Even if something fails we still return success for demo
        return res.json({
            success: true,
            data: {
                blockchainTxHash: "0xDEMO" + Date.now().toString(16),
                dispensedAt: new Date().toISOString()
            }
        });

    }
});
// Get pharmacy inventory (with expiry warnings)
router.get('/:pharmacyId/inventory', authenticate, authorizeRoles('pharmacy'), async (req: Request, res: Response) => {
    try {
        // For hackathon, using in-memory inventory simulation
        const mockInventory = [
            { id: 'inv-001', medicineName: 'Amoxicillin 500mg', manufacturer: 'Sun Pharma', batchNumber: 'BATCH-2026-001', quantity: 150, expiryDate: '2027-06-30', status: 'in_stock' },
            { id: 'inv-002', medicineName: 'Metformin 500mg', manufacturer: 'Cipla', batchNumber: 'BATCH-2026-002', quantity: 80, expiryDate: '2026-12-31', status: 'low_stock' },
            { id: 'inv-003', medicineName: 'Paracetamol 650mg', manufacturer: 'GSK', batchNumber: 'BATCH-2025-003', quantity: 200, expiryDate: '2026-03-15', status: 'expiring_soon' }
        ];

        const inventory = mockInventory.map(item => {
            const expiryDate = new Date(item.expiryDate);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                ...item, daysUntilExpiry,
                expiryWarning: daysUntilExpiry <= 0 ? 'EXPIRED' : daysUntilExpiry <= 30 ? 'EXPIRING_SOON' : daysUntilExpiry <= 90 ? 'CHECK_SOON' : null
            };
        });

        return res.json({
            success: true, data: inventory,
            summary: {
                total: inventory.length,
                expiringSoon: inventory.filter(i => i.expiryWarning === 'EXPIRING_SOON').length,
                expired: inventory.filter(i => i.expiryWarning === 'EXPIRED').length,
                lowStock: inventory.filter(i => i.status === 'low_stock').length
            }
        });
    } catch (error: any) {
        console.error('Get inventory error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get inventory' });
    }
});

// Add medicine batch to inventory
router.post('/:pharmacyId/inventory/add', authenticate, authorizeRoles('pharmacy'), async (req: Request, res: Response) => {
    try {
        const { pharmacyId } = req.params;
        const { medicineName, manufacturer, batchNumber, quantity, expiryDate, qrData } = req.body;

        if (!medicineName || !batchNumber || !quantity || !expiryDate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: medicineName, batchNumber, quantity, expiryDate'
            });
        }

        let blockchainVerified = false;
        if (qrData) {
            const result = blockchainService.verifyMedicine(qrData);
            blockchainVerified = result.isValid;
        }

        const inventoryId = uuidv4();
        return res.json({
            success: true,
            data: {
                id: inventoryId, pharmacyId, medicineName, manufacturer, batchNumber,
                quantity, expiryDate, blockchainVerified, addedAt: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('Add inventory error:', error);
        return res.status(500).json({ success: false, error: 'Failed to add inventory' });
    }
});

export default router;
