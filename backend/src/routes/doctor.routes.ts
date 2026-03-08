import { Router, Request, Response } from 'express';
import { getPool, inMemoryDb, isUsingInMemory } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import blockchainService from '../services/blockchain.service.js';
import aiAgentService from '../services/ai-agent.service.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

// All doctor routes require authentication as doctor
router.use(authenticate, authorizeRoles('doctor'));

async function resolveDoctorId(userId: string, pool: any): Promise<string> {
    if (pool) {
        const [rows] = await pool.execute('SELECT id FROM doctors WHERE user_id = ?', [userId]) as any;
        if (rows.length > 0) return rows[0].id;
    } else {
        const d = Array.from(inMemoryDb.doctors.values()).find((d: any) => d.user_id === userId);
        if (d) return d.id;
    }
    return userId;
}

// Get doctor's patients (with active consent)
router.get('/:doctorId/patients', async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const pool = getPool();
        const actualDoctorId = await resolveDoctorId(doctorId, pool);

        if (pool) {
            const [patients] = await pool.execute(`
                SELECT DISTINCT p.*, c.consent_types, c.expires_at, c.created_at
                FROM patients p
                JOIN consents c ON p.id = c.patient_id
                WHERE c.granted_to_id = ? 
                  AND c.granted_to_type = 'doctor'
                  AND c.is_active = TRUE 
                  AND c.expires_at > NOW()
                ORDER BY c.created_at DESC
            `, [actualDoctorId]) as any;
            return res.json({ success: true, data: patients });
        } else {
            const now = new Date();
            const consentsForDoctor = Array.from(inMemoryDb.consents.values())
                .filter(c =>
                    c.granted_to_id === actualDoctorId &&
                    (c.granted_to_type === 'doctor') &&
                    c.is_active &&
                    new Date(c.expires_at) > now
                );

            const patientIds = [...new Set(consentsForDoctor.map(c => c.patient_id))];
            const patients = patientIds.map(pid => {
                const patient = Array.from(inMemoryDb.patients.values()).find(p => p.id === pid);
                const consent = consentsForDoctor.find(c => c.patient_id === pid);
                if (!patient) return null;
                return { ...patient, consent_types: consent?.consent_types, expires_at: consent?.expires_at, created_at: consent?.created_at };
            }).filter(Boolean);

            return res.json({ success: true, data: patients });
        }
    } catch (error: any) {
        console.error('Get patients error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get patients' });
    }
});

// Get doctor's prescriptions
router.get('/:doctorId/prescriptions', async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const pool = getPool();
        const actualDoctorId = await resolveDoctorId(doctorId, pool);

        if (pool) {
            const [prescriptions] = await pool.execute(`
                SELECT pr.*, p.full_name as patient_name
                FROM prescriptions pr
                JOIN patients p ON pr.patient_id = p.id
                WHERE pr.doctor_id = ?
                ORDER BY pr.created_at DESC
            `, [actualDoctorId]) as any;
            return res.json({ success: true, data: prescriptions });
        } else {
            const prescriptions = Array.from(inMemoryDb.prescriptions.values())
                .filter(p => p.doctor_id === actualDoctorId)
                .map(p => {
                    const patient = Array.from(inMemoryDb.patients.values()).find(pt => pt.id === p.patient_id);
                    return { ...p, patient_name: patient?.full_name };
                })
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            return res.json({ success: true, data: prescriptions });
        }
    } catch (error: any) {
        console.error('Get prescriptions error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get prescriptions' });
    }
});

