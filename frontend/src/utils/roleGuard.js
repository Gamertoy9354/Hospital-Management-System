import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
    RECEPTIONIST: '/receptionist',
    DOCTOR: '/doctor',
    NURSE: '/nurse',
    PHARMACIST: '/pharmacist',
    SUPER_ADMIN: '/admin'
};

export function RoleGuard({ children, allowedRoles }) {
    const { staff, loading } = useAuth();

    if (loading) return null;
    if (!staff) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(staff.role)) {
        return <Navigate to={ROLE_HOME[staff.role] || '/login'} replace />;
    }
    return children;
}

export function getRoleHome(role) {
    return ROLE_HOME[role] || '/login';
}
