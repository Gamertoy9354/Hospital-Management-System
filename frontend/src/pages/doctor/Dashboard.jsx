import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useRealtime } from '../../hooks/useRealtime';
import { formatIST, statusColors, calculateAge } from '../../utils/formatters';
import { Activity, Clock, Check, Megaphone, Sparkles, User, UserCheck } from 'lucide-react';

export default function DoctorDashboard() {
    const { staff } = useAuth();
    const navigate = useNavigate();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        if (!staff) return;
        try {
            const res = await api.get('/api/tokens/today');
            // Filter: show if assigned to this doctor, OR if unassigned but in doctor's department
            // If Super Admin, show everything to avoid "missing tokens" confusion
            const myTokens = res.data.filter(t => {
                const assignedToMe = t.doctor_id === staff.id;
                const unassignedInMyDept = !t.doctor_id && (t.department === staff.department);
                const isSuperAdmin = staff.role === 'SUPER_ADMIN';
                return assignedToMe || unassignedInMyDept || isSuperAdmin;
            });
            setTokens(myTokens);
        } catch (err) {
            console.error('Failed to fetch queue:', err);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        if (staff) fetchQueue();
    }, [staff]);

    useRealtime('opd_tokens', fetchQueue);

    const waitingTokens = tokens.filter(t => t.status === 'WAITING');
    const currentToken = tokens.filter(t => t.status === 'IN_PROGRESS');

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-900)' }}>
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {staff?.role === 'DOCTOR' ? 'Dr. ' : ''}{staff?.full_name}
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="stat-card" style={{ background: 'var(--yellow-50)' }}>
                    <div className="stat-value" style={{ color: '#ca8a04' }}>{waitingTokens.length}</div>
                    <div className="stat-label">Waiting Patients</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--primary-50)' }}>
                    <div className="stat-value" style={{ color: 'var(--primary-600)' }}>{currentToken.length}</div>
                    <div className="stat-label">Currently Seeing</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--green-50)' }}>
                    <div className="stat-value" style={{ color: 'var(--green-600)' }}>
                        {tokens.filter(t => t.status === 'COMPLETED').length}
                    </div>
                    <div className="stat-label">Completed Today</div>
                </div>
            </div>

            {/* Current Patient */}
            {currentToken.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                        <Activity className="text-primary-600" size={20} /> Currently Seeing
                    </h2>
                    {currentToken.map(t => (
                        <div key={t.id} className="card" style={{
                            borderRadius: 16, borderLeft: '4px solid var(--primary-600)', padding: 24
                        }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: 'var(--primary-600)', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 24, fontWeight: 700
                                    }}>
                                        {t.token_number}
                                    </div>
                                    <div>
                                        <div className="text-lg font-semibold" style={{ color: 'var(--gray-900)' }}>
                                            {t.patient_name || 'Walk-in Patient'}
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--gray-500)' }}>{t.department}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {t.patient_id && (
                                        <button onClick={() => navigate(`/patients/${t.patient_id}`)}
                                            className="btn btn-secondary btn-sm flex items-center gap-1">
                                            <User size={14} /> View Profile
                                        </button>
                                    )}
                                    <button onClick={async () => {
                                        await api.post(`/api/tokens/${t.id}/complete`);
                                        fetchQueue();
                                    }} className="btn btn-success btn-sm flex items-center gap-1">
                                        <Check size={14} /> Complete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Waiting Queue */}
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                <Clock className="text-yellow-600" size={20} /> Waiting Queue
            </h2>
            {loading ? (
                <div className="flex justify-center py-8"><div className="spinner" /></div>
            ) : waitingTokens.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <UserCheck size={48} strokeWidth={1.5} />
                    </div>
                    <h3>No patients waiting</h3>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>All caught up!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {waitingTokens.map(t => (
                        <div key={t.id} className="card" style={{
                            borderRadius: 12, padding: '14px 20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: 'var(--yellow-100)', color: '#854d0e',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 16
                                }}>
                                    {t.token_number}
                                </div>
                                <div>
                                    <div className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
                                        {t.patient_name || 'Walk-in'}
                                    </div>
                                    <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{t.department}</div>
                                </div>
                            </div>
                            <button onClick={async () => {
                                await api.post(`/api/tokens/${t.id}/call`);
                                fetchQueue();
                            }} className="btn btn-primary btn-sm flex items-center gap-1">
                                <Megaphone size={14} /> Call Next
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
