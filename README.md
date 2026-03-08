# MedConnect

A full-stack healthcare platform that connects patients, doctors, and pharmacies. Patients can book appointments, manage prescriptions, and grant time-bound consent for data access. Doctors can issue prescriptions (recorded on-chain), and pharmacies can verify and dispense medicines with QR-based workflows. Built during a hackathon with a blockchain layer on Polygon Amoy for immutable audit trails.

## Features

- **OTP-based authentication** — phone number login via Twilio SMS
- **Role-based dashboards** — separate flows for patients, doctors, and pharmacies
- **Consent management** — patients grant time-limited (24h) access to their data
- **Prescription management** — doctors create prescriptions, patients view them, pharmacies dispense
- **QR verification** — dual QR scanning (patient ID + medicine) for pharmacy dispensing
- **Blockchain audit trail** — prescriptions and dispense events recorded on Polygon Amoy
- **AI assistant** — Google Gemini integration for prescription analysis and health Q&A
- **Responsive UI** — glassmorphism design with Framer Motion animations

## Tech Stack

| Layer          | Technologies                                                              |
| -------------- | ------------------------------------------------------------------------- |
| **Frontend**   | React 18, Vite 6, TypeScript, Tailwind CSS, Zustand, Framer Motion       |
| **Backend**    | Node.js, Express 4, TypeScript, TiDB (MySQL-compatible), JWT, Twilio     |
| **Blockchain** | Solidity 0.8.19, Hardhat, ethers.js, Polygon Amoy Testnet                |
| **AI**         | Google Gemini API                                                         |
| **Deployment** | Vercel (frontend), Render (backend), TiDB Cloud (database)               |

## Architecture

```
medconnect/
├── frontend/       # React + Vite SPA (deployed on Vercel)
├── backend/        # Express API server (deployed on Render)
├── blockchain/     # Solidity smart contracts (Polygon Amoy via Hardhat)
└── README.md
```

The frontend talks to the Express API over HTTPS. The backend handles auth, CRUD operations against TiDB Cloud, and interacts with Polygon Amoy smart contracts via ethers.js for on-chain recording. The frontend is a standard Vite SPA with client-side routing.

```
Browser → React Frontend (Vercel)
              ↓ HTTPS
         Express API (Render) → TiDB Cloud
              ↓ ethers.js
         Polygon Amoy (Smart Contracts)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- MetaMask (optional, for blockchain features)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/medconnect.git
cd medconnect
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in your values — see Environment Variables below
npm run dev
```

Runs on `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# set VITE_API_URL=http://localhost:3001/api
npm run dev
```

Runs on `http://localhost:5173`

### 4. Blockchain (optional)

Only needed if you want to deploy your own contracts.

```bash
cd blockchain
npm install
cp .env.example .env
# add your Polygon Amoy RPC URL and deployer private key
npx hardhat compile
npx hardhat run scripts/deploy.ts --network amoy
```

## Environment Variables

Copy the `.env.example` in each directory and fill in your values. **Never commit `.env` files.**

### `backend/.env`

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# TiDB Cloud
TIDB_HOST=your-tidb-host
TIDB_PORT=4000
TIDB_USER=your-username
TIDB_PASSWORD=your-password
TIDB_DATABASE=medconnect

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Twilio (SMS OTP)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Blockchain
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your-wallet-private-key
CONTRACT_ADDRESS=0x...

