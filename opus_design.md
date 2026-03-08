# PharmaLync (MedConnect) -- Design Document

## Overview

PharmaLync is a healthcare platform that connects patients, doctors, and pharmacies through a shared system backed by blockchain-based prescription management. The platform uses Government ID (Aadhaar) authentication, time-bound consent controls, and on-chain prescription recording to create an auditable, tamper-resistant medical workflow.

This document describes the current system design and the planned extensions.

---

## Actors

- **Patient** -- Registers with Aadhaar, controls who can access their data via consent grants, views prescriptions, scans medicines for authenticity.
- **Doctor** -- Views consented patient data, issues prescriptions (with drug interaction checks), records prescriptions on-chain.
- **Pharmacy** -- Verifies patient identity via QR, verifies medicine authenticity via QR, dispenses medication after dual verification, records dispense events on-chain.

---

## Current Architecture

```
Frontend (React 18 + Vite)
    |
    |-- Axios (Bearer JWT) --> Backend API
    |
Backend (Express + TypeScript)
    |
    |-- TiDB Cloud (MySQL2) / In-Memory Maps
    |-- ethers.js v6 --> Polygon Amoy Testnet
    |
Blockchain (Solidity 0.8.19 + Hardhat)
    |-- MedConnect.sol (Prescription, Dispense, Batch, Pharmacy Licensing)
```

### Authentication Flow

1. User submits phone number and Aadhaar at registration.
2. Server generates a 6-digit OTP (crypto.randomInt), stores it with 5-minute expiry.
3. OTP sent via Twilio SMS (falls back to console log in demo mode).
4. User submits OTP. Server verifies, creates user record, generates JWT (24h expiry).
5. Login follows the same OTP flow (phone only, no Aadhaar re-entry).
6. JWT payload: `{ id, phone, role }`.
7. Demo bypass: OTP `123456` is accepted for any phone number.

### Data Storage

Dual-mode storage: every database operation branches between TiDB (MySQL2 connection pool) and an in-memory Map structure. The in-memory path runs identically to the DB path but stores data in JavaScript Maps. This allows the app to demo without any database infrastructure.

Tables: users, patients, doctors, pharmacies, otp_verifications, consents, prescriptions, medicines, medicine_batches, prescription_medicines, dispensing_records.

### Consent Model

- Patient grants consent to a specific doctor or pharmacy.
- Consent is typed: `read`, `write`, or `dispense`.
- Consent is time-bound: 1 to 720 hours (default 24).
- Consent can be revoked by the patient at any time.
- Granting a new consent of the same type to the same recipient deactivates the old one.

### Blockchain Integration (Current State)

The smart contract `MedConnect.sol` provides:

- `recordPrescription(hash, patient, doctor)` -- stores prescription hash, emits event
- `recordDispense(hash)` -- marks prescription dispensed, prevents double-dispense
- `verifyPrescription(hash)` -- returns existence, timestamp, patient, doctor, dispense status
- `verifyDispense(hash)` -- returns dispense details
- `registerBatch(hash)` -- owner registers a medicine batch as verified
- `setPharmacyLicense(addr, bool)` -- owner licenses/delicenses a pharmacy
- `verifyBatch(hash)` -- checks if a batch hash is registered

The backend `BlockchainService` wraps these with ethers.js v6 and falls back to simulated transaction hashes when `PRIVATE_KEY` or `CONTRACT_ADDRESS` is not set. The frontend never interacts with the blockchain directly. All chain calls go through the backend.

### Frontend Structure

13 pages across 3 role-based dashboards:

**Patient**: Dashboard, Prescriptions, Consents, Scan (medicine QR), Profile
**Doctor**: Dashboard, Patients, Prescribe, Prescriptions
**Pharmacy**: Dashboard, Dispense, Inventory, History

Plus public pages: Landing, Login, Register, TestQR.

State management: Zustand with `persist` middleware (localStorage key: `medconnect-auth`). API layer: Axios with Bearer token interceptor.

---

## Known Deficiencies in Current Design

1. **Auth middleware not applied to most routes.** Only `consent.routes.ts` uses `authenticate` and `authorizeRoles`. Patient, doctor, and pharmacy routes accept raw IDs from URL parameters with no server-side identity check.

