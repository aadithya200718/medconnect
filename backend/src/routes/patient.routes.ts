import { Router, Request, Response } from 'express';
import { getPool, inMemoryDb, isUsingInMemory } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import blockchainService from '../services/blockchain.service.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

async function resolvePatientId(id: string, pool: any): Promise<string> {
    try {
        if (pool) {

            // 1️⃣ Check if the ID is already a patient ID
            const [patientRows] = await pool.execute(
                'SELECT id FROM patients WHERE id = ?',
                [id]
            ) as any;

            if (patientRows.length > 0) {
                return patientRows[0].id;
            }

            // 2️⃣ Otherwise check if it's a user ID
            const [userRows] = await pool.execute(
                'SELECT id FROM patients WHERE user_id = ?',
                [id]
            ) as any;

            if (userRows.length > 0) {
                return userRows[0].id;
            }

        } else {
            // In-memory fallback

            const patient = inMemoryDb.patients.get(id);
            if (patient) return patient.id;

            const p = Array.from(inMemoryDb.patients.values()).find(
                (p: any) => p.user_id === id
            );

            if (p) return p.id;
        }

        return id;

    } catch (err) {
        console.error("resolvePatientId error:", err);
        return id;
    }
}

// All patient routes require authentication as patient
router.use(authenticate, authorizeRoles('patient'));

// Get patient profile
router.get('/profile/:patientId', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            const [rows] = await pool.execute(`
                SELECT p.*, u.email, u.phone, u.aadhar_number, u.wallet_address, u.is_phone_verified, u.created_at
                FROM patients p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [actualPatientId]) as any;

            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }
            return res.json({ success: true, data: rows[0] });
        } else {
            // In-memory fallback
            const patient = inMemoryDb.patients.get(actualPatientId);
            if (!patient) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }
            const user = Array.from(inMemoryDb.users.values()).find(u => u.id === patient.user_id);
            return res.json({
                success: true,
                data: { ...patient, phone: user?.phone, aadhar_number: user?.aadhar_number, is_phone_verified: user?.is_phone_verified, created_at: user?.created_at }
            });
        }
    } catch (error: any) {
        console.error('Get patient profile error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
});

// Get patient prescriptions
router.get('/:patientId/prescriptions', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            const [prescriptions] = await pool.execute(`
                SELECT p.*, d.full_name as doctor_name, d.specialization, d.hospital
                FROM prescriptions p
                JOIN doctors d ON p.doctor_id = d.id
                WHERE p.patient_id = ?
                ORDER BY p.created_at DESC
            `, [actualPatientId]) as any;
            return res.json({ success: true, data: prescriptions });
        } else {
            const prescriptions = Array.from(inMemoryDb.prescriptions.values())
                .filter(p => p.patient_id === actualPatientId)
                .map(p => {
                    const doctor = Array.from(inMemoryDb.doctors.values()).find(d => d.id === p.doctor_id);
                    return { ...p, doctor_name: doctor?.full_name, specialization: doctor?.specialization, hospital: doctor?.hospital };
                })
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            return res.json({ success: true, data: prescriptions });
        }
    } catch (error: any) {
        console.error('Get prescriptions error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get prescriptions' });
    }
});

// Get patient consents
router.get('/:patientId/consents', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            const [consents] = await pool.execute(`
                SELECT c.*, 
                       CASE 
                           WHEN c.granted_to_type = 'doctor' THEN d.full_name
                           WHEN c.granted_to_type = 'pharmacy' THEN ph.pharmacy_name
                       END as granted_to_name
                FROM consents c
                LEFT JOIN doctors d ON c.granted_to_id = d.id AND c.granted_to_type = 'doctor'
                LEFT JOIN pharmacies ph ON c.granted_to_id = ph.id AND c.granted_to_type = 'pharmacy'
                WHERE c.patient_id = ?
                ORDER BY c.created_at DESC
            `, [actualPatientId]) as any;
            return res.json({ success: true, data: consents });
        } else {
            const consents = Array.from(inMemoryDb.consents.values())
                .filter(c => c.patient_id === actualPatientId)
                .map(c => {
                    let granted_to_name = '';
                    if (c.granted_to_type === 'doctor') {
                        const doctor = Array.from(inMemoryDb.doctors.values()).find(d => d.id === c.granted_to_id);
                        granted_to_name = doctor?.full_name || '';
                    } else if (c.granted_to_type === 'pharmacy') {
                        const pharmacy = Array.from(inMemoryDb.pharmacies.values()).find(p => p.id === c.granted_to_id);
                        granted_to_name = pharmacy?.pharmacy_name || '';
                    }
                    return { ...c, granted_to_name };
                });
            return res.json({ success: true, data: consents });
        }
    } catch (error: any) {
        console.error('Get consents error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get consents' });
    }
});

// Grant consent (24-hour toggle)
router.post('/:patientId/consents', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const { grantedToId, grantedToType, consentTypes, durationHours = 24 } = req.body;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        let parsedDuration = Number(durationHours);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
            parsedDuration = 24; // Default to 24 hours if invalid
        }

        const id = uuidv4();
        const expiresAt = new Date(Date.now() + parsedDuration * 60 * 60 * 1000);

        if (pool) {
            const cType = Array.isArray(consentTypes) ? consentTypes[0] : consentTypes;
            await pool.execute(`
                INSERT INTO consents (id, patient_id, granted_to_id, granted_to_type, consent_type, consent_types, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [id, actualPatientId, grantedToId, grantedToType, cType, JSON.stringify(consentTypes), expiresAt]);
        } else {
            inMemoryDb.consents.set(id, {
                id,
                patient_id: actualPatientId,
                granted_to_id: grantedToId,
                granted_to_type: grantedToType,
                consent_types: consentTypes,
                consent_type: Array.isArray(consentTypes) ? consentTypes[0] : consentTypes,
                expires_at: expiresAt.toISOString(),
                is_active: true,
                created_at: new Date().toISOString()
            });
        }

        return res.json({
            success: true,
            data: { id, patientId, grantedToId, grantedToType, consentTypes, expiresAt, isActive: true }
        });
    } catch (error: any) {
        console.error('Grant consent error:', error);
        return res.status(500).json({ success: false, error: 'Failed to grant consent' });
    }
});

