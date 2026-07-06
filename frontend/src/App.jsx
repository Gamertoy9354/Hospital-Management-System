import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HospitalProvider } from './context/HospitalContext';
import { lazy, Suspense } from 'react';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const VerifyOTP = lazy(() => import('./pages/auth/VerifyOTP'));

const ReceptionistDashboard = lazy(() => import('./pages/receptionist/Dashboard'));
const BedMap = lazy(() => import('./pages/receptionist/BedMap'));
const TokenDesk = lazy(() => import('./pages/receptionist/TokenDesk'));
const QueueDisplay = lazy(() => import('./pages/receptionist/QueueDisplay'));
const PatientSearch = lazy(() => import('./pages/receptionist/PatientSearch'));
const PatientRegister = lazy(() => import('./pages/receptionist/PatientRegister'));
const PatientProfile = lazy(() => import('./pages/receptionist/PatientProfile'));
const Billing = lazy(() => import('./pages/receptionist/Billing'));

const DoctorDashboard = lazy(() => import('./pages/doctor/Dashboard'));
const PatientVisit = lazy(() => import('./pages/doctor/PatientVisit'));
const PrescriptionEditor = lazy(() => import('./pages/doctor/PrescriptionEditor'));

const NurseDashboard = lazy(() => import('./pages/nurse/Dashboard'));
const PharmacistDashboard = lazy(() => import('./pages/pharmacist/Dashboard'));

const AdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'));
const HospitalSetup = lazy(() => import('./pages/superadmin/HospitalSetup'));
const FloorWardSetup = lazy(() => import('./pages/superadmin/FloorWardSetup'));
const StaffManagement = lazy(() => import('./pages/superadmin/StaffManagement'));
const DrugMaster = lazy(() => import('./pages/superadmin/DrugMaster'));
const AuditLog = lazy(() => import('./pages/superadmin/AuditLog'));

const ROLE_HOME = {
    RECEPTIONIST: '/receptionist',
    DOCTOR: '/doctor',
    SUPER_ADMIN: '/admin',
    NURSE: '/nurse',
    PHARMACIST: '/pharmacist'
};

function Spinner() {
    return (
        <div className="flex items-center justify-center" style={{ height: '100vh' }}>
            <div className="spinner" />
        </div>
    );
}

function ProtectedRoute({ children, allowedRoles }) {
    const { staff, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!staff) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(staff.role)) {
        return <Navigate to={ROLE_HOME[staff.role]} />;
    }
    return children;
}

function RoleRedirect() {
    const { staff } = useAuth();
    if (!staff) return <Navigate to="/login" />;
    return <Navigate to={ROLE_HOME[staff.role] || '/login'} />;
}

export default function App() {
    return (
        <BrowserRouter>
            <HospitalProvider>
                <AuthProvider>
                    <Suspense fallback={<Spinner />}>
                        <Routes>
                            {/* Auth routes */}
                            <Route element={<AuthLayout />}>
                                <Route path="/login" element={<Login />} />
                                <Route path="/verify-otp" element={<VerifyOTP />} />
                            </Route>

                            {/* Public queue display */}
                            <Route path="/queue-display" element={<QueueDisplay />} />

                            {/* Protected routes */}
                            <Route element={
                                <ProtectedRoute><AppLayout /></ProtectedRoute>
                            }>
                                {/* Receptionist */}
                                <Route path="/receptionist" element={
                                    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'SUPER_ADMIN']}>
                                        <ReceptionistDashboard />
                                    </ProtectedRoute>
                                } />
                                <Route path="/receptionist/beds" element={
                                    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'SUPER_ADMIN']}>
                                        <BedMap />
                                    </ProtectedRoute>
                                } />
                                <Route path="/receptionist/tokens" element={
                                    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'SUPER_ADMIN']}>
                                        <TokenDesk />
                                    </ProtectedRoute>
                                } />
                                <Route path="/receptionist/patients" element={
                                    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST']}>
                                        <PatientSearch />
                                    </ProtectedRoute>
                                } />
                                <Route path="/receptionist/patients/new" element={
                                    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'SUPER_ADMIN']}>
                                        <PatientRegister />
                                    </ProtectedRoute>
                                } />
                                <Route path="/patients/:id" element={
                                    <ProtectedRoute><PatientProfile /></ProtectedRoute>
                                } />
                                <Route path="/receptionist/billing" element={
                                    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'SUPER_ADMIN']}>
                                        <Billing />
                                    </ProtectedRoute>
                                } />

                                {/* Doctor */}
                                <Route path="/doctor" element={
                                    <ProtectedRoute allowedRoles={['DOCTOR', 'SUPER_ADMIN']}>
                                        <DoctorDashboard />
                                    </ProtectedRoute>
                                } />
                                <Route path="/doctor/visit/:visitId" element={
                                    <ProtectedRoute allowedRoles={['DOCTOR', 'SUPER_ADMIN']}>
                                        <PatientVisit />
                                    </ProtectedRoute>
                                } />
                                <Route path="/doctor/prescription/:visitId" element={
                                    <ProtectedRoute allowedRoles={['DOCTOR', 'SUPER_ADMIN']}>
                                        <PrescriptionEditor />
                                    </ProtectedRoute>
                                } />

                                {/* Nurse */}
                                <Route path="/nurse" element={
                                    <ProtectedRoute allowedRoles={['NURSE', 'SUPER_ADMIN']}>
                                        <NurseDashboard />
                                    </ProtectedRoute>
                                } />

                                {/* Pharmacist */}
                                <Route path="/pharmacist" element={
                                    <ProtectedRoute allowedRoles={['PHARMACIST', 'SUPER_ADMIN']}>
                                        <PharmacistDashboard />
                                    </ProtectedRoute>
                                } />

                                {/* Admin */}
                                <Route path="/admin" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <AdminDashboard />
                                    </ProtectedRoute>
                                } />
                                <Route path="/admin/hospital" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <HospitalSetup />
                                    </ProtectedRoute>
                                } />
                                <Route path="/admin/structure" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <FloorWardSetup />
                                    </ProtectedRoute>
                                } />
                                <Route path="/admin/staff" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <StaffManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="/admin/drugs" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <DrugMaster />
                                    </ProtectedRoute>
                                } />
                                <Route path="/admin/audit" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <AuditLog />
                                    </ProtectedRoute>
                                } />

                                {/* Root redirect */}
                                <Route path="/" element={<RoleRedirect />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </AuthProvider>
            </HospitalProvider>
        </BrowserRouter>
    );
}
