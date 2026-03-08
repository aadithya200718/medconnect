import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool, inMemoryDb } from '../config/database';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/consent/grant
 * Patient grants access to a doctor or pharmacy
 */
router.post('/grant', authenticate, authorizeRoles('patient'), async (req: Request, res: Response) => {
    const { grantedToId, consentType, consentTypes: rawConsentTypes, durationHours } = req.body;

    // Support both single consentType and array consentTypes
    const consentTypesArray: string[] = rawConsentTypes
        ? (Array.isArray(rawConsentTypes) ? rawConsentTypes : [rawConsentTypes])
        : (consentType ? [consentType] : []);

    if (!grantedToId || consentTypesArray.length === 0) {
        return res.status(400).json({ error: 'grantedToId and consentType/consentTypes are required' });
    }

    const validTypes = ['read', 'write', 'dispense'];
    for (const ct of consentTypesArray) {
        if (!validTypes.includes(ct)) {
            return res.status(400).json({ error: `consentType must be one of: ${validTypes.join(', ')}` });
        }
    }

    const hours = parseInt(durationHours) || 24;
    if (hours < 1 || hours > 720) {
        return res.status(400).json({ error: 'Duration must be between 1 and 720 hours' });
    }

    const consentId = uuidv4();
    const patientId = req.user!.userId;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    try {
        const pool = getPool();
        let grantedToType: string = 'doctor';

        if (pool) {
            const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [grantedToId]);
            if ((users as any[]).length === 0) {
                return res.status(404).json({ error: 'Recipient user not found' });
            }
            const recipient = (users as any[])[0];
            if (!['doctor', 'pharmacy'].includes(recipient.role)) {
                return res.status(400).json({ error: 'Can only grant consent to doctors or pharmacies' });
            }
            grantedToType = recipient.role;

            // Deactivate existing consents of same types to same recipient
            for (const ct of consentTypesArray) {
                await pool.execute(
                    `UPDATE consents SET is_active = FALSE WHERE patient_id = ? AND granted_to_id = ? AND consent_type = ?`,
                    [patientId, grantedToId, ct]
                );
            }

            // Create new consent with unified schema
            await pool.execute(
                `INSERT INTO consents (id, patient_id, granted_to_id, granted_to_type, consent_type, consent_types, expires_at, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [consentId, patientId, grantedToId, grantedToType, consentTypesArray[0], JSON.stringify(consentTypesArray), expiresAt]
            );
        } else {
            const recipient = inMemoryDb.users.get(grantedToId);
            if (!recipient) {
                return res.status(404).json({ error: 'Recipient user not found' });
            }
            grantedToType = recipient.role;

            // Deactivate existing
            inMemoryDb.consents.forEach((c) => {
                if (c.patient_id === patientId && c.granted_to_id === grantedToId &&
                    consentTypesArray.includes(c.consent_type)) {
                    c.is_active = false;
                }
            });

            inMemoryDb.consents.set(consentId, {
                id: consentId,
                patient_id: patientId,
                granted_to_id: grantedToId,
                granted_to_type: grantedToType,
                consent_type: consentTypesArray[0],
                consent_types: consentTypesArray,
                expires_at: expiresAt.toISOString(),
                is_active: true,
                created_at: new Date().toISOString()
            });
        }

        res.status(201).json({
            message: 'Consent granted successfully',
            consent: {
                id: consentId,
                grantedTo: grantedToId,
                grantedToType,
                types: consentTypesArray,
                type: consentTypesArray[0],
                expiresAt: expiresAt.toISOString(),
                durationHours: hours
            }
        });
    } catch (error) {
        console.error('Grant consent error:', error);
        res.status(500).json({ error: 'Failed to grant consent' });
    }
});

/**
 * GET /api/consent/my-consents
 * List consents (granted by patient OR received by doctor/pharmacy)
 */
router.get('/my-consents', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { status } = req.query; // active, expired, all

    try {
        const pool = getPool();
        let consents: any[] = [];

        if (pool) {
            let query = '';
            if (role === 'patient') {
                query = `SELECT c.*, u.email as granted_to_email 
                         FROM consents c 
                         LEFT JOIN users u ON c.granted_to_id = u.id 
                         WHERE c.patient_id = ?`;
            } else {
                query = `SELECT c.*, u.email as patient_email 
                         FROM consents c 
                         LEFT JOIN users u ON c.patient_id = u.id 
                         WHERE c.granted_to_id = ?`;
            }

            if (status === 'active') {
                query += ' AND c.is_active = TRUE AND c.expires_at > NOW()';
            } else if (status === 'expired') {
                query += ' AND (c.is_active = FALSE OR c.expires_at <= NOW())';
            }

            query += ' ORDER BY c.created_at DESC';

            const [rows] = await pool.execute(query, [userId]);
            consents = rows as any[];
        } else {
            // In-memory mode
            const allConsents = Array.from(inMemoryDb.consents.values());

            consents = allConsents.filter(c => {
                const isRelevant = role === 'patient'
                    ? c.patient_id === userId
                    : c.granted_to_id === userId;

                if (!isRelevant) return false;

                if (status === 'active') {
                    return c.is_active && new Date(c.expires_at) > new Date();
                } else if (status === 'expired') {
                    return !c.is_active || new Date(c.expires_at) <= new Date();
                }
                return true;
            });
        }

        res.json({
            consents: consents.map(c => ({
                id: c.id,
                patientId: c.patient_id,
                grantedToId: c.granted_to_id,
                type: c.consent_type,
                expiresAt: c.expires_at,
                isActive: c.is_active,
                isExpired: new Date(c.expires_at) <= new Date(),
                createdAt: c.created_at
            }))
        });
    } catch (error) {
        console.error('List consents error:', error);
        res.status(500).json({ error: 'Failed to fetch consents' });
    }
});

/**
 * DELETE /api/consent/:id/revoke
 * Patient revokes an active consent
 */
router.delete('/:id/revoke', authenticate, authorizeRoles('patient'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const patientId = req.user!.userId;

    try {
        const pool = getPool();

        if (pool) {
            const [result] = await pool.execute(
                `UPDATE consents SET is_active = FALSE 
                 WHERE id = ? AND patient_id = ?`,
                [id, patientId]
            );

            if ((result as any).affectedRows === 0) {
                return res.status(404).json({ error: 'Consent not found or not owned by you' });
            }
        } else {
            const consent = inMemoryDb.consents.get(id);
            if (!consent || consent.patient_id !== patientId) {
                return res.status(404).json({ error: 'Consent not found or not owned by you' });
            }
            consent.is_active = false;
        }

        res.json({ message: 'Consent revoked successfully' });
    } catch (error) {
        console.error('Revoke consent error:', error);
        res.status(500).json({ error: 'Failed to revoke consent' });
    }
});

export default router;
