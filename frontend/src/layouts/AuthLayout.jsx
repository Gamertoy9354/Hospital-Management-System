import { Outlet } from 'react-router-dom';
import { useHospital } from '../context/HospitalContext';

export default function AuthLayout() {
    const { config } = useHospital();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #f0f9ff 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Decorative blobs */}
            <div style={{
                position: 'absolute', top: '-10%', right: '-5%',
                width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                borderRadius: '50%'
            }} />
            <div style={{
                position: 'absolute', bottom: '-15%', left: '-10%',
                width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                borderRadius: '50%'
            }} />
            <Outlet />
        </div>
    );
}
