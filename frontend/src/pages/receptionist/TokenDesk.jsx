import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useRealtime } from '../../hooks/useRealtime';
import { statusColors } from '../../utils/formatters';
import { Tv, Ticket, Megaphone, Check, X } from 'lucide-react';

export default function TokenDesk() {
    const [tokens, setTokens] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [showIssue, setShowIssue] = useState(false);
    const [form, setForm] = useState({ department: '', doctor_id: '', patient_name: '', guardian_phone: '', patient_id: '' });
    const [patientSearch, setPatientSearch] = useState('');
    const [patientResults, setPatientResults] = useState([]);

    const fetchTokens = async () => {
        try {
            const url = selectedDept ? `/api/tokens/today?department=${selectedDept}` : '/api/tokens/today';
            const res = await api.get(url);
            setTokens(res.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        Promise.all([
            api.get('/api/dashboard/departments'),
            api.get('/api/staff/doctors')
        ]).then(([d, doc]) => {
            setDepartments(d.data);
            setDoctors(doc.data);
        });
    }, []);

    useEffect(() => { fetchTokens(); }, [selectedDept]);
    useRealtime('opd_tokens', fetchTokens);

    const searchPatient = async (q) => {
        setPatientSearch(q);
        if (q.length < 2) { setPatientResults([]); return; }
        const res = await api.get(`/api/patients/search?q=${encodeURIComponent(q)}`);
        setPatientResults(res.data);
    };

    const issueToken = async () => {
        setIssuing(true);
        try {
            await api.post('/api/tokens/issue', form);
            setShowIssue(false);
            setForm({ department: '', doctor_id: '', patient_name: '', guardian_phone: '', patient_id: '' });
            setPatientSearch('');
            setPatientResults([]);
            fetchTokens();
        } catch { } finally { setIssuing(false); }
    };

    const handleAction = async (tokenId, action) => {
        await api.post(`/api/tokens/${tokenId}/${action}`);
        fetchTokens();
    };

    const waiting = tokens.filter(t => t.status === 'WAITING');
    const inProgress = tokens.filter(t => t.status === 'IN_PROGRESS');
    const completed = tokens.filter(t => t.status === 'COMPLETED');

    return (
        <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-900)' }}>OPD Token Desk</h1>
                <div className="flex gap-2">
                    <button onClick={() => window.open('/queue-display', '_blank')} className="btn btn-secondary btn-sm flex items-center gap-2">
                        <Tv size={16} /> Queue Display
                    </button>
                    <button onClick={() => setShowIssue(true)} className="btn btn-primary flex items-center gap-2">
                        <Ticket size={18} /> Issue Token
                    </button>
                </div>
            </div>

            {/* Department filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setSelectedDept('')}
                    className={`btn btn-sm ${!selectedDept ? 'btn-primary' : 'btn-secondary'}`}>All</button>
                {departments.map(d => (
                    <button key={d.id} onClick={() => setSelectedDept(d.name)}
                        className={`btn btn-sm ${selectedDept === d.name ? 'btn-primary' : 'btn-secondary'}`}>{d.name}</button>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="stat-card" style={{ background: 'var(--yellow-50)' }}>
                    <div className="stat-value" style={{ color: '#ca8a04' }}>{waiting.length}</div>
                    <div className="stat-label">Waiting</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--primary-50)' }}>
                    <div className="stat-value" style={{ color: 'var(--primary-600)' }}>{inProgress.length}</div>
                    <div className="stat-label">In Progress</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--green-50)' }}>
                    <div className="stat-value" style={{ color: 'var(--green-600)' }}>{completed.length}</div>
                    <div className="stat-label">Completed</div>
                </div>
            </div>

            {/* Token List */}
            {loading ? (
                <div className="flex justify-center py-8"><div className="spinner" /></div>
            ) : tokens.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><Ticket size={48} strokeWidth={1.5} /></div>
                    <h3>No tokens issued today</h3>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>Issue a token to get started.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Token #</th>
                                <th>Patient</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tokens.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: 36, height: 36, borderRadius: '50%',
                                            background: t.status === 'IN_PROGRESS' ? 'var(--primary-600)' : 'var(--gray-100)',
                                            color: t.status === 'IN_PROGRESS' ? '#fff' : 'var(--gray-700)',
                                            fontWeight: 700, fontSize: 16
                                        }}>
                                            {t.token_number}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="font-medium" style={{ color: 'var(--gray-900)' }}>{t.patient_name || '—'}</div>
                                        {t.guardian_phone && <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{t.guardian_phone}</div>}
                                    </td>
                                    <td className="text-sm">{t.department}</td>
                                    <td><span className={`badge ${statusColors[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                                    <td>
                                        <div className="flex gap-1">
                                            {t.status === 'WAITING' && (
                                                <button onClick={() => handleAction(t.id, 'call')} className="btn btn-primary btn-sm flex items-center gap-1">
                                                    <Megaphone size={14} /> Call
                                                </button>
                                            )}
                                            {t.status === 'IN_PROGRESS' && (
                                                <button onClick={() => handleAction(t.id, 'complete')} className="btn btn-success btn-sm flex items-center gap-1">
                                                    <Check size={14} /> Done
                                                </button>
                                            )}
                                            {t.status === 'WAITING' && (
                                                <button onClick={() => handleAction(t.id, 'skip')} className="btn btn-ghost btn-sm">
                                                    Skip
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Issue Token Modal */}
            {showIssue && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h2>Issue New Token</h2>
                            <button onClick={() => setShowIssue(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="label">Department *</label>
                                <select className="select" value={form.department}
                                    onChange={e => setForm({ ...form, department: e.target.value })}>
                                    <option value="">Select</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Doctor</label>
                                <select className="select" value={form.doctor_id}
                                    onChange={e => setForm({ ...form, doctor_id: e.target.value })}>
                                    <option value="">Any available</option>
                                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
                                </select>
                            </div>

                            {/* Patient lookup */}
                            <div className="form-group">
                                <label className="label">Search Patient</label>
                                <input className="input" placeholder="Search by name, phone, or UID..."
                                    value={patientSearch} onChange={e => searchPatient(e.target.value)} />
                                {patientResults.length > 0 && (
                                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                                        {patientResults.map(p => (
                                            <div key={p.id}
                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: 14, transition: 'background .1s' }}
                                                onClick={() => {
                                                    setForm({ ...form, patient_id: p.id, patient_name: p.full_name, guardian_phone: p.guardian_phone });
                                                    setPatientResults([]);
                                                    setPatientSearch(p.full_name);
                                                }}
                                                onMouseOver={e => e.target.style.background = 'var(--gray-50)'}
                                                onMouseOut={e => e.target.style.background = '#fff'}
                                            >
                                                <strong>{p.full_name}</strong>
                                                <span className="text-xs ml-2" style={{ color: 'var(--gray-400)' }}>{p.patient_uid}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="label">Or Walk-in Name</label>
                                <input className="input" placeholder="Patient name (if not registered)"
                                    value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Phone</label>
                                <input className="input" placeholder="Guardian phone" value={form.guardian_phone}
                                    onChange={e => setForm({ ...form, guardian_phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowIssue(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={issueToken} className="btn btn-primary flex items-center gap-2" disabled={issuing || !form.department}>
                                {issuing ? 'Issuing...' : <><Ticket size={18} /> Issue Token</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
