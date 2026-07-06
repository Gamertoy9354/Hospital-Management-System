import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('hms_staff');
        const token = localStorage.getItem('hms_token');
        if (stored && token) {
            setStaff(JSON.parse(stored));
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, []);

    const login = (staffData, accessToken, refreshToken) => {
        setStaff(staffData);
        localStorage.setItem('hms_staff', JSON.stringify(staffData));
        localStorage.setItem('hms_token', accessToken);
        localStorage.setItem('hms_refresh', refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch { }
        setStaff(null);
        localStorage.clear();
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
    };

    const updateStaff = (newData) => {
        setStaff(prev => {
            const updated = { ...prev, ...newData };
            localStorage.setItem('hms_staff', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ staff, login, logout, updateStaff, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