2. **JWT secret fallback.** `auth.service.ts` falls to `'medconnect-secret'` if `JWT_SECRET` is unset. `auth.middleware.ts` uses a different fallback string. These are not aligned.

3. **OTP bypass in all code paths.** The string `123456` is accepted as a valid OTP in both the in-memory and database verification paths. This is intentional for demos but must be removed before any real deployment.

4. **Schema inconsistency in consent handling.** `consent.routes.ts` uses `consent_type` (a single string). `patient.routes.ts` and `doctor.routes.ts` use `consent_types` (a JSON array) and include `granted_to_type`. These two patterns are not unified.

5. **Pharmacy verify-patient always returns consent: true.** In demo mode, `pharmacy.routes.ts` short-circuits consent verification and returns a hardcoded positive result.

6. **Inventory is fully mocked.** `pharmacy.routes.ts` returns a hardcoded array of 3 items. No inventory table exists in the database schema, despite `medicine_batches` table being defined.

7. **Blockchain is backend-only.** Users never see or interact with the blockchain. No MetaMask, no wallet connection, no on-chain consent. The "blockchain" aspect is invisible to end users.

8. **No deployment scripts for the smart contract.** The `blockchain/scripts/` and `blockchain/test/` directories are empty. The contract has not been deployed (the .env has placeholder values for `PRIVATE_KEY` and `CONTRACT_ADDRESS`).

---

## Planned Architecture (Target State)

```
Frontend (React 18 + Vite + ethers.js + snarkjs)
    |
    |-- MetaMask / Browser Wallet --> Polygon Amoy
    |-- Axios (Bearer JWT) --> Backend API
    |-- snarkjs (in-browser ZK proof generation)
    |
Backend (Express + TypeScript)
    |
    |-- TiDB Cloud (MySQL2)
    |-- ethers.js v6 --> Polygon Amoy
    |-- OpenAI / Gemini API --> AI Drug Safety Agent
    |
Blockchain (Solidity 0.8.19 + Hardhat)
    |-- MedConnect.sol       (Prescription lifecycle + On-chain consent + Safety attestation)
    |-- PrescriptionSBT.sol  (ERC-721 Soul-Bound Token for prescriptions)
    |-- PrescriptionVerifier.sol  (snarkjs-generated Groth16 ZKP verifier)
    |-- CredentialRegistry.sol    (DID for doctor/pharmacy license verification)
```

### New Components

- **MetaMask wallet connection** on the frontend for direct on-chain interaction.
- **On-chain consent** stored in the smart contract, signed by the patient's wallet.
- **ZKP prescription verification** using Circom circuits and snarkjs, with a Groth16 verifier contract on Polygon.
- **AI drug safety agent** using an LLM API, with safety attestation hashes stored on-chain.
- **Soul-Bound Token prescriptions** as non-transferable ERC-721 tokens minted to the patient's wallet.
- **Credential registry** for on-chain verification of doctor and pharmacy licenses.

---

## Data Flow (Target State)

### Prescription Issuance

1. Doctor selects patient (must have active write consent, verified on-chain).
2. Doctor fills prescription form.
3. AI agent checks drug interactions, allergies, dosage against patient profile.
4. If warnings exist, doctor reviews and confirms or modifies.
5. Server generates prescription hash, calls `recordPrescription` on MedConnect.sol.
6. Server stores AI safety attestation hash on-chain.
7. PrescriptionSBT.sol mints a non-transferable token to the patient's wallet.
8. Patient sees the prescription in their dashboard with on-chain links.

### Prescription Dispensing

1. Patient visits pharmacy, presents QR code.
2. Pharmacy scans patient QR, verifies patient identity on-chain.
3. Pharmacy scans medicine QR, verifies batch hash on-chain.
4. Optional: ZKP verification -- pharmacy verifies prescription validity without seeing private data.
5. Pharmacy confirms dispense, calls `recordDispense` on MedConnect.sol.
6. Prescription SBT is marked as dispensed.

### Consent Management

1. Patient connects MetaMask wallet.
2. Patient selects doctor/pharmacy and consent type (read/write/dispense).
3. Patient signs a transaction calling `grantConsent` on MedConnect.sol.
4. Consent is recorded on-chain with an expiry timestamp.
5. Doctor/pharmacy can verify consent by calling `verifyConsent` on the contract.
6. Patient can revoke consent at any time via another signed transaction.
