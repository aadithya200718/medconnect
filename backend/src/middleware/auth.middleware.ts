import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPool, inMemoryDb } from '../config/database';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: 'patient' | 'doctor' | 'pharmacy';
                govId: string;
            };
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'medconnect-secret';

/**
 * Authenticate JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // auth.service.ts signs: { id, phone, role }
        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            phone: string;
            role: string;
            govId?: string;
        };

        req.user = {
            userId: decoded.id,
            role: decoded.role as 'patient' | 'doctor' | 'pharmacy',
            govId: decoded.govId || ''
        };

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * Authorize specific roles
 */
export function authorizeRoles(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `This action requires one of: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
}

/**
 * Verify active consent before accessing patient data
 * @param requiredType - The consent type needed (read, write, dispense)
 */
export function verifyConsent(requiredType: 'read' | 'write' | 'dispense') {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Patients always have access to their own data
        if (req.user.role === 'patient') {
            return next();
        }

        // Get patient ID from request (params or body)
        const patientId = req.params.patientId || req.body.patientId;

        if (!patientId) {
            return res.status(400).json({ error: 'Patient ID required' });
        }

        try {
            const pool = getPool();

            if (pool) {
                const [rows] = await pool.execute(
                    `SELECT * FROM consents 
                     WHERE patient_id = ? 
                     AND granted_to_id = ? 
                     AND consent_type = ? 
                     AND is_active = TRUE 
                     AND expires_at > NOW()`,
                    [patientId, req.user.userId, requiredType]
                );

                if ((rows as any[]).length === 0) {
                    return res.status(403).json({
                        error: 'Consent required',
                        message: `You need active '${requiredType}' consent from the patient`
                    });
                }
            } else {
                // In-memory mode
                const consents = Array.from(inMemoryDb.consents.values());
                const hasConsent = consents.some(c =>
                    c.patient_id === patientId &&
                    c.granted_to_id === req.user!.userId &&
                    c.consent_type === requiredType &&
                    c.is_active &&
                    new Date(c.expires_at) > new Date()
                );

                if (!hasConsent) {
                    return res.status(403).json({
                        error: 'Consent required',
                        message: `You need active '${requiredType}' consent from the patient`
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Consent verification error:', error);
            return res.status(500).json({ error: 'Failed to verify consent' });
        }
    };
}
