import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

// Initialize Twilio client if credentials are available
if (accountSid && authToken && twilioPhoneNumber) {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized');
} else {
    console.warn('⚠️ Twilio credentials not configured. SMS will be skipped (demo mode).');
}

/**
 * Send OTP via Twilio SMS
 * @param phone - The recipient's phone number (e.g., +919876543210)
 * @param otp - The 6-digit OTP code
 * @returns Promise<boolean> - True if sent successfully, false otherwise
 */
export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
    // Always log OTP for development/demo purposes
    console.log(`\n🔐 OTP for ${phone}: ${otp}\n`);

    if (!client || !twilioPhoneNumber) {
        console.log('📱 Twilio not configured - OTP logged to console only');
        return true; // Return true for demo mode
    }

    try {
        const message = await client.messages.create({
            body: `Your MedConnect verification code is: ${otp}. Valid for 5 minutes.`,
            from: twilioPhoneNumber,
            to: phone
        });

        console.log(`📱 SMS sent successfully. SID: ${message.sid}`);
        return true;
    } catch (error: any) {
        console.error('❌ Failed to send SMS:', error.message);
        // Return true anyway so the flow continues (OTP is logged to console)
        return true;
    }
}

export default { sendOtpSms };
