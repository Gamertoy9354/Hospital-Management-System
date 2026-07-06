import { useState } from 'react';
import api from '../../utils/api';
import {
    Search, FileText, IndianRupee, CheckCircle2, Clock,
    User, Pill, ExternalLink, AlertTriangle, Package
} from 'lucide-react';

export default function Billing() {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRx, setSelectedRx] = useState(null);
    const [confirming, setConfirming] = useState(false);

    const searchBilling = async (q) => {
        setSearch(q);
        if (q.length < 2) { setResults([]); return; }
        setLoading(true);
        try {
            const res = await api.get(`/api/prescriptions/billing/search?q=${encodeURIComponent(q)}`);
            setResults(res.data);
        } catch { } finally { setLoading(false); }
    };

    const confirmPayment = async (rxId) => {
        if (!window.confirm('Confirm payment received? This will deduct medicine stock in real-time.')) return;
        setConfirming(true);
        try {
            const res = await api.post(`/api/prescriptions/${rxId}/confirm-payment`);
            alert(`✅ ${res.data.message}\n\nStock Updates:\n${res.data.stock_updates?.map(s =>
                s.error ? `${s.drug}: Error` : `${s.drug}: ${s.previous} → ${s.new}`
            ).join('\n') || 'None'}`);

            // Refresh
            searchBilling(search);
            setSelectedRx(null);
        } catch (err) {
            alert('Payment failed: ' + (err.response?.data?.error || err.message));
        } finally { setConfirming(false); }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                <IndianRupee className="text-primary-600" size={24} /> Billing & Payments
            </h1>

            {/* Search */}
            <div className="search-input-wrap mb-6">
                <Search className="search-icon" size={20} />
                <input className="input" placeholder="Search by Patient UID or Name..."
                    value={search} onChange={e => searchBilling(e.target.value)}
                    style={{ paddingLeft: 44, maxWidth: 480 }} />
            </div>

            {loading && <div className="flex justify-center py-8"><div className="spinner" /></div>}

            {/* Results */}
            {!loading && results.length === 0 && search.length >= 2 && (
                <div className="text-center py-8" style={{ color: 'var(--gray-400)' }}>
                    No prescriptions found for "{search}"
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-4">
                    {results.map(rx => (
                        <div key={rx.id} className="card" style={{ borderRadius: 14, overflow: 'hidden' }}>
                            <div className="card-body" style={{ padding: 16 }}>
                                <div className="flex items-start justify-between flex-wrap gap-3">
                                    {/* Patient info */}
                                    <div className="flex items-center gap-3">
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: 'var(--primary-100)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--primary-700)', fontWeight: 700
                                        }}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <div className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                                                {rx.patient?.full_name}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                                <span className="font-mono">{rx.patient?.patient_uid}</span>
                                                {rx.patient?.guardian_phone && ` · ${rx.patient.guardian_phone}`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status badge + Amount */}
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="font-bold font-mono" style={{ color: 'var(--gray-900)', fontSize: 18 }}>
                                                ₹{rx.grand_total?.toFixed(2)}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--gray-400)' }}>
                                                Med: ₹{rx.medicine_total?.toFixed(2)} + Fee: ₹{rx.consultation_fee?.toFixed(2)}
                                            </div>
                                        </div>
                                        {rx.status === 'DISPENSED' ? (
                                            <span className="badge badge-green flex items-center gap-1" style={{ padding: '6px 12px' }}>
                                                <CheckCircle2 size={14} /> PAID
                                            </span>
                                        ) : (
                                            <span className="badge badge-yellow flex items-center gap-1" style={{ padding: '6px 12px' }}>
                                                <Clock size={14} /> UNPAID
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Prescription info */}
                                <div className="mt-3 flex items-center flex-wrap gap-2 text-xs" style={{ color: 'var(--gray-500)' }}>
                                    <span className="badge badge-blue font-mono">{rx.prescription_uid}</span>
                                    <span>Dx: {rx.diagnosis || 'N/A'}</span>
                                    <span>by Dr. {rx.staff_profiles?.full_name}</span>
                                    <span>· {new Date(rx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>

                                {/* Drugs summary */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(rx.drugs || []).map((d, i) => (
                                        <span key={i} className="badge" style={{
                                            background: 'var(--gray-100)', color: 'var(--gray-700)',
                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11
                                        }}>
                                            <Pill size={10} /> {d.name}
                                            {d.price_per_unit != null && <span style={{ color: 'var(--green-600)' }}>₹{Number(d.price_per_unit).toFixed(0)}</span>}
                                        </span>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <button onClick={() => setSelectedRx(rx)}
                                        className="btn btn-sm flex items-center gap-1"
                                        style={{ border: '1px solid var(--gray-200)', background: '#fff' }}>
                                        <FileText size={13} /> View Details
                                    </button>

                                    {rx.status !== 'DISPENSED' && (
                                        <button onClick={() => confirmPayment(rx.id)}
                                            className="btn btn-sm btn-success flex items-center gap-1"
                                            disabled={confirming}
                                            style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none' }}>
                                            <CheckCircle2 size={13} /> {confirming ? 'Processing...' : 'Confirm Payment'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedRx && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="flex items-center gap-2">
                                    <FileText size={18} /> Prescription Bill
                                </h2>
                                <div className="text-xs mt-1" style={{ color: 'var(--gray-400)' }}>
                                    {selectedRx.prescription_uid} · {new Date(selectedRx.created_at).toLocaleDateString('en-IN')}
                                </div>
                            </div>
                            <button onClick={() => setSelectedRx(null)} className="btn btn-ghost btn-sm">&times;</button>
                        </div>
                        <div className="modal-body">
                            {/* Patient */}
                            <div style={{
                                background: 'var(--gray-50)', borderRadius: 10, padding: 12, marginBottom: 16,
                                borderLeft: '4px solid var(--primary-600)'
                            }}>
                                <div className="flex justify-between">
                                    <div>
                                        <div className="font-semibold">{selectedRx.patient?.full_name}</div>
                                        <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                            {selectedRx.patient?.patient_uid} · {selectedRx.patient?.guardian_phone}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm">Dr. {selectedRx.staff_profiles?.full_name}</div>
                                        <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{selectedRx.staff_profiles?.department}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Diagnosis */}
                            {selectedRx.diagnosis && (
                                <div className="mb-3">
                                    <span className="text-xs font-bold" style={{ color: 'var(--gray-500)' }}>DIAGNOSIS</span>
                                    <div className="text-sm">{selectedRx.diagnosis}</div>
                                </div>
                            )}

                            {/* Medicine table with billing */}
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Medicine</th>
                                            <th>Dose / Freq / Duration</th>
                                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedRx.drugs || []).map((d, i) => (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>
                                                    <div className="font-medium">{d.name}</div>
                                                    <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{d.dosage_form} {d.strength}</div>
                                                </td>
                                                <td className="text-sm">{d.dose} | {d.frequency} | {d.duration_days}d</td>
                                                <td className="font-mono text-sm" style={{ textAlign: 'right' }}>
                                                    {d.price_per_unit != null ? `₹${Number(d.price_per_unit).toFixed(2)}` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bill summary */}
                            <div style={{
                                background: 'var(--gray-50)', borderRadius: 10, padding: 14, marginTop: 16
                            }}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span style={{ color: 'var(--gray-600)' }}>Medicine Total</span>
                                    <span className="font-mono">₹{selectedRx.medicine_total?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span style={{ color: 'var(--gray-600)' }}>Consultation Fee</span>
                                    <span className="font-mono">₹{selectedRx.consultation_fee?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-2" style={{ borderTop: '2px solid var(--gray-300)' }}>
                                    <span className="font-bold" style={{ color: 'var(--gray-900)' }}>Grand Total</span>
                                    <span className="font-bold font-mono" style={{ color: 'var(--primary-700)', fontSize: 18 }}>
                                        ₹{selectedRx.grand_total?.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Payment status */}
                            <div className="text-center mt-4">
                                {selectedRx.status === 'DISPENSED' ? (
                                    <div className="flex items-center justify-center gap-2" style={{ color: 'var(--green-600)' }}>
                                        <CheckCircle2 size={20} />
                                        <span className="font-bold">Payment Confirmed</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2" style={{ color: 'var(--yellow-600)' }}>
                                        <AlertTriangle size={20} />
                                        <span className="font-bold">Payment Pending</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setSelectedRx(null)} className="btn btn-secondary">Close</button>
                            {selectedRx.status !== 'DISPENSED' && (
                                <button onClick={() => { confirmPayment(selectedRx.id); }}
                                    className="btn btn-success flex items-center gap-2"
                                    disabled={confirming}
                                    style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none' }}>
                                    <IndianRupee size={16} /> {confirming ? 'Processing...' : 'Confirm Payment & Deduct Stock'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