// Issue prescription
router.post('/:doctorId/prescribe', async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const { patientId, diagnosis, medicines, notes, validDays = 30 } = req.body;
        const pool = getPool();
        const actualDoctorId = await resolveDoctorId(doctorId, pool);

        // Verify consent exists
        let hasConsent = false;
        if (pool) {
            const [consents] = await pool.execute(`
                SELECT * FROM consents 
                WHERE patient_id = ? 
                  AND granted_to_id = ? 
                  AND granted_to_type = 'doctor'
                  AND is_active = TRUE 
                  AND expires_at > NOW()
                  AND JSON_CONTAINS(consent_types, '"write"')
            `, [patientId, actualDoctorId]) as any;
            hasConsent = consents.length > 0;
        } else {
            const now = new Date();
            hasConsent = Array.from(inMemoryDb.consents.values()).some(c =>
                c.patient_id === patientId &&
                c.granted_to_id === actualDoctorId &&
                (c.granted_to_type === 'doctor') &&
                c.is_active &&
                new Date(c.expires_at) > now &&
                (Array.isArray(c.consent_types) ? c.consent_types.includes('write') : c.consent_type === 'write')
            );
        }

        // if (!hasConsent) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'No valid consent from patient for prescribing'
        //     });
        // }

        const id = uuidv4();
        const prescriptionDate = new Date();
        const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

        // Generate blockchain hash
        const blockchainHash = blockchainService.generatePrescriptionHash({
            patientId, doctorId: actualDoctorId, diagnosis, medicines, timestamp: Date.now()
        });

        // Record on blockchain
        const txResult = await blockchainService.recordPrescription(blockchainHash);

        if (pool) {
            await pool.execute(`
                INSERT INTO prescriptions (id, patient_id, doctor_id, diagnosis, medicines, blockchain_hash, prescription_date, valid_until, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, patientId, actualDoctorId, diagnosis, JSON.stringify(medicines), txResult.txHash || blockchainHash, prescriptionDate, validUntil, notes || null]);
        } else {
            inMemoryDb.prescriptions.set(id, {
                id, patient_id: patientId, doctor_id: actualDoctorId,
                diagnosis, medicines: JSON.stringify(medicines),
                blockchain_hash: txResult.txHash || blockchainHash,
                status: 'active', prescription_date: prescriptionDate.toISOString(),
                valid_until: validUntil.toISOString(), notes: notes || null,
                created_at: new Date().toISOString()
            });
        }

        return res.json({
            success: true,
            data: {
                id, patientId, doctorId: actualDoctorId, diagnosis, medicines,
                blockchainHash: txResult.txHash || blockchainHash,
                status: 'active', prescriptionDate, validUntil
            }
        });
    } catch (error: any) {
        console.error('Issue prescription error:', error);
        return res.status(500).json({ success: false, error: 'Failed to issue prescription' });
    }
});

// Search patients by name or ID
router.get('/:doctorId/search-patients', async (req: Request, res: Response) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ success: false, error: 'Search query required' });
        }

        const pool = getPool();

        if (pool) {
            const [patients] = await pool.execute(`
                SELECT p.id, p.full_name, u.aadhar_number,
                       EXISTS(
                           SELECT 1 FROM consents c 
                           WHERE c.patient_id = p.id AND c.is_active = TRUE AND c.expires_at > NOW()
                       ) as has_consent
                FROM patients p
                JOIN users u ON p.user_id = u.id
                WHERE p.full_name LIKE ? OR u.aadhar_number LIKE ?
                LIMIT 10
            `, [`%${query}%`, `%${query}%`]) as any;
            return res.json({ success: true, data: patients });
        } else {
            const queryLower = query.toLowerCase();
            const patients = Array.from(inMemoryDb.patients.values())
                .filter(p => p.full_name.toLowerCase().includes(queryLower))
                .slice(0, 10)
                .map(p => {
                    const user = Array.from(inMemoryDb.users.values()).find(u => u.id === p.user_id);
                    const hasConsent = Array.from(inMemoryDb.consents.values()).some(c =>
                        c.patient_id === p.id && c.is_active && new Date(c.expires_at) > new Date()
                    );
                    return { id: p.id, full_name: p.full_name, aadhar_number: user?.aadhar_number, has_consent: hasConsent };
                });
            return res.json({ success: true, data: patients });
        }
    } catch (error: any) {
        console.error('Search patients error:', error);
        return res.status(500).json({ success: false, error: 'Search failed' });
    }
});

// Get patient medical history (requires read consent)
router.get('/:doctorId/patient/:patientId/history', async (req: Request, res: Response) => {
    try {
        const { doctorId, patientId } = req.params;
        const pool = getPool();
        const actualDoctorId = await resolveDoctorId(doctorId, pool);

        // Verify consent
        let hasConsent = false;
        if (pool) {
            const [consents] = await pool.execute(`
                SELECT * FROM consents 
                WHERE patient_id = ? 
                  AND granted_to_id = ? 
                  AND granted_to_type = 'doctor'
                  AND is_active = TRUE 
                  AND expires_at > NOW()
                  AND JSON_CONTAINS(consent_types, '"read"')
            `, [patientId, actualDoctorId]) as any;
            hasConsent = consents.length > 0;
        } else {
            hasConsent = Array.from(inMemoryDb.consents.values()).some(c =>
                c.patient_id === patientId &&
                c.granted_to_id === actualDoctorId &&
                c.is_active &&
                new Date(c.expires_at) > new Date() &&
                (Array.isArray(c.consent_types) ? c.consent_types.includes('read') : c.consent_type === 'read')
            );
        }

        if (!hasConsent) {
            return res.status(403).json({ success: false, error: 'No valid read consent from patient' });
        }

        if (pool) {
            const [patients] = await pool.execute(`
                SELECT p.*, u.aadhar_number 
                FROM patients p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [patientId]) as any;

            if (patients.length === 0) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }

            const [prescriptions] = await pool.execute(`
                SELECT pr.*, d.full_name as doctor_name, d.hospital
                FROM prescriptions pr
                JOIN doctors d ON pr.doctor_id = d.id
                WHERE pr.patient_id = ?
                ORDER BY pr.prescription_date DESC LIMIT 50
            `, [patientId]) as any;

            return res.json({
                success: true,
                data: {
                    patient: {
                        id: patients[0].id, fullName: patients[0].full_name,
                        bloodGroup: patients[0].blood_group,
                        allergies: JSON.parse(patients[0].allergies || '[]'),
                        chronicConditions: JSON.parse(patients[0].chronic_conditions || '[]')
                    },
                    prescriptions
                }
            });
        } else {
            const patient = Array.from(inMemoryDb.patients.values()).find(p => p.id === patientId);
            if (!patient) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }

            const prescriptions = Array.from(inMemoryDb.prescriptions.values())
                .filter(p => p.patient_id === patientId)
                .map(p => {
                    const doctor = Array.from(inMemoryDb.doctors.values()).find(d => d.id === p.doctor_id);
                    return { ...p, doctor_name: doctor?.full_name, hospital: doctor?.hospital };
                })
                .sort((a, b) => new Date(b.prescription_date || 0).getTime() - new Date(a.prescription_date || 0).getTime())
                .slice(0, 50);

            return res.json({
                success: true,
                data: {
                    patient: {
                        id: patient.id, fullName: patient.full_name,
                        bloodGroup: patient.blood_group,
                        allergies: JSON.parse(patient.allergies || '[]'),
                        chronicConditions: JSON.parse(patient.chronic_conditions || '[]')
                    },
                    prescriptions
                }
            });
        }
    } catch (error: any) {
        console.error('Get patient history error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get patient history' });
    }
});

