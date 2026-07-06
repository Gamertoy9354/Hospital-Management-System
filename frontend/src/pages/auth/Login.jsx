import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { getRoleHome } from '../../utils/roleGuard';
import api from '../../utils/api';
import { AlertTriangle } from 'lucide-react';

export default function Login() {
    const { config } = useHospital();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ phone: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/auth/login', form);
            if (res.data.skip_otp && res.data.access_token) {
                // DEV MODE: OTP skipped, tokens returned directly
                login(res.data.staff, res.data.access_token, res.data.refresh_token);
                navigate(getRoleHome(res.data.staff.role), { replace: true });
            } else {
                navigate('/verify-otp', { state: { phone: form.phone } });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card shadow-xl w-full" style={{ maxWidth: 420, borderRadius: 20, padding: 32 }}>
                {/* Logo Section */}
                <div className="text-center mb-8">
                    {config.logo_url ? (
                        <img src={config.logo_url} alt="logo"
                            style={{ height: 64, width: 64, margin: '0 auto', borderRadius: 16, objectFit: 'cover', marginBottom: 12 }} />
                    ) : (
                        <div style={{
                            height: 64, width: 64, margin: '0 auto', borderRadius: 16,
                            background: 'linear-gradient(135deg, var(--primary-600), #4f46e5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 12,
                            boxShadow: '0 8px 24px rgba(37,99,235,.3)'
                        }}>
                            {config.hospital_name?.[0] || 'H'}
                        </div>
                    )}
                    <h1 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                        {config.hospital_name}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--gray-500)' }}>
                        Staff Login
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label">Phone Number</label>
                        <input
                            type="tel"
                            className="input"
                            placeholder="10-digit mobile number"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            required
                            maxLength={10}
                            autoComplete="tel"
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="Your password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="alert alert-error mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />
                                Sending OTP...
                            </>
                        ) : 'Continue'}
                    </button>
                </form>

                <p className="text-center text-xs mt-6" style={{ color: 'var(--gray-400)' }}>
                    Authorized staff only.<br />Contact your administrator for access.
                </p>
            </div>
        </div>
    );
}
