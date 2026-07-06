import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
    Ticket,
    Bed,
    ClipboardList,
    Pill,
    Building2,
    Layers,
    Settings,
    Users,
    FileText,
    Stethoscope,
    Tv
} from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/dashboard/stats')
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;

    const cards = [
        { label: 'OPD Tokens', value: stats?.today_tokens?.total || 0, sub: `${stats?.today_tokens?.waiting || 0} waiting`, color: 'var(--primary-600)', bg: 'var(--primary-50)', icon: Ticket },
        { label: 'Beds Occupied', value: stats?.beds?.occupied || 0, sub: `${stats?.beds?.available || 0} available`, color: 'var(--red-600)', bg: 'var(--red-50)', icon: Bed },
        { label: "Today's Visits", value: stats?.today_visits?.total || 0, sub: `${stats?.today_visits?.open || 0} open`, color: '#7c3aed', bg: 'var(--purple-50)', icon: ClipboardList },
        { label: 'Pending Rx', value: stats?.pending_prescriptions || 0, sub: 'Awaiting approval', color: '#ca8a04', bg: 'var(--yellow-50)', icon: Pill },
        { label: 'IPD Patients', value: stats?.admitted_patients || 0, sub: 'Currently admitted', color: 'var(--green-600)', bg: 'var(--green-50)', icon: Building2 },
        { label: 'Total Beds', value: stats?.beds?.total || 0, sub: `${stats?.beds?.housekeeping || 0} housekeeping`, color: 'var(--gray-600)', bg: 'var(--gray-50)', icon: Layers },
    ];

    const adminLinks = [
        { label: 'Hospital Setup', icon: Settings, path: '/admin/hospital', desc: 'Name, logo, branding' },
        { label: 'Floors & Beds', icon: Layers, path: '/admin/structure', desc: 'Configure hospital structure' },
        { label: 'Staff Management', icon: Users, path: '/admin/staff', desc: 'Add, edit, deactivate staff' },
        { label: 'Drug Master', icon: Pill, path: '/admin/drugs', desc: 'Manage drug catalog' },
        { label: 'Audit Log', icon: FileText, path: '/admin/audit', desc: 'View activity history' },
        { label: 'Reception', icon: Building2, path: '/receptionist', desc: 'Receptionist view' },
        { label: 'Doctor Queue', icon: Stethoscope, path: '/doctor', desc: 'Doctor view' },
        { label: 'Queue Display', icon: Tv, path: '/queue-display', desc: 'TV Display' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--gray-900)' }}>Admin Dashboard</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--gray-500)' }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
            </p>

            {/* Stat grid */}
            <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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

            {/* Quick Links */}
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--gray-800)' }}>Quick Access</h2>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {adminLinks.map(l => (
                    <button
                        key={l.path}
                        onClick={() => l.path === '/queue-display' ? window.open(l.path, '_blank') : navigate(l.path)}
                        className="card"
                        style={{
                            borderRadius: 14, padding: 20, textAlign: 'left',
                            cursor: 'pointer', transition: 'all .15s', border: '1px solid var(--gray-200)',
                            background: '#fff', width: '100%', fontFamily: 'var(--font-sans)'
                        }}
                        onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                        <div style={{ marginBottom: 12, color: 'var(--primary-600)' }}>
                            <l.icon size={28} strokeWidth={2.5} />
                        </div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--gray-900)' }}>{l.label}</div>
                        <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{l.desc}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