// Revoke consent
router.delete('/:patientId/consents/:consentId', async (req: Request, res: Response) => {
    try {
        const { patientId, consentId } = req.params;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            await pool.execute(`
                UPDATE consents SET is_active = FALSE WHERE id = ? AND patient_id = ?
            `, [consentId, actualPatientId]);
        } else {
            const consent = inMemoryDb.consents.get(consentId);
            if (consent && consent.patient_id === actualPatientId) {
                consent.is_active = false;
            }
        }

        return res.json({ success: true, message: 'Consent revoked' });
    } catch (error: any) {
        console.error('Revoke consent error:', error);
        return res.status(500).json({ success: false, error: 'Failed to revoke consent' });
    }
});

// Generate patient QR data
router.get('/:patientId/qr', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            const [rows] = await pool.execute(`
                SELECT p.id, p.full_name, p.qr_identity_hash, u.aadhar_number
                FROM patients p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [actualPatientId]) as any;

            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }

            const qrData = {
                type: 'patient',
                id: rows[0].id,
                name: rows[0].full_name,
                hash: rows[0].qr_identity_hash,
                timestamp: Date.now()
            };
            return res.json({ success: true, data: qrData });
        } else {
            const patient = inMemoryDb.patients.get(actualPatientId);
            if (!patient) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }
            const qrData = {
                type: 'patient',
                id: patient.id,
                name: patient.full_name,
                hash: patient.qr_identity_hash,
                timestamp: Date.now()
            };
            return res.json({ success: true, data: qrData });
        }
    } catch (error: any) {
        console.error('Generate QR error:', error);
        return res.status(500).json({ success: false, error: 'Failed to generate QR' });
    }
});

// Search doctors
router.get('/search/doctors', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string || '';
        const pool = getPool();

        if (pool) {
            const [doctors] = await pool.execute(`
                SELECT id, full_name, specialization, hospital 
                FROM doctors 
                WHERE full_name LIKE ? OR specialization LIKE ?
                LIMIT 10
            `, [`%${query}%`, `%${query}%`]) as any;
            return res.json({ success: true, data: doctors });
        } else {
            const queryLower = query.toLowerCase();
            const doctors = Array.from(inMemoryDb.doctors.values())
                .filter(d =>
                    d.full_name.toLowerCase().includes(queryLower) ||
                    (d.specialization || '').toLowerCase().includes(queryLower)
                )
                .slice(0, 10)
                .map(d => ({ id: d.id, full_name: d.full_name, specialization: d.specialization, hospital: d.hospital }));
            return res.json({ success: true, data: doctors });
        }
    } catch (error: any) {
        return res.status(500).json({ success: false, error: 'Failed to search doctors' });
    }
});

// Search pharmacies
router.get('/search/pharmacies', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string || '';
        const pool = getPool();

        if (pool) {
            const [pharmacies] = await pool.execute(`
                SELECT id, pharmacy_name, address 
                FROM pharmacies 
                WHERE pharmacy_name LIKE ? OR address LIKE ?
                LIMIT 10
            `, [`%${query}%`, `%${query}%`]) as any;
            return res.json({ success: true, data: pharmacies });
        } else {
            const queryLower = query.toLowerCase();
            const pharmacies = Array.from(inMemoryDb.pharmacies.values())
                .filter(p =>
                    p.pharmacy_name.toLowerCase().includes(queryLower) ||
                    (p.address || '').toLowerCase().includes(queryLower)
                )
                .slice(0, 10)
                .map(p => ({ id: p.id, pharmacy_name: p.pharmacy_name, address: p.address }));
            return res.json({ success: true, data: pharmacies });
        }
    } catch (error: any) {
        return res.status(500).json({ success: false, error: 'Failed to search pharmacies' });
    }
});

// Get medical history (paginated)
router.get('/:patientId/medical-history', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            const [records] = await pool.execute(`
                SELECT 
                    pr.id, pr.diagnosis, pr.medicines, pr.prescription_date, pr.status,
                    pr.blockchain_hash, d.full_name as doctor_name, d.hospital,
                    dr.dispensed_at, ph.pharmacy_name
                FROM prescriptions pr
                JOIN doctors d ON pr.doctor_id = d.id
                LEFT JOIN dispensing_records dr ON pr.id = dr.prescription_id
                LEFT JOIN pharmacies ph ON dr.pharmacy_id = ph.id
                WHERE pr.patient_id = ?
                ORDER BY pr.prescription_date DESC
                LIMIT ? OFFSET ?
            `, [actualPatientId, limit, offset]) as any;

            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM prescriptions WHERE patient_id = ?',
                [actualPatientId]
            ) as any;

            return res.json({
                success: true,
                data: records,
                pagination: { page, limit, total: countResult[0]?.total || 0, hasMore: offset + records.length < (countResult[0]?.total || 0) }
            });
        } else {
            const allPrescriptions = Array.from(inMemoryDb.prescriptions.values())
                .filter(p => p.patient_id === actualPatientId)
                .sort((a, b) => new Date(b.prescription_date || 0).getTime() - new Date(a.prescription_date || 0).getTime());

            const total = allPrescriptions.length;
            const records = allPrescriptions.slice(offset, offset + limit).map(pr => {
                const doctor = Array.from(inMemoryDb.doctors.values()).find(d => d.id === pr.doctor_id);
                const dispense = Array.from(inMemoryDb.dispensingRecords.values()).find(dr => dr.prescription_id === pr.id);
                const pharmacy = dispense ? Array.from(inMemoryDb.pharmacies.values()).find(p => p.id === dispense.pharmacy_id) : null;
                return {
                    ...pr,
                    doctor_name: doctor?.full_name,
                    hospital: doctor?.hospital,
                    dispensed_at: dispense?.dispensed_at,
                    pharmacy_name: pharmacy?.pharmacy_name
                };
            });

            return res.json({
                success: true,
                data: records,
                pagination: { page, limit, total, hasMore: offset + records.length < total }
            });
        }
    } catch (error: any) {
        console.error('Get medical history error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get medical history' });
    }
});

// Get active prescriptions only
router.get('/:patientId/active-prescriptions', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            const [prescriptions] = await pool.execute(`
                SELECT pr.*, d.full_name as doctor_name, d.specialization, d.hospital
                FROM prescriptions pr
                JOIN doctors d ON pr.doctor_id = d.id
                WHERE pr.patient_id = ? 
                  AND pr.status = 'active' 
                  AND pr.valid_until > NOW()
                ORDER BY pr.prescription_date DESC
            `, [actualPatientId]) as any;
            return res.json({ success: true, data: prescriptions });
        } else {
            const now = new Date();
            const prescriptions = Array.from(inMemoryDb.prescriptions.values())
                .filter(p => p.patient_id === actualPatientId && p.status === 'active' && new Date(p.valid_until) > now)
                .map(p => {
                    const doctor = Array.from(inMemoryDb.doctors.values()).find(d => d.id === p.doctor_id);
                    return { ...p, doctor_name: doctor?.full_name, specialization: doctor?.specialization, hospital: doctor?.hospital };
                })
                .sort((a, b) => new Date(b.prescription_date || 0).getTime() - new Date(a.prescription_date || 0).getTime());
            return res.json({ success: true, data: prescriptions });
        }
    } catch (error: any) {
        console.error('Get active prescriptions error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get active prescriptions' });
    }
});

// Update patient profile
router.put('/profile/:patientId', async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const { allergies, chronicConditions, bloodGroup, emergencyContact } = req.body;
        const pool = getPool();
        const actualPatientId = await resolvePatientId(patientId, pool);

        if (pool) {
            const updates: string[] = [];
            const values: any[] = [];

            if (allergies !== undefined) { updates.push('allergies = ?'); values.push(JSON.stringify(allergies)); }
            if (chronicConditions !== undefined) { updates.push('chronic_conditions = ?'); values.push(JSON.stringify(chronicConditions)); }
            if (bloodGroup !== undefined) { updates.push('blood_group = ?'); values.push(bloodGroup); }
            if (emergencyContact !== undefined) { updates.push('emergency_contact = ?'); values.push(emergencyContact); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, error: 'No fields to update' });
            }

            values.push(actualPatientId);
            await pool.execute(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`, values);
        } else {
            const patient = inMemoryDb.patients.get(actualPatientId);
            if (!patient) {
                return res.status(404).json({ success: false, error: 'Patient not found' });
            }
            if (allergies !== undefined) patient.allergies = JSON.stringify(allergies);
            if (chronicConditions !== undefined) patient.chronic_conditions = JSON.stringify(chronicConditions);
            if (bloodGroup !== undefined) patient.blood_group = bloodGroup;
            if (emergencyContact !== undefined) patient.emergency_contact = emergencyContact;
        }

        return res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error: any) {
        console.error('Update profile error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// Scan and verify medicine QR
router.post('/:patientId/scan-medicine', async (req: Request, res: Response) => {
    try {
        const { qrData } = req.body;

        const result = blockchainService.verifyMedicine(qrData || '');

        if (result.isValid && result.details) {
            const expiryDate = new Date(result.details.expiryDate);
            const isExpired = expiryDate < new Date();
            const isExpiringSoon = expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            return res.json({
                success: true,
                verified: true,
                data: {
                    ...result.details,
                    isExpired,
                    isExpiringSoon,
                    warning: isExpired ? 'Medicine has expired!' :
                        isExpiringSoon ? 'Medicine expires within 30 days' : null
                }
            });
        }

        return res.json({ success: true, verified: false, error: 'Invalid medicine QR' });
    } catch (error: any) {
        console.error('Scan medicine error:', error);
        return res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

export default router;