// Known drug interactions (simplified for hackathon)
const DRUG_INTERACTIONS: Record<string, string[]> = {
    'warfarin': ['aspirin', 'ibuprofen', 'naproxen'],
    'metformin': ['alcohol', 'contrast dye'],
    'lisinopril': ['potassium', 'spironolactone'],
    'simvastatin': ['erythromycin', 'clarithromycin', 'grapefruit'],
    'aspirin': ['warfarin', 'ibuprofen', 'clopidogrel']
};

// Check drug interactions
function checkDrugInteractions(medicines: any[]): { hasInteraction: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const medicineNames = medicines.map(m => (m.name || m.medicineName || '').toLowerCase());

    for (const med of medicineNames) {
        const interactions = DRUG_INTERACTIONS[med];
        if (interactions) {
            for (const otherMed of medicineNames) {
                if (interactions.includes(otherMed)) {
                    warnings.push(`⚠️ Interaction: ${med} + ${otherMed}`);
                }
            }
        }
    }

    return { hasInteraction: warnings.length > 0, warnings };
}

// Check patient allergies against prescribed medicines
function checkAllergies(medicines: any[], allergies: string[]): { hasAllergy: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const allergyList = allergies.map(a => a.toLowerCase());

    for (const med of medicines) {
        const medName = (med.name || med.medicineName || '').toLowerCase();
        const genericName = (med.genericName || '').toLowerCase();

        for (const allergy of allergyList) {
            if (medName.includes(allergy) || genericName.includes(allergy) || allergy.includes(medName)) {
                warnings.push(`🚨 ALLERGY: Patient allergic to ${allergy}, prescribed ${medName}`);
            }
        }
    }

    return { hasAllergy: warnings.length > 0, warnings };
}

