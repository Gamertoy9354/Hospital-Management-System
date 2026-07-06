import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Smartphone, AlertTriangle } from 'lucide-react';

export default function VerifyOTP() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const phone = location.state?.phone;
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const refs = useRef([]);

    useEffect(() => {
        if (!phone) navigate('/login');
        else refs.current[0]?.focus();
    }, [phone, navigate]);

    const handleChange = (i, val) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...otp];
        next[i] = val.slice(-1);
        setOtp(next);
        if (val && i < 5) refs.current[i + 1]?.focus();
    };

    const handleKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !otp[i] && i > 0) {
            refs.current[i - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const next = [...otp];
        for (let i = 0; i < text.length; i++) next[i] = text[i];
        setOtp(next);
        if (text.length >= 6) refs.current[5]?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpStr = otp.join('');
        if (otpStr.length !== 6) {
            setError('Enter the full 6-digit OTP');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/auth/verify-otp', { phone, otp: otpStr });
            login(res.data.staff, res.data.access_token, res.data.refresh_token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
            setOtp(['', '', '', '', '', '']);
            refs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card shadow-xl w-full" style={{ maxWidth: 420, borderRadius: 20, padding: 32 }}>
                <div className="text-center mb-8">
                    <div style={{
                        height: 64, width: 64, margin: '0 auto', borderRadius: 16,
                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--green-600)', marginBottom: 12
                    }}>
                        <Smartphone size={32} />
                    </div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                        Verify OTP
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--gray-500)' }}>
                        Enter the 6-digit code sent to +91 {phone}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => refs.current[i] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                style={{
                                    width: 48, height: 56, textAlign: 'center',
                                    fontSize: 22, fontWeight: 700,
                                    border: '2px solid var(--gray-300)',
                                    borderRadius: 14, outline: 'none',
                                    transition: 'border-color .15s, box-shadow .15s',
                                    fontFamily: 'var(--font-sans)'
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = 'var(--primary-500)';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.15)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = 'var(--gray-300)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        ))}
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
                                Verifying...
                            </>
                        ) : 'Login'}
                    </button>
                </form>

                <button
                    onClick={() => navigate('/login')}
                    className="btn btn-ghost w-full mt-4"
                    style={{ color: 'var(--gray-500)' }}
                >
                    ← Back to Login
                </button>
            </div>
        </div>
    );
}
