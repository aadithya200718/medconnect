import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

function checkEnv() {
    console.log('Checking Environment Configuration...');

    const requiredVars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.error('❌ Missing Twilio Environment Variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.log('\nApp will run in DEMO MODE (OTPs logged to console).');
    } else {
        console.log('✅ Twilio Environment Variables are present.');

        // masked print
        console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID?.slice(0, 4)}...`);
        console.log(`   Phone Number: ${process.env.TWILIO_PHONE_NUMBER}`);

        console.log('\nAttempting to initialize Twilio client...');
        try {
            const twilio = require('twilio');
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            console.log('✅ Twilio client initialized successfully.');
        } catch (error) {
            console.error('❌ Failed to initialize Twilio client:', error);
        }
    }
}

checkEnv();
