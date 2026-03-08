import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import consentRoutes from './routes/consent.routes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS: allow frontend origin from env (Vercel URL in production)
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://medconnect-livid.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin || '*');
        } else {
            callback(null, origin); // Allow anyway for demo, but reflect origin
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Basic pre-flight
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Routes
// Routes (/api prefix)
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/ai', aiRoutes);

// Routes (root prefix - fallback for frontend calling /auth/login directly)
app.use('/auth', authRoutes);
app.use('/patient', patientRoutes);
app.use('/doctor', doctorRoutes);
app.use('/pharmacy', pharmacyRoutes);
app.use('/consent', consentRoutes);
app.use('/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'MedConnect Backend'
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
async function startServer() {
    try {
        // Initialize database tables
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏥 MedConnect Backend Server Started                     ║
║   ----------------------------------------                 ║
║   🌐 Server: http://localhost:${PORT}                        ║
║   📊 Health: http://localhost:${PORT}/api/health             ║
║                                                            ║
║   API Endpoints:                                           ║
║   • POST /api/auth/request-otp     - Request OTP           ║
║   • POST /api/auth/verify-otp      - Verify OTP & Login    ║
║   • GET  /api/patient/:id/profile  - Patient Profile       ║
║   • POST /api/patient/:id/consents - Grant Consent         ║
║   • POST /api/doctor/:id/prescribe - Issue Prescription    ║
║   • POST /api/pharmacy/verify-*    - Verify QR Codes       ║
║   • POST /api/pharmacy/:id/dispense- Dispense Medicine     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
