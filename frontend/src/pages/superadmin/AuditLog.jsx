import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatIST } from '../../utils/formatters';
import { History, Trash2, AlertTriangle } from 'lucide-react';

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [clearing, setClearing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 25 });
            if (actionFilter) params.append('action', actionFilter);
            if (entityFilter) params.append('entity_type', entityFilter);
            const res = await api.get(`/api/dashboard/audit?${params}`);
            setLogs(res.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, [page, actionFilter, entityFilter]);

    const actionBadge = (action) => {
        if (action.includes('CREATE') || action.includes('REGISTER') || action.includes('ADMITTED')) return 'badge-green';
        if (action.includes('DELETE') || action.includes('DISCHARGED')) return 'badge-red';
        if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'badge-purple';
        if (action.includes('UPDATE') || action.includes('UPLOAD')) return 'badge-blue';
        return 'badge-gray';
    };

    const handleClearAll = async () => {
        setClearing(true);
        try {
            const res = await api.post('/api/dashboard/clear-all-data');
            alert(`✅ Data cleared!\n\n${Object.entries(res.data.cleared).map(([k, v]) => `${k}: ${v}`).join('\n')}`);
            setShowClearConfirm(false);
            fetchLogs();
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.error || err.message));
        } finally { setClearing(false); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                    <History className="text-primary-600" size={24} /> Audit Log
                </h1>
                <button onClick={() => setShowClearConfirm(true)}
                    className="btn btn-sm flex items-center gap-2"
                    style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' }}>
                    <Trash2 size={14} /> Clear All Data
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-6 flex-wrap">
                <select className="select" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                    style={{ maxWidth: 200 }}>
                    <option value="">All Actions</option>
                    {['LOGIN', 'LOGOUT', 'PATIENT_REGISTERED', 'VISIT_CREATED', 'PRESCRIPTION_CREATED',
                        'PRESCRIPTION_APPROVED', 'DISPENSED', 'PATIENT_ADMITTED', 'PATIENT_DISCHARGED',
                        'STAFF_CREATED', 'LAB_REPORT_UPLOADED', 'BED_MARKED_CLEAN'
                    ].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select className="select" value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
                    style={{ maxWidth: 200 }}>
                    <option value="">All Entities</option>
                    {['auth', 'patient', 'visit', 'prescription', 'staff', 'bed', 'lab_report'].map(e =>
                        <option key={e} value={e}>{e}</option>
                    )}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><div className="spinner" /></div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Staff</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Entity ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-4" style={{ color: 'var(--gray-400)' }}>No logs found</td></tr>
                                ) : logs.map(l => (
                                    <tr key={l.id}>
                                        <td className="text-xs whitespace-nowrap" style={{ color: 'var(--gray-500)' }}>
                                            {formatIST(l.created_at)}
                                        </td>
                                        <td className="text-sm font-medium" style={{ color: 'var(--gray-900)' }}>
                                            {l.staff_profiles?.full_name || '—'}
                                        </td>
                                        <td><span className={`badge ${actionBadge(l.action)}`}>{l.action}</span></td>
                                        <td className="text-sm">{l.entity_type || '—'}</td>
                                        <td className="font-mono text-xs" style={{ color: 'var(--gray-400)', maxWidth: 120 }}>
                                            {l.entity_id ? l.entity_id.slice(0, 8) + '…' : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn btn-secondary btn-sm" disabled={page === 1}>
                            ← Previous
                        </button>
                        <span className="text-sm" style={{ color: 'var(--gray-500)' }}>Page {page}</span>
                        <button onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm" disabled={logs.length < 25}>
                            Next →
                        </button>
                    </div>
                </>
            )}
            {/* Clear All Confirmation Modal */}
            {showClearConfirm && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 440, borderRadius: 20 }}>
                        <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                                background: 'var(--red-50)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <AlertTriangle size={28} style={{ color: 'var(--red-600)' }} />
                            </div>
                            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--gray-900)' }}>
                                Clear All System Data?
                            </h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--gray-500)' }}>
                                This will permanently delete <strong>all patients, visits, prescriptions, tokens, admissions,
                                    beds, rooms, wards, floors, staff, hospital config, and audit logs</strong>.
                                Your <strong>admin account, departments, and drug master</strong> will be preserved.
                            </p>
                            <div className="alert alert-error mb-4" style={{ textAlign: 'left' }}>
                                <AlertTriangle size={16} />
                                <span className="text-sm">This action <strong>cannot be undone</strong>.</span>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button onClick={handleClearAll} className="btn btn-danger flex items-center gap-2" disabled={clearing}>
                                    <Trash2 size={16} /> {clearing ? 'Clearing...' : 'Yes, Clear Everything'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
