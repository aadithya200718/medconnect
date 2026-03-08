import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Hardcoded drug interactions as fallback when API is unavailable
const DRUG_INTERACTIONS: Record<string, string[]> = {
    'warfarin': ['aspirin', 'ibuprofen', 'naproxen', 'vitamin k'],
    'metformin': ['alcohol', 'contrast dye', 'iodinated contrast'],
    'lisinopril': ['potassium', 'spironolactone', 'amiloride'],
    'simvastatin': ['erythromycin', 'clarithromycin', 'grapefruit', 'itraconazole'],
    'aspirin': ['warfarin', 'ibuprofen', 'clopidogrel', 'heparin'],
    'ciprofloxacin': ['antacids', 'calcium', 'iron', 'theophylline'],
    'amoxicillin': ['methotrexate', 'probenecid'],
    'omeprazole': ['clopidogrel', 'methotrexate', 'tacrolimus'],
    'amlodipine': ['simvastatin', 'cyclosporine'],
    'metoprolol': ['verapamil', 'diltiazem', 'clonidine']
};

interface DrugSafetyInput {
    medicines: Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        genericName?: string;
    }>;
    patientAllergies?: string[];
    chronicConditions?: string[];
    patientAge?: number;
    existingMedications?: string[];
}

interface DrugSafetyResult {
    safe: boolean;
    warnings: string[];
    suggestions: string[];
    interactions: string[];
    attestationHash: string;
    aiPowered: boolean;
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

class AIAgentService {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        if (GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            console.log('✅ Gemini AI initialized for drug safety analysis');
        } else {
            console.log('⚠️ No Gemini API key set — using fallback drug interaction check');
        }
    }

    /**
     * Analyze drug safety using Gemini AI or fallback
     */
    async analyzeDrugSafety(input: DrugSafetyInput): Promise<DrugSafetyResult> {
        const startTime = Date.now();

        // Try AI-powered analysis first
        if (this.genAI) {
            try {
                return await this.analyzeWithGemini(input);
            } catch (error) {
                console.error('Gemini AI analysis failed, falling back:', error);
            }
        }

        // Fallback to hardcoded analysis
        return this.analyzeWithFallback(input);
    }

    /**
     * AI-powered drug safety analysis using Gemini
     */
    private async analyzeWithGemini(input: DrugSafetyInput): Promise<DrugSafetyResult> {
        const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const medicineList = input.medicines.map(m =>
            `${m.name}${m.dosage ? ` (${m.dosage})` : ''}${m.frequency ? ` - ${m.frequency}` : ''}`
        ).join('\n');

        const prompt = `You are a drug safety analysis AI for a healthcare platform called MedConnect.

Analyze the following prescription for potential drug interactions, contraindications, and safety concerns.

## Prescribed Medicines:
${medicineList}

## Patient Information:
- Allergies: ${(input.patientAllergies || []).join(', ') || 'None reported'}
- Chronic Conditions: ${(input.chronicConditions || []).join(', ') || 'None reported'}
- Age: ${input.patientAge || 'Unknown'}
- Existing Medications: ${(input.existingMedications || []).join(', ') || 'None reported'}

## Instructions:
Respond in the following JSON format ONLY (no markdown, no code blocks):
{
    "safe": true/false,
    "warnings": ["list of warning messages"],
    "interactions": ["list of drug interaction descriptions"],
    "suggestions": ["list of suggestions for the prescribing doctor"]
}

Be conservative — flag any potential issues. Include severity indicators like ⚠️ for moderate and 🚨 for severe.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON response from AI
        let parsed;
        try {
            // Extract JSON from response (handle potential markdown wrapping)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
        } catch {
            // If parsing fails, treat the response as warnings
            parsed = {
                safe: false,
                warnings: [responseText],
                interactions: [],
                suggestions: []
            };
        }

        // Generate attestation hash
        const attestationData = JSON.stringify({
            input, output: parsed, timestamp: Date.now(), model: 'gemini-2.0-flash'
        });
        const attestationHash = '0x' + crypto.createHash('sha256').update(attestationData).digest('hex');

        return {
            safe: parsed.safe ?? true,
            warnings: parsed.warnings || [],
            interactions: parsed.interactions || [],
            suggestions: parsed.suggestions || [],
            attestationHash,
            aiPowered: true
        };
    }

    /**
     * Fallback drug interaction check using hardcoded data
     */
    private analyzeWithFallback(input: DrugSafetyInput): DrugSafetyResult {
        const warnings: string[] = [];
        const interactions: string[] = [];
        const suggestions: string[] = [];

        const medicineNames = input.medicines.map(m =>
            (m.name || m.genericName || '').toLowerCase()
        );

        // Check drug-drug interactions
        for (const med of medicineNames) {
            const knownInteractions = DRUG_INTERACTIONS[med];
            if (knownInteractions) {
                for (const otherMed of medicineNames) {
                    if (med !== otherMed && knownInteractions.includes(otherMed)) {
                        interactions.push(`⚠️ ${med} + ${otherMed}: Known drug interaction`);
                        warnings.push(`Drug interaction detected between ${med} and ${otherMed}`);
                    }
                }
            }
        }

        // Check allergies
        const allergies = (input.patientAllergies || []).map(a => a.toLowerCase());
        for (const med of input.medicines) {
            const medName = (med.name || '').toLowerCase();
            const genericName = (med.genericName || '').toLowerCase();
            for (const allergy of allergies) {
                if (medName.includes(allergy) || genericName.includes(allergy) || allergy.includes(medName)) {
                    warnings.push(`🚨 ALLERGY ALERT: Patient allergic to "${allergy}", prescribed "${med.name}"`);
                }
            }
        }

        // Generate attestation hash
        const attestationData = JSON.stringify({
            input, warnings, interactions, timestamp: Date.now(), model: 'fallback'
        });
        const attestationHash = '0x' + crypto.createHash('sha256').update(attestationData).digest('hex');

        return {
            safe: warnings.length === 0,
            warnings,
            interactions,
            suggestions: warnings.length > 0 ? ['Review interactions before confirming prescription'] : [],
            attestationHash,
            aiPowered: false
        };
    }

    /**
     * Patient chatbot - answer health questions
     */
    async chat(messages: ChatMessage[], currentQuestion: string): Promise<string> {
        if (!this.genAI) {
            return 'AI chatbot is currently unavailable. Please consult your doctor for medical advice.';
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const systemPrompt = `You are MedConnect AI Assistant, a helpful healthcare chatbot. You provide general health information and guidance.

IMPORTANT RULES:
1. You are NOT a doctor. Always recommend consulting a healthcare professional for specific medical advice.
2. Never diagnose conditions or prescribe medications.
3. Provide general, evidence-based health information.
4. Be empathetic and supportive.
5. If asked about emergency symptoms, advise calling emergency services immediately.
6. Keep responses concise and easy to understand.
7. Mention MedConnect features when relevant (e.g., "You can check your prescriptions in the MedConnect app").`;

            const chatHistory = messages.map(m => ({
                role: m.role === 'user' ? 'user' as const : 'model' as const,
                parts: [{ text: m.content }]
            }));

            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: 'You are a healthcare assistant. Acknowledge this.' }] },
                    { role: 'model', parts: [{ text: systemPrompt }] },
                    ...chatHistory
                ]
            });

            const result = await chat.sendMessage(currentQuestion);
            return result.response.text();
        } catch (error) {
            console.error('AI chat error:', error);
            return 'I apologize, but I\'m having trouble processing your question right now. Please try again or consult your healthcare provider.';
        }
    }
}

export const aiAgentService = new AIAgentService();
export default aiAgentService;
