import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatIST, statusColors } from '../../utils/formatters';
import { Pill, Search, ArrowLeft, FileText, Check } from 'lucide-react';

export default function PharmacistDashboard() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('APPROVED');

    const fetchPrescriptions = async () => {
        try {
            // Fetch recent prescriptions (the backend doesn't have a pharmacist-specific endpoint,
            // so we'll need the admin to have added it, or we just use dashboard)
            const res = await api.get('/api/dashboard/stats');
            // For now, load all patients and their prescriptions via search
            // In production, a dedicated /api/prescriptions/queue endpoint would be ideal
            setLoading(false);
        } catch { setLoading(false); }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientPrescriptions, setPatientPrescriptions] = useState([]);

    const searchPatients = async (q) => {
        setSearchQuery(q);
        if (q.length < 2) { setPatients([]); return; }
        const res = await api.get(`/api/patients/search?q=${encodeURIComponent(q)}`);
        setPatients(res.data);
    };

    const loadPrescriptions = async (patientId) => {
        const res = await api.get(`/api/prescriptions/patient/${patientId}`);
        setPatientPrescriptions(res.data);
        setSelectedPatient(patientId);
    };

    const markDispensed = async (prescriptionId) => {
        await api.post(`/api/prescriptions/${prescriptionId}/dispense`);
        loadPrescriptions(selectedPatient);
    };

    const downloadPdf = async (prescriptionId) => {
        const res = await api.get(`/api/prescriptions/${prescriptionId}/pdf`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `prescription_${prescriptionId}.pdf`);
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--gray-900)' }}>
                <Pill className="text-primary-600" size={28} /> Pharmacy
            </h1>

            {/* Search Patient */}
            <div className="search-input-wrap mb-6">
                <Search className="search-icon" size={20} />
                <input className="input input-lg" placeholder="Search patient to view prescriptions..."
                    value={searchQuery} onChange={e => searchPatients(e.target.value)} style={{ paddingLeft: 48 }} />
            </div>

            {patients.length > 0 && !selectedPatient && (
                <div className="card mb-6" style={{ borderRadius: 14 }}>
                    <div className="card-body p-0">
                        {patients.map(p => (
                            <div key={p.id} onClick={() => loadPrescriptions(p.id)}
                                style={{
                                    padding: '12px 20px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--gray-100)',
                                    transition: 'background .1s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                onMouseOut={e => e.currentTarget.style.background = '#fff'}
                            >
                                <div className="font-medium" style={{ color: 'var(--gray-900)' }}>{p.full_name}</div>
                                <div className="text-sm" style={{ color: 'var(--gray-500)' }}>
                                    {p.patient_uid} · {p.guardian_phone}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prescriptions */}
            {patientPrescriptions.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={() => {
                            setSelectedPatient(null);
                            setPatientPrescriptions([]);
                            setPatients([]);
                            setSearchQuery('');
                        }} className="btn btn-ghost btn-sm">
                            <ArrowLeft size={16} /> Back to search
                        </button>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--gray-800)' }}>
                            Prescriptions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {patientPrescriptions.map(rx => (
                            <div key={rx.id} className="card" style={{ borderRadius: 14 }}>
                                <div className="card-body" style={{ padding: 20 }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-semibold" style={{ color: 'var(--primary-600)' }}>
                                                {rx.prescription_uid}
                                            </span>
                                            <span className={`badge ${statusColors[rx.status] || 'badge-gray'}`}>{rx.status}</span>
                                            <span className="text-xs" style={{ color: 'var(--gray-400)' }}>v{rx.version}</span>
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--gray-400)' }}>
                                            {formatIST(rx.created_at)}
                                        </div>
                                    </div>

                                    {rx.diagnosis && (
                                        <div className="text-sm mb-3" style={{ color: 'var(--gray-600)' }}>
                                            <strong>Dx:</strong> {rx.diagnosis}
                                        </div>
                                    )}

                                    {/* Drug list */}
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr><th>#</th><th>Drug</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
                                            </thead>
                                            <tbody>
                                                {(typeof rx.drugs === 'string' ? JSON.parse(rx.drugs || '[]') : (rx.drugs || [])).map((d, i) => (
                                                    <tr key={i}>
                                                        <td>{i + 1}</td>
                                                        <td className="font-medium">{d.name} <span className="text-xs" style={{ color: 'var(--gray-400)' }}>{d.strength}</span></td>
                                                        <td>{d.dose || '—'}</td>
                                                        <td>{d.frequency}</td>
                                                        <td>{d.duration_days}d</td>
                                                        <td className="text-xs" style={{ color: 'var(--gray-500)' }}>{d.instructions || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => downloadPdf(rx.id)} className="btn btn-secondary btn-sm">
                                            <FileText size={16} /> Download PDF
                                        </button>
                                        {rx.status === 'APPROVED' && (
                                            <button onClick={() => markDispensed(rx.id)} className="btn btn-success btn-sm">
                                                <Check size={16} /> Mark Dispensed
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!selectedPatient && patients.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Pill size={48} strokeWidth={1.5} />
                    </div>
                    <h3>Search for a patient</h3>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                        Look up a patient to view and dispense their prescriptions.
                    </p>
                </div>
            )}
        </div>
    );
}
