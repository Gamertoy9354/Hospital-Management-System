import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { Ticket, Building2, Bed, ClipboardList, PlusCircle, Search, Tv, ArrowRight } from 'lucide-react';

export default function ReceptionistDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/api/dashboard/stats'),
            api.get('/api/dashboard/recent-patients?limit=8')
        ]).then(([s, r]) => {
            setStats(s.data);
            setRecent(r.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center" style={{ height: 400 }}>
            <div className="spinner" />
        </div>
    );

    const cards = [
        { label: 'OPD Tokens Today', value: stats?.today_tokens?.total || 0, sub: `${stats?.today_tokens?.waiting || 0} waiting`, color: 'var(--primary-600)', bg: 'var(--primary-50)', icon: Ticket },
        { label: 'Admitted Patients', value: stats?.admitted_patients || 0, sub: `${stats?.beds?.occupied || 0} beds used`, color: 'var(--red-600)', bg: 'var(--red-50)', icon: Building2 },
        { label: 'Available Beds', value: stats?.beds?.available || 0, sub: `of ${stats?.beds?.total || 0} total`, color: 'var(--green-600)', bg: 'var(--green-50)', icon: Bed },
        { label: "Today's Visits", value: stats?.today_visits?.total || 0, sub: `${stats?.today_visits?.open || 0} open`, color: '#7c3aed', bg: 'var(--purple-50)', icon: ClipboardList },
    ];

    const quickActions = [
        { label: 'Register Patient', icon: PlusCircle, path: '/receptionist/patients/new', color: 'var(--primary-600)' },
        { label: 'Search Patient', icon: Search, path: '/receptionist/patients', color: 'var(--green-600)' },
        { label: 'Issue Token', icon: Ticket, path: '/receptionist/tokens', color: '#7c3aed' },
        { label: 'Bed Map', icon: Bed, path: '/receptionist/beds', color: 'var(--red-600)' },
        { label: 'Queue Display', icon: Tv, path: '/queue-display', color: '#ca8a04', external: true },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-900)' }}>Reception</h1>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {cards.map(c => (
                    <div key={c.label} className="stat-card">
                        <div className="flex items-center gap-3 mb-3">
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: c.color
                            }}>
                                <c.icon size={22} />
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--gray-500)' }}>{c.label}</span>
                        </div>
                        <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
                        <div className="stat-label">{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--gray-800)' }}>Quick Actions</h2>
            <div className="flex flex-wrap gap-3 mb-6">
                {quickActions.map(a => (
                    <button
                        key={a.label}
                        onClick={() => a.external ? window.open(a.path, '_blank') : navigate(a.path)}
                        className="btn btn-secondary flex items-center gap-2"
                        style={{ fontSize: 14 }}
                    >
                        <a.icon size={18} />
                        {a.label}
                    </button>
                ))}
            </div>

            {/* Recent Visits */}
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--gray-800)' }}>Recent Visits</h2>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            <th>UID</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-4" style={{ color: 'var(--gray-400)' }}>No visits today</td></tr>
                        ) : recent.map(v => (
                            <tr key={v.id}>
                                <td className="font-medium" style={{ color: 'var(--gray-900)' }}>
                                    {v.patient_profiles?.full_name || '—'}
                                </td>
                                <td className="font-mono text-xs">{v.patient_profiles?.patient_uid}</td>
                                <td>{formatDate(v.visit_date)}</td>
                                <td><span className="badge badge-blue">{v.visit_type}</span></td>
                                <td><span className={`badge ${v.status === 'OPEN' ? 'badge-yellow' : 'badge-green'}`}>{v.status}</span></td>
                                <td>
                                    <button
                                        onClick={() => navigate(`/patients/${v.patient_profiles?.id}`)}
                                        className="btn btn-ghost btn-sm flex items-center gap-1"
                                    >
                                        View <ArrowRight size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
