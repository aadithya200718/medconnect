import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/shared/PageTransition';
import { LandingPage } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import TestQR from '@/pages/TestQR';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/auth.store';

// Patient Pages
import { PatientDashboard } from '@/pages/patient/Dashboard';
import { PatientPrescriptions } from '@/pages/patient/Prescriptions';
import { PatientConsents } from '@/pages/patient/Consents';
import { PatientScan } from '@/pages/patient/Scan';
import { PatientProfile } from '@/pages/patient/Profile';

// Doctor Pages
import { DoctorDashboard } from '@/pages/doctor/Dashboard';
import { DoctorPatients } from '@/pages/doctor/Patients';
import { DoctorPrescribe } from '@/pages/doctor/Prescribe';
import { DoctorPrescriptions } from '@/pages/doctor/Prescriptions';

// Pharmacy Pages
import { PharmacyDashboard } from '@/pages/pharmacy/Dashboard';
import { PharmacyDispense } from '@/pages/pharmacy/Dispense';
import { PharmacyInventory } from '@/pages/pharmacy/Inventory';
import { PharmacyHistory } from '@/pages/pharmacy/History';

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={`/${user.role}`} replace />;
    }

    return <>{children}</>;
}

function App() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* Public Routes */}
                <Route
                    path="/"
                    element={
                        <PageTransition>
                            <LandingPage />
                        </PageTransition>
                    }
                />
                <Route
                    path="/login"
                    element={
                        <PageTransition>
                            <Login />
                        </PageTransition>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PageTransition>
                            <Register />
                        </PageTransition>
                    }
                />

                {/* Patient Routes */}
                <Route
                    path="/patient"
                    element={
                        <ProtectedRoute allowedRoles={['patient']}>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<PageTransition><PatientDashboard /></PageTransition>} />
                    <Route path="prescriptions" element={<PageTransition><PatientPrescriptions /></PageTransition>} />
                    <Route path="consents" element={<PageTransition><PatientConsents /></PageTransition>} />
                    <Route path="scan" element={<PageTransition><PatientScan /></PageTransition>} />
                    <Route path="profile" element={<PageTransition><PatientProfile /></PageTransition>} />
                </Route>

                {/* Doctor Routes */}
                <Route
                    path="/doctor"
                    element={
                        <ProtectedRoute allowedRoles={['doctor']}>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<PageTransition><DoctorDashboard /></PageTransition>} />
                    <Route path="patients" element={<PageTransition><DoctorPatients /></PageTransition>} />
                    <Route path="prescribe" element={<PageTransition><DoctorPrescribe /></PageTransition>} />
                    <Route path="prescriptions" element={<PageTransition><DoctorPrescriptions /></PageTransition>} />
                </Route>

                {/* Pharmacy Routes */}
                <Route
                    path="/pharmacy"
                    element={
                        <ProtectedRoute allowedRoles={['pharmacy']}>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<PageTransition><PharmacyDashboard /></PageTransition>} />
                    <Route path="dispense" element={<PageTransition><PharmacyDispense /></PageTransition>} />
                    <Route path="inventory" element={<PageTransition><PharmacyInventory /></PageTransition>} />
                    <Route path="history" element={<PageTransition><PharmacyHistory /></PageTransition>} />
                </Route>

                <Route path="/test-qr" element={<PageTransition><TestQR /></PageTransition>} />

                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AnimatePresence>
    );
}

export default App;