// Enhanced prescribe with safety checks
router.post('/:doctorId/prescribe-safe', async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const { patientId, diagnosis, medicines, notes, validDays = 30, forceCreate = false } = req.body;
        const pool = getPool();
        const actualDoctorId = await resolveDoctorId(doctorId, pool);

        // Verify write consent
        let hasConsent = false;
        if (pool) {
            const [consents] = await pool.execute(`
                SELECT * FROM consents 
                WHERE patient_id = ? 
                  AND granted_to_id = ? 
                  AND granted_to_type = 'doctor'
                  AND is_active = TRUE 
                  AND expires_at > NOW()
                  AND JSON_CONTAINS(consent_types, '"write"')
            `, [patientId, actualDoctorId]) as any;
            hasConsent = consents.length > 0;
        } else {
            hasConsent = Array.from(inMemoryDb.consents.values()).some(c =>
                c.patient_id === patientId &&
                c.granted_to_id === actualDoctorId &&
                c.is_active &&
                new Date(c.expires_at) > new Date() &&
                (Array.isArray(c.consent_types) ? c.consent_types.includes('write') : c.consent_type === 'write')
            );
        }

        // if (!hasConsent) {
        //     return res.status(403).json({ success: false, error: 'No valid consent from patient for prescribing' });
        // }

        // Get patient allergies and chronic conditions
        let patientAllergies: string[] = [];
        let chronicConditions: string[] = [];
        if (pool) {
            const [patients] = await pool.execute('SELECT allergies, chronic_conditions FROM patients WHERE id = ?', [patientId]) as any;
            patientAllergies = JSON.parse(patients[0]?.allergies || '[]');
            chronicConditions = JSON.parse(patients[0]?.chronic_conditions || '[]');
        } else {
            const patient = Array.from(inMemoryDb.patients.values()).find(p => p.id === patientId);
            patientAllergies = JSON.parse(patient?.allergies || '[]');
            chronicConditions = JSON.parse(patient?.chronic_conditions || '[]');
        }

        // AI-powered drug safety analysis
        const safetyResult = await aiAgentService.analyzeDrugSafety({
            medicines,
            patientAllergies,
            chronicConditions,
            existingMedications: []
        });

        const allWarnings = [...safetyResult.warnings, ...safetyResult.interactions];

        // If warnings exist and forceCreate is false, return warnings for confirmation
        if (!safetyResult.safe && !forceCreate) {
            return res.status(200).json({
                success: false,
                requiresConfirmation: true,
                warnings: allWarnings,
                suggestions: safetyResult.suggestions,
                aiPowered: safetyResult.aiPowered,
                message: 'Safety warnings detected. Set forceCreate=true to proceed.'
            });
        }

        // Proceed with prescription creation
        const id = uuidv4();
        const prescriptionDate = new Date();
        const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

        const blockchainHash = blockchainService.generatePrescriptionHash({
            patientId, doctorId: actualDoctorId, diagnosis, medicines, timestamp: Date.now()
        });

        const txResult = await blockchainService.recordPrescription(blockchainHash);

        // Record AI safety attestation on blockchain
        if (safetyResult.attestationHash) {
            await blockchainService.recordSafetyAttestation(blockchainHash, safetyResult.attestationHash);
        }

        if (pool) {
            await pool.execute(`
                INSERT INTO prescriptions (id, patient_id, doctor_id, diagnosis, medicines, blockchain_hash, prescription_date, valid_until, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, patientId, actualDoctorId, diagnosis, JSON.stringify(medicines), txResult.txHash || blockchainHash, prescriptionDate, validUntil, notes || null]);
        } else {
            inMemoryDb.prescriptions.set(id, {
                id, patient_id: patientId, doctor_id: actualDoctorId,
                diagnosis, medicines: JSON.stringify(medicines),
                blockchain_hash: txResult.txHash || blockchainHash,
                status: 'active', prescription_date: prescriptionDate.toISOString(),
                valid_until: validUntil.toISOString(), notes: notes || null,
                created_at: new Date().toISOString()
            });
        }

        return res.json({
            success: true,
            data: {
                id, patientId, doctorId: actualDoctorId, diagnosis, medicines,
                blockchainHash: txResult.txHash || blockchainHash,
                status: 'active', prescriptionDate, validUntil,
                safetyWarnings: allWarnings,
                safetyAttestationHash: safetyResult.attestationHash,
                aiPowered: safetyResult.aiPowered
            }
        });
    } catch (error: any) {
        console.error('Safe prescribe error:', error);
        return res.status(500).json({ success: false, error: 'Failed to issue prescription' });
    }
});

export default router;