# AI
GEMINI_API_KEY=your-gemini-api-key
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:3001/api
VITE_CONTRACT_ADDRESS=0x...
```

### `blockchain/.env`

```env
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your-deployer-private-key
CONTRACT_ADDRESS=0x...
```

## Running the Project

After setting up both backend and frontend:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

The backend seeds the database tables on first run. You can also run `npm run seed` in the backend directory to populate sample data.

## Deployment

### Frontend → Vercel

1. Import your GitHub repo on [vercel.com](https://vercel.com)
2. Set the **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add environment variables:
   - `VITE_API_URL` → your Render backend URL + `/api`
   - `VITE_CONTRACT_ADDRESS` → your deployed contract address
5. Deploy

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set the **Root Directory** to `backend`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add all environment variables from `backend/.env.example`
7. Set `NODE_ENV=production` and `FRONTEND_URL` to your Vercel URL

### After both are live

Update the backend's `FRONTEND_URL` env var on Render to point to your Vercel deployment URL. This configures CORS correctly. Render will auto-redeploy with the change.

## API Overview

All endpoints are prefixed with `/api`.

| Route                            | Method | What it does                      |
| -------------------------------- | ------ | --------------------------------- |
| `/auth/login`                    | POST   | Send OTP to phone number          |
| `/auth/verify-login-otp`         | POST   | Verify OTP, returns JWT           |
| `/auth/register`                 | POST   | Register a new user               |
| `/patient/:id/profile`           | GET    | Get patient profile               |
| `/patient/:id/consents`          | POST   | Grant consent to a doctor/pharmacy|
| `/patient/:id/prescriptions`     | GET    | List patient's prescriptions      |
| `/doctor/:id/prescribe`          | POST   | Create a prescription             |
| `/doctor/:id/prescriptions`      | GET    | List prescriptions issued by doctor|
| `/pharmacy/verify-patient`       | POST   | Verify patient via QR or ID       |
| `/pharmacy/:id/dispense`         | POST   | Record medicine dispense           |
| `/ai/analyze-prescription`       | POST   | AI analysis of a prescription     |
| `/ai/chat`                       | POST   | AI health assistant               |
| `/health`                        | GET    | Health check                      |

## Folder Structure

```
medconnect/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components (auth, layout, shared)
│   │   ├── pages/            # Route-level pages (patient, doctor, pharmacy)
│   │   ├── services/         # API client and service layer
│   │   ├── store/            # Zustand state management
│   │   ├── types/            # TypeScript type definitions
│   │   ├── App.tsx           # Router and app shell
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── config/           # Database connection config
│   │   ├── middleware/       # Auth middleware (JWT verification)
│   │   ├── routes/           # Express route handlers
│   │   ├── services/         # Blockchain, Gemini AI, Twilio services
│   │   ├── scripts/          # DB seed and utility scripts
│   │   ├── utils/            # Helper utilities
│   │   └── index.ts          # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── blockchain/
│   ├── contracts/            # Solidity smart contracts
│   ├── scripts/              # Deployment scripts
│   ├── hardhat.config.ts
│   └── package.json
├── .gitignore
└── README.md
```

## Future Improvements

- [ ] Add appointment scheduling with calendar integration
- [ ] Implement real-time notifications (WebSocket or SSE)
- [ ] Add support for medical document/report uploads
- [ ] Multi-language support for wider accessibility
- [ ] Admin dashboard for platform monitoring
- [ ] Move to mainnet deployment with proper key management
- [ ] Add end-to-end tests with Playwright

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

If you find a bug or have a suggestion, feel free to open an issue.



## License

MIT License. See [LICENSE](LICENSE) for details.

## demo:
link for video-https://drive.google.com/drive/folders/1wp4yOTibFb0RF_cD4yaAW3ewvPp59laB?usp=sharing
explanation for demo:
1.demo-Welcome to MedConnect, a unified healthcare platform securely connecting patients, doctors, and pharmacies.
2.The user journey begins with a patient logging in effortlessly using a secure SMS OTP.
3.Once logged in, the patient uses our consent management system to grant a doctor specific, time-bound access (e.g., 24 hours) to their medical records.
4.The doctor then logs into their own role-based dashboard, instantly viewing the patient's authorized health profile.
5.While diagnosing, doctors can consult our integrated AI assistant to analyze complex details or answer quick health queries.
6.The doctor then seamlessly issues a new digital prescription directly to the patient's secure profile.
7.Crucially, this prescription creation is instantly recorded on the Polygon blockchain, establishing an immutable and transparent audit trail.
8.For the next step, the patient visits a registered pharmacy and simply presents a unique QR code from their app.
9.The pharmacist logs in and utilizes our dual QR-verification workflow to scan both the patient's code and the medicine.
10.This strict verification guarantees that the exact prescribed medication is dispensed to the correct patient.
11.Finally, the actual dispensing event is also logged on-chain, completing a highly secure, transparent, and error-free healthcare cycle!

