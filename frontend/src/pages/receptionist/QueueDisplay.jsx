import { useEffect, useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import api from '../../utils/api';
import { useRealtime } from '../../hooks/useRealtime';

export default function QueueDisplay() {
    const { config } = useHospital();
    const [queue, setQueue] = useState({ current: [], next: [] });
    const [time, setTime] = useState(new Date());

    const fetchQueue = async () => {
        try {
            const res = await api.get('/api/tokens/queue-display');
            setQueue(res.data);
        } catch { }
    };

    useEffect(() => {
        fetchQueue();
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useRealtime('opd_tokens', fetchQueue);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)',
            color: '#fff', padding: '24px 40px',
            display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    {config.logo_url && (
                        <img src={config.logo_url} alt="logo" style={{ height: 64, width: 64, borderRadius: 16, objectFit: 'cover' }} />
                    )}
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>{config.hospital_name}</h1>
                        <p style={{ color: '#93c5fd', fontSize: 18 }}>OPD Token Queue</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 40, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
                        {time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </div>
                    <div style={{ color: '#93c5fd' }}>
                        {time.toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long'
                        })}
                    </div>
                </div>
            </div>

            {/* Now Calling */}
            <div className="mb-8">
                <h2 style={{
                    fontSize: 18, color: '#93c5fd', marginBottom: 16,
                    textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600
                }}>Now Calling</h2>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {queue.current.length === 0 ? (
                        <div style={{
                            background: 'rgba(255,255,255,.08)', borderRadius: 20,
                            padding: 40, textAlign: 'center', color: '#93c5fd', fontSize: 20
                        }}>
                            Waiting for next patient...
                        </div>
                    ) : (
                        queue.current.map((t, i) => (
                            <div key={i} style={{
                                background: '#fff', borderRadius: 20, padding: 40,
                                textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.3)',
                                animation: 'pulse 2s ease infinite'
                            }}>
                                <div style={{ fontSize: 96, fontWeight: 900, color: '#2563eb', lineHeight: 1 }}>
                                    {t.token_number}
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937', marginTop: 8 }}>
                                    {t.patient_name || 'Patient'}
                                </div>
                                <div style={{ color: '#6b7280', marginTop: 4 }}>{t.department}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Next Up */}
            {queue.next.length > 0 && (
                <div>
                    <h2 style={{
                        fontSize: 18, color: '#93c5fd', marginBottom: 16,
                        textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600
                    }}>Next Up</h2>
                    <div className="flex flex-wrap gap-3">
                        {queue.next.map((t, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(8px)',
                                borderRadius: 16, padding: '16px 28px', textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 40, fontWeight: 700 }}>{t.token_number}</div>
                                <div style={{ color: '#93c5fd', fontSize: 13, marginTop: 4 }}>{t.department}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
