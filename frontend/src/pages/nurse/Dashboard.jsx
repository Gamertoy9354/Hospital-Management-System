import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate, statusColors, calculateAge } from '../../utils/formatters';

export default function NurseDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/api/dashboard/stats'),
            api.get('/api/dashboard/recent-patients?limit=10')
        ]).then(([s, r]) => {
            setStats(s.data);
            setRecent(r.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--gray-900)' }}>Nurse Station</h1>

            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="stat-card" style={{ background: 'var(--primary-50)' }}>
                    <div className="stat-value" style={{ color: 'var(--primary-600)' }}>
                        {stats?.today_visits?.open || 0}
                    </div>
                    <div className="stat-label">Open Visits</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--red-50)' }}>
                    <div className="stat-value" style={{ color: 'var(--red-600)' }}>
                        {stats?.admitted_patients || 0}
                    </div>
                    <div className="stat-label">IPD Patients</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--green-50)' }}>
                    <div className="stat-value" style={{ color: 'var(--green-600)' }}>
                        {stats?.beds?.available || 0}
                    </div>
                    <div className="stat-label">Beds Available</div>
                </div>
            </div>

            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--gray-800)' }}>Recent Patients</h2>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr><th>Patient</th><th>UID</th><th>Type</th><th>Chief Complaint</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                        {recent.map(v => (
                            <tr key={v.id}>
                                <td className="font-medium" style={{ color: 'var(--gray-900)' }}>{v.patient_profiles?.full_name || '—'}</td>
                                <td className="font-mono text-xs">{v.patient_profiles?.patient_uid}</td>
                                <td><span className="badge badge-blue">{v.visit_type}</span></td>
                                <td className="text-sm truncate" style={{ maxWidth: 250 }}>{v.chief_complaint || '—'}</td>
                                <td><span className={`badge ${statusColors[v.status] || 'badge-gray'}`}>{v.status}</span></td>
                                <td>
                                    <button onClick={() => navigate(`/patients/${v.patient_profiles?.id}`)} className="btn btn-ghost btn-sm">
                                        View →
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
