import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import aiAgentService from '../services/ai-agent.service.js';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

/**
 * POST /api/ai/analyze-prescription
 * AI drug safety analysis for doctors
 */
router.post('/analyze-prescription', async (req: Request, res: Response) => {
    try {
        const { medicines, patientAllergies, chronicConditions, patientAge, existingMedications } = req.body;

        if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({ success: false, error: 'Medicines array is required' });
        }

        const result = await aiAgentService.analyzeDrugSafety({
            medicines,
            patientAllergies,
            chronicConditions,
            patientAge,
            existingMedications
        });

        return res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('AI analysis error:', error);
        return res.status(500).json({ success: false, error: 'Drug safety analysis failed' });
    }
});

/**
 * POST /api/ai/chat
 * Patient health chatbot
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        const response = await aiAgentService.chat(
            history.map((h: any) => ({ role: h.role, content: h.content })),
            message
        );

        return res.json({
            success: true,
            data: {
                response,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('AI chat error:', error);
        return res.status(500).json({ success: false, error: 'Chat failed' });
    }
});

export default router;
