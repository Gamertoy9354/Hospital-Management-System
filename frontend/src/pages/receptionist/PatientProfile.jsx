import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { calculateAge, formatDate, formatIST, formatPhone, statusColors } from '../../utils/formatters';
import {
    Droplet,
    PlusCircle,
    User,
    Phone,
    Mail,
    MapPin,
    AlertTriangle,
    ClipboardList,
    X,
    ChevronUp,
    ChevronDown,
    Pill,
    Eye,
    FileText,
    Bed,
    Building2,
    Clock
} from 'lucide-react';

export default function PatientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { staff } = useAuth();
    const [patient, setPatient] = useState(null);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedVisit, setExpandedVisit] = useState(null);
    const [showNewVisit, setShowNewVisit] = useState(false);
    const [visitForm, setVisitForm] = useState({ visit_type: 'OPD', chief_complaint: '', doctor_id: '', department: '' });
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [creating, setCreating] = useState(false);
    const [selectedRx, setSelectedRx] = useState(null);
    const [currentAdmission, setCurrentAdmission] = useState(null);

    const parseDrugs = (drugs) => {
        if (!drugs) return [];
        if (typeof drugs === 'string') {
            try { return JSON.parse(drugs || '[]'); } catch { return []; }
        }
        return drugs;
    };

    useEffect(() => {
        Promise.all([
            api.get(`/api/patients/${id}`),
            api.get('/api/staff/doctors'),
            api.get('/api/dashboard/departments')
        ]).then(([p, d, dept]) => {
            setPatient(p.data.patient);
            setVisits(p.data.visits || []);
            setDoctors(d.data);
            setDepartments(dept.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [id]);

    // Fetch current admission
    useEffect(() => {
        api.get(`/api/admissions/patient/${id}`)
            .then(res => setCurrentAdmission(res.data))
            .catch(() => { });
    }, [id]);

    const createVisit = async () => {
        setCreating(true);
        try {
            const res = await api.post('/api/visits', { patient_id: id, ...visitForm });
            setVisits([res.data, ...visits]);
            setShowNewVisit(false);
            setVisitForm({ visit_type: 'OPD', chief_complaint: '', doctor_id: '', department: '' });
        } catch { } finally { setCreating(false); }
    };

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;
    if (!patient) return <div className="alert alert-error">Patient not found</div>;

    const age = calculateAge(patient.date_of_birth);
    const hasAllergies = patient.allergies?.length > 0;

    const getAdmissionDuration = (admittedAt) => {
        if (!admittedAt) return '';
        const start = new Date(admittedAt);
        const now = new Date();
        const diff = now - start;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getBedLocation = (adm) => {
        if (!adm?.beds) return '';
        const bed = adm.beds;
        const room = bed.rooms;
        const ward = room?.wards;
        const floor = ward?.floors;
        const parts = [];
        if (floor?.name) parts.push(floor.name);
        if (ward?.name) parts.push(ward.name);
        if (room?.room_number) parts.push(`Room ${room.room_number}`);
        if (bed?.bed_number) parts.push(`Bed ${bed.bed_number}`);
        return parts.join(' → ');
    };

    return (
        <div>
            {/* Header */}
            <div className="card mb-6" style={{ borderRadius: 16 }}>
                <div className="card-body" style={{ padding: 24 }}>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 24, fontWeight: 700, color: 'var(--primary-700)'
                            }}>
                                {patient.full_name?.[0]}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>{patient.full_name}</h1>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="badge badge-blue font-mono">{patient.patient_uid}</span>
                                    <span className="text-sm" style={{ color: 'var(--gray-500)' }}>{age.display} · {patient.gender}</span>
                                    {patient.blood_group && (
                                        <span className="badge badge-red flex items-center gap-1">
                                            <Droplet size={12} fill="currentColor" /> {patient.blood_group}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'].includes(staff?.role) && (
                                <button onClick={() => setShowNewVisit(true)} className="btn btn-primary btn-sm flex items-center gap-2">
                                    <PlusCircle size={16} /> New Visit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Guardian info */}
                    <div className="flex flex-wrap gap-4 mt-4 text-sm" style={{ color: 'var(--gray-600)' }}>
                        <span className="flex items-center gap-1.5"><User size={14} className="text-gray-400" /> {patient.guardian_name} ({patient.guardian_relationship || 'Guardian'})</span>
                        <span className="flex items-center gap-1.5"><Phone size={14} className="text-gray-400" /> {formatPhone(patient.guardian_phone)}</span>
                        {patient.guardian_email && <span className="flex items-center gap-1.5"><Mail size={14} className="text-gray-400" /> {patient.guardian_email}</span>}
                        {patient.address && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" /> {patient.address}</span>}
                    </div>

                    {/* Allergy banner */}
                    {hasAllergies && (
                        <div className="alert alert-error mt-4">
                            <AlertTriangle size={18} />
                            <div>
                                <strong>Allergies:</strong> {patient.allergies.join(', ')}
                            </div>
                        </div>
                    )}
                    {patient.chronic_conditions?.length > 0 && (
                        <div className="alert alert-warning mt-2">
                            <ClipboardList size={18} />
                            <div>
                                <strong>Chronic Conditions:</strong> {patient.chronic_conditions.join(', ')}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* IPD Admission Banner */}
            {currentAdmission && (
                <div className="card mb-6" style={{
                    borderRadius: 16,
                    border: '2px solid #7c3aed',
                    background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)'
                }}>
                    <div className="card-body" style={{ padding: 20 }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff'
                            }}>
                                <Bed size={20} />
                            </div>
                            <div>
                                <div className="font-bold" style={{ color: '#7c3aed', fontSize: 15 }}>Currently Admitted (IPD)</div>
                                <div className="text-xs" style={{ color: 'var(--gray-500)' }}>Treatment is ongoing</div>
                            </div>
                        </div>
                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-700)' }}>
                                <Building2 size={14} className="text-primary-600" />
                                <div>
                                    <div className="text-xs uppercase font-bold" style={{ color: 'var(--gray-400)' }}>Location</div>
                                    <div className="font-medium text-xs">{getBedLocation(currentAdmission)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-700)' }}>
                                <Clock size={14} className="text-primary-600" />
                                <div>
                                    <div className="text-xs uppercase font-bold" style={{ color: 'var(--gray-400)' }}>Duration</div>
                                    <div className="font-medium text-xs">{getAdmissionDuration(currentAdmission.created_at)}</div>
                                </div>
                            </div>
                            {currentAdmission.reason && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-700)' }}>
                                    <FileText size={14} className="text-primary-600" />
                                    <div>
                                        <div className="text-xs uppercase font-bold" style={{ color: 'var(--gray-400)' }}>Reason</div>
                                        <div className="font-medium text-xs">{currentAdmission.reason}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Visit Modal */}
            {showNewVisit && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <h2>Start New Visit</h2>
                            <button onClick={() => setShowNewVisit(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="label">Visit Type</label>
                                <select className="select" value={visitForm.visit_type}
                                    onChange={e => setVisitForm({ ...visitForm, visit_type: e.target.value })}>
                                    <option value="OPD">OPD</option>
                                    <option value="IPD">IPD</option>
                                    <option value="EMERGENCY">Emergency</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Department</label>
                                <select className="select" value={visitForm.department}
                                    onChange={e => setVisitForm({ ...visitForm, department: e.target.value })}>
                                    <option value="">Select department</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Doctor</label>
                                <select className="select" value={visitForm.doctor_id}
                                    onChange={e => setVisitForm({ ...visitForm, doctor_id: e.target.value })}>
                                    <option value="">Select doctor</option>
                                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name} ({d.department})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Chief Complaint</label>
                                <textarea className="input" rows={2} placeholder="Primary reason for visit"
                                    value={visitForm.chief_complaint}
                                    onChange={e => setVisitForm({ ...visitForm, chief_complaint: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowNewVisit(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={createVisit} className="btn btn-primary" disabled={creating}>
                                {creating ? 'Creating...' : 'Create Visit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Visit Timeline */}
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--gray-800)' }}>
                Visit History ({visits.length})
            </h2>

            {visits.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><ClipboardList size={48} strokeWidth={1} /></div>
                    <h3>No visits yet</h3>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>This patient has no recorded visits.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visits.map(v => (
                        <div key={v.id} className="card" style={{ borderRadius: 12 }}>
                            <div
                                className="card-body flex items-center justify-between cursor-pointer"
                                style={{ padding: '16px 20px' }}
                                onClick={() => setExpandedVisit(expandedVisit === v.id ? null : v.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: v.status === 'OPEN' ? 'var(--primary-500)' : 'var(--green-500)'
                                    }} />
                                    <div>
                                        <div className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>
                                            {formatDate(v.visit_date)} — {v.visit_type}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                            {v.chief_complaint || 'No complaint recorded'}
                                            {v.staff_profiles?.full_name && ` · Dr. ${v.staff_profiles.full_name}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`badge ${statusColors[v.status] || 'badge-gray'}`}>{v.status}</span>
                                    <span style={{ color: 'var(--gray-400)' }}>
                                        {expandedVisit === v.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </span>
                                </div>
                            </div>

                            {expandedVisit === v.id && (
                                <div style={{ borderTop: '1px solid var(--gray-100)', padding: '16px 20px' }}>
                                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                                        {/* Vitals */}
                                        {v.patient_vitals?.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--gray-400)', letterSpacing: '0.05em' }}>
                                                    Vitals
                                                </h4>
                                                {v.patient_vitals.map(vt => (
                                                    <div key={vt.id} className="text-sm space-y-1" style={{ color: 'var(--gray-600)' }}>
                                                        {vt.weight_kg && <div>Weight: {vt.weight_kg} kg</div>}
                                                        {vt.height_cm && <div>Height: {vt.height_cm} cm</div>}
                                                        {vt.temperature_celsius && <div>Temp: {vt.temperature_celsius}°C</div>}
                                                        {vt.blood_pressure_systolic && <div>BP: {vt.blood_pressure_systolic}/{vt.blood_pressure_diastolic}</div>}
                                                        {vt.heart_rate && <div>HR: {vt.heart_rate} bpm</div>}
                                                        {vt.spo2_percent && <div>SpO2: {vt.spo2_percent}%</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Prescriptions */}
                                        {v.prescriptions?.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--gray-400)', letterSpacing: '0.05em' }}>
                                                    Prescriptions
                                                </h4>
                                                {v.prescriptions.map(rx => (
                                                    <div
                                                        key={rx.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRx(rx);
                                                        }}
                                                        className="mb-2 last:mb-0 p-3 rounded-lg border border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Pill size={14} className="text-primary-600" />
                                                                <span className="font-mono text-xs font-bold" style={{ color: 'var(--primary-600)' }}>{rx.prescription_uid}</span>
                                                                <span className={`badge ${statusColors[rx.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{rx.status}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-primary-600 font-semibold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Eye size={12} /> <span>View</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                                                            <strong>Drugs:</strong> {parseDrugs(rx.drugs).map(d => d.name).join(', ') || 'No drugs listed'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Lab Reports */}
                                        {v.lab_reports?.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--gray-400)', letterSpacing: '0.05em' }}>
                                                    Lab Reports
                                                </h4>
                                                {v.lab_reports.map(lr => (
                                                    <div key={lr.id} className="text-sm mb-1">
                                                        <a href={lr.file_url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5"
                                                            style={{ color: 'var(--primary-600)', textDecoration: 'none' }}>
                                                            <FileText size={14} /> {lr.report_name}
                                                        </a>
                                                        <span className="text-xs ml-2" style={{ color: 'var(--gray-400)' }}>{formatDate(lr.report_date)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-4">
                                        {v.status === 'OPEN' && ['DOCTOR', 'SUPER_ADMIN'].includes(staff?.role) && (
                                            <>
                                                <button onClick={() => navigate(`/doctor/visit/${v.id}`)} className="btn btn-primary btn-sm flex items-center gap-2">
                                                    <ClipboardList size={14} /> Open Visit
                                                </button>
                                                <button onClick={() => navigate(`/doctor/prescription/${v.id}`)} className="btn btn-secondary btn-sm flex items-center gap-2">
                                                    <Pill size={14} /> Write Prescription
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Prescription Detail Modal */}
            {selectedRx && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 800, borderRadius: 20 }}>
                        <div className="modal-header">
                            <h2 className="text-lg font-bold">Prescription: {selectedRx.prescription_uid}</h2>
                            <button onClick={() => setSelectedRx(null)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-sm">
                                    <span className="text-gray-400 block text-xs uppercase font-bold">Status</span>
                                    <span className={`badge ${statusColors[selectedRx.status] || 'badge-gray'}`}>{selectedRx.status}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-400 block text-xs uppercase font-bold">Version</span>
                                    <span>v{selectedRx.version}</span>
                                </div>
                            </div>

                            <h3 className="text-sm font-bold mb-3 uppercase text-gray-400">Medications</h3>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Drug Name</th>
                                            <th>Dose</th>
                                            <th>Freq</th>
                                            <th>Duration</th>
                                            <th style={{ textAlign: 'right' }}>Price</th>
                                            <th>Instructions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parseDrugs(selectedRx.drugs).map((d, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="font-medium">{d.name}</div>
                                                    <div className="text-xs text-gray-400">{d.dosage_form} {d.strength}</div>
                                                </td>
                                                <td>{d.dose}</td>
                                                <td>{d.frequency}</td>
                                                <td>{d.duration_days} days</td>
                                                <td className="text-sm font-mono" style={{ textAlign: 'right', color: 'var(--gray-700)' }}>
                                                    {d.price_per_unit != null ? `₹${Number(d.price_per_unit).toFixed(2)}` : '—'}
                                                </td>
                                                <td className="text-xs text-gray-500">{d.instructions || 'Standard'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {(() => {
                                        const drugList = parseDrugs(selectedRx.drugs);
                                        const total = drugList.reduce((sum, d) => sum + (d.price_per_unit ? Number(d.price_per_unit) : 0), 0);
                                        return total > 0 ? (
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={4} className="text-sm font-semibold" style={{ textAlign: 'right', color: 'var(--gray-600)' }}>
                                                        Estimated Medicine Cost:
                                                    </td>
                                                    <td className="font-mono font-bold" style={{ textAlign: 'right', color: 'var(--green-700)' }}>
                                                        ₹{total.toFixed(2)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        ) : null;
                                    })()}
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setSelectedRx(null)} className="btn btn-primary">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
