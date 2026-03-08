import { Router, Request, Response } from 'express';
import AuthService, { RegistrationData } from '../services/auth.service.js';

const router = Router();

// ============ REGISTRATION ENDPOINTS ============

/**
 * POST /api/auth/register
 * Step 1: Submit registration data and receive OTP
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { name, role, phone, aadhar_number } = req.body;

        const result = await AuthService.register({
            name,
            role,
            phone,
            aadhar_number
        } as RegistrationData);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error: any) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: 'Registration failed',
            details: error.message
        });
    }
});

/**
 * POST /api/auth/verify-registration-otp
 * Step 2: Verify OTP and complete registration
 */
router.post('/verify-registration-otp', async (req: Request, res: Response) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Phone and OTP are required'
            });
        }

        const result = await AuthService.verifyRegistrationOTP(phone, otp);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error: any) {
        console.error('Verify registration OTP error:', error);
        return res.status(500).json({
            success: false,
            error: 'Verification failed',
            details: error.message
        });
    }
});

// ============ LOGIN ENDPOINTS ============

/**
 * POST /api/auth/login
 * Step 1: Request login OTP
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const result = await AuthService.requestLoginOTP(phone);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error: any) {
        console.error('Login request error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to send OTP',
            details: error.message
        });
    }
});

/**
 * POST /api/auth/verify-login-otp
 * Step 2: Verify OTP and issue JWT
 */
router.post('/verify-login-otp', async (req: Request, res: Response) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Phone and OTP are required'
            });
        }

        const result = await AuthService.verifyLoginOTP(phone, otp);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error: any) {
        console.error('Verify login OTP error:', error);
        return res.status(500).json({
            success: false,
            error: 'Login verification failed',
            details: error.message
        });
    }
});

// ============ TOKEN VERIFICATION ============

/**
 * GET /api/auth/verify
 * Verify JWT token validity
 */
router.get('/verify', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);

    if (!payload) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    return res.json({ success: true, user: payload });
});

// ============ LEGACY ENDPOINTS (backwards compatibility) ============

/**
 * POST /api/auth/request-otp (LEGACY)
 * Kept for backwards compatibility - maps to login flow
 */
router.post('/request-otp', async (req: Request, res: Response) => {
    try {
        const { phone, govId } = req.body;
        const phoneNumber = phone || govId; // Support both formats

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const result = await AuthService.requestLoginOTP(phoneNumber);
        return res.json(result);
    } catch (error: any) {
        console.error('Request OTP error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to send OTP',
            details: error.message
        });
    }
});

/**
 * POST /api/auth/verify-otp (LEGACY)
 * Kept for backwards compatibility - maps to login flow
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
    try {
        const { phone, govId, otp } = req.body;
        const phoneNumber = phone || govId;

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Phone and OTP are required'
            });
        }

        const result = await AuthService.verifyLoginOTP(phoneNumber, otp);
        return res.json(result);
    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
});

export default router;
