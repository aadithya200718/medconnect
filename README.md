# 🏥 MedConnect — Blockchain Healthcare Platform

A full-stack, blockchain-powered healthcare platform enabling secure prescription management, consent-based data sharing, and verified medicine dispensing. Built with React, Node.js, and Solidity on Polygon Amoy testnet.

---

## 🏗️ Architecture

```
medconnect/
├── frontend/          → React + Vite + Tailwind CSS (deployed on Vercel)
├── backend/           → Node.js + Express + TypeScript (deployed on Render)
├── blockchain/        → Solidity smart contracts (Polygon Amoy via Hardhat)
├── .gitignore
└── README.md
```

| Layer | Tech Stack |
|---|---|
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS, Framer Motion, Zustand, React Router |
| **Backend** | Express 4, TypeScript, TiDB (MySQL-compatible), JWT, Twilio OTP, Gemini AI |
| **Blockchain** | Solidity 0.8.19, Hardhat, ethers.js, Polygon Amoy Testnet |

### Data Flow

```
Patient/Doctor/Pharmacy → React Frontend (Vercel)
        ↓ HTTPS
Express API (Render) → TiDB Cloud (Database)
        ↓ ethers.js
Polygon Amoy Blockchain (Smart Contracts)
```

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- MetaMask browser extension (for blockchain features)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/medconnect.git
cd medconnect
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your actual values in .env
npm run dev
```

Backend runs at: `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in your actual values in .env
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 4. Blockchain Setup (Optional — for contract deployment)

```bash
cd blockchain
npm install
cp .env.example .env
# Fill in your Polygon Amoy keys in .env
npm run compile
npm run deploy:amoy
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3001`) |
| `NODE_ENV` | Environment (`development` / `production`) |
| `FRONTEND_URL` | Frontend URL for CORS (e.g., `https://your-app.vercel.app`) |
| `TIDB_HOST` | TiDB Cloud host |
| `TIDB_PORT` | TiDB port (default: `4000`) |
| `TIDB_USER` | TiDB username |
| `TIDB_PASSWORD` | TiDB password |
| `TIDB_DATABASE` | Database name |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRY` | Token expiry duration (e.g., `24h`) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone number |
| `POLYGON_RPC_URL` | Polygon Amoy RPC endpoint |
| `PRIVATE_KEY` | Wallet private key for blockchain transactions |
| `CONTRACT_ADDRESS` | Deployed smart contract address |
| `GEMINI_API_KEY` | Google Gemini AI API key |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g., `https://your-backend.onrender.com/api`) |
| `VITE_CONTRACT_ADDRESS` | Deployed smart contract address |

### Blockchain (`blockchain/.env`)

| Variable | Description |
|---|---|
| `POLYGON_RPC_URL` | Polygon Amoy RPC endpoint |
| `PRIVATE_KEY` | Deployer wallet private key |
| `CONTRACT_ADDRESS` | Deployed contract address |

> ⚠️ **Never commit `.env` files.** They are listed in `.gitignore`. Use `.env.example` as a template.

---

## ✨ Features

- **OTP Authentication** — Secure login with Twilio SMS OTP
- **Consent Management** — Time-bound (24h) patient consent for data access
- **Prescription Management** — Doctors issue prescriptions, recorded on-chain
- **Dual QR Verification** — Patient QR + Medicine QR for pharmacy dispensing
- **Blockchain Recording** — Immutable audit trail on Polygon Amoy
- **AI Assistant** — Google Gemini-powered prescription analysis and chat
- **Glassmorphism UI** — Premium, responsive design with Framer Motion animations

---

## 🎯 Demo Flow

1. **Patient** logs in → Grants 24-hour consent to a Doctor
2. **Doctor** views patient records → Issues a prescription (recorded on blockchain)
3. **Patient** grants dispense consent to a Pharmacy
4. **Pharmacy** verifies patient (QR scan or manual ID) → Prescriptions auto-load
5. **Pharmacy** scans Medicine QR → Confirms dispense → Blockchain verification

---

## 🚢 Deployment

### Backend → Render

1. Push your repository to GitHub
2. Go to [render.com](https://render.com) → **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
5. Add all environment variables from `backend/.env.example` with your real values
6. Set `NODE_ENV=production`
7. Set `FRONTEND_URL=https://your-app.vercel.app` (after deploying frontend)
8. Deploy

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repository
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
   - `VITE_CONTRACT_ADDRESS` = your deployed contract address
5. Deploy

### Post-Deployment

After both services are live:

1. Copy your Vercel frontend URL
2. Go to Render → your backend service → **Environment**
3. Set `FRONTEND_URL` = your Vercel URL (e.g., `https://medconnect.vercel.app`)
4. Render will automatically redeploy with the updated CORS settings

---

## 📦 Git Commands

```bash
# Initialize and push to GitHub
git init
git add .
git commit -m "Initial commit: MedConnect production-ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/medconnect.git
git push -u origin main
```

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Request login OTP |
| `/api/auth/verify-login-otp` | POST | Verify OTP & get JWT |
| `/api/auth/register` | POST | Register new user |
| `/api/patient/:id/profile` | GET | Get patient profile |
| `/api/patient/:id/consents` | POST | Grant consent |
| `/api/patient/:id/prescriptions` | GET | Get patient prescriptions |
| `/api/doctor/:id/prescribe` | POST | Issue prescription |
| `/api/doctor/:id/prescriptions` | GET | Get doctor's prescriptions |
| `/api/pharmacy/verify-patient` | POST | Verify patient QR |
| `/api/pharmacy/:id/dispense` | POST | Record medicine dispense |
| `/api/ai/analyze-prescription` | POST | AI prescription analysis |
| `/api/ai/chat` | POST | AI health assistant chat |
| `/api/health` | GET | Health check |

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand
- **Backend**: Express, TypeScript, TiDB (MySQL-compatible), JWT, Twilio
- **AI**: Google Gemini API
- **Blockchain**: Solidity, Hardhat, ethers.js, Polygon Amoy Testnet
- **Deployment**: Vercel (frontend), Render (backend), TiDB Cloud (database)

---

## 📄 License

This project is part of a hackathon submission.
