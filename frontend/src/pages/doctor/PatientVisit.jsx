import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { calculateAge, formatDate, formatIST } from '../../utils/formatters';
import {
    ArrowLeft,
    Droplet,
    Pill,
    Check,
    AlertTriangle,
    Activity,
    Weight,
    Ruler,
    Thermometer,
    Heart,
    Wind,
    FileText,
    History,
    X,
    ClipboardList,
    Bed,
    Building2,
    Clock,
    Plus,
    Send,
    LogOut as DischargeIcon
} from 'lucide-react';

export default function PatientVisit() {
    const { visitId } = useParams();
    const navigate = useNavigate();
    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [vitals, setVitals] = useState({
        weight_kg: '', height_cm: '', temperature_celsius: '',
        blood_pressure_systolic: '', blood_pressure_diastolic: '',
        heart_rate: '', spo2_percent: '', respiratory_rate: '', bmi: ''
    });
    const [savingVitals, setSavingVitals] = useState(false);
    const [notes, setNotes] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [saving, setSaving] = useState(false);
    const [pastPrescriptions, setPastPrescriptions] = useState([]);
    const [selectedRx, setSelectedRx] = useState(null);

    // ── Admission state ──
    const [admission, setAdmission] = useState(null);
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [availableBeds, setAvailableBeds] = useState([]);
    const [selectedBedId, setSelectedBedId] = useState('');
    const [admitReason, setAdmitReason] = useState('');
    const [admitting, setAdmitting] = useState(false);

    // ── Progress notes state ──
    const [progressNotes, setProgressNotes] = useState([]);
    const [showAddNote, setShowAddNote] = useState(false);
    const [noteForm, setNoteForm] = useState({ title: '', content: '', note_type: 'PROGRESS' });
    const [savingNote, setSavingNote] = useState(false);

    // Modals
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [dischargeSummary, setDischargeSummary] = useState('');
    const [admissionFee, setAdmissionFee] = useState('');
    const [discharging, setDischarging] = useState(false);

    const parseDrugs = (drugs) => {
        if (!drugs) return [];
        if (typeof drugs === 'string') return JSON.parse(drugs || '[]');
        return drugs;
    };

    // ── Duration helper ──
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

    // ── Fetch visit data ──
    const fetchVisit = () => {
        api.get(`/api/visits/${visitId}`)
            .then(res => {
                setVisit(res.data);
                setNotes(res.data.doctor_notes || '');
                setDiagnosis(res.data.diagnosis || '');
                setAdmission(res.data.current_admission || null);
                if (res.data.patient_vitals?.length > 0) {
                    const v = res.data.patient_vitals[0];
                    setVitals({
                        weight_kg: v.weight_kg || '',
                        height_cm: v.height_cm || '',
                        temperature_celsius: v.temperature_celsius || '',
                        blood_pressure_systolic: v.blood_pressure_systolic || '',
                        blood_pressure_diastolic: v.blood_pressure_diastolic || '',
                        heart_rate: v.heart_rate || '',
                        spo2_percent: v.spo2_percent || '',
                        respiratory_rate: v.respiratory_rate || '',
                        bmi: v.bmi || ''
                    });
                }
                // Fetch progress notes if admitted
                if (res.data.current_admission) {
                    fetchProgressNotes(res.data.current_admission.id);
                }
            })
            .catch((err) => {
                setError(err.response?.data?.error || 'Failed to load visit');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchVisit(); }, [visitId]);

    useEffect(() => {
        if (visit?.patient_id) {
            api.get(`/api/prescriptions/patient/${visit.patient_id}`)
                .then(res => setPastPrescriptions(res.data))
                .catch(() => { });
        }
    }, [visit?.patient_id]);

    // ── Progress notes ──
    const fetchProgressNotes = async (admissionId) => {
        try {
            const res = await api.get(`/api/admissions/${admissionId}/notes`);
            setProgressNotes(res.data);
        } catch { }
    };

    const handleAddNote = async () => {
        if (!noteForm.content.trim()) return;
        setSavingNote(true);
        try {
            await api.post(`/api/admissions/${admission.id}/notes`, noteForm);
            setNoteForm({ title: '', content: '', note_type: 'PROGRESS' });
            setShowAddNote(false);
            fetchProgressNotes(admission.id);
        } catch { } finally { setSavingNote(false); }
    };

    // ── Admit patient ──
    const openAdmitModal = async () => {
        try {
            const res = await api.get('/api/admissions/available-beds');
            setAvailableBeds(res.data);
        } catch { }
        setShowAdmitModal(true);
    };

    const handleAdmit = async () => {
        if (!selectedBedId) return;
        setAdmitting(true);
        try {
            await api.post('/api/admissions/admit', {
                patient_id: visit.patient_id,
                visit_id: visitId,
                bed_id: selectedBedId,
                reason: admitReason
            });
            setShowAdmitModal(false);
            setSelectedBedId('');
            setAdmitReason('');
            fetchVisit(); // refresh to get admission data
        } catch (err) {
            alert(err.response?.data?.error || 'Admission failed');
        } finally { setAdmitting(false); }
    };

    // ── Discharge ──
    const handleDischarge = async () => {
        setDischarging(true);
        try {
            const finalSummary = admissionFee ? `${dischargeSummary}\n\n[FEE:${admissionFee}]` : dischargeSummary;
            await api.post(`/api/admissions/${admission.id}/discharge`, {
                notes: dischargeNotes,
                summary: finalSummary
            });
            setShowDischargeModal(false);
            setDischargeNotes('');
            setDischargeSummary('');
            setAdmissionFee('');
            setAdmission(null);
            setProgressNotes([]);

            // Navigate directly to make the final prescription which automatically counts the admission fee
            navigate(`/doctor/prescription/${visitId}`);
        } catch (err) {
            alert(err.response?.data?.error || 'Discharge failed');
        } finally { setDischarging(false); }
    };

    const saveVitals = async () => {
        setSavingVitals(true);
        try {
            const cleaned = {};
            Object.entries(vitals).forEach(([k, v]) => { if (v !== '') cleaned[k] = Number(v); });
            await api.post(`/api/visits/${visitId}/vitals`, cleaned);
        } catch { } finally { setSavingVitals(false); }
    };

    const saveNotes = async () => {
        setSaving(true);
        try {
            await api.put(`/api/visits/${visitId}`, { doctor_notes: notes, diagnosis });
        } catch { } finally { setSaving(false); }
    };

    const closeVisit = async () => {
        await api.post(`/api/visits/${visitId}/close`);
        navigate(-1);
    };

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;
    if (!visit) return <div className="alert alert-error">{error || 'Visit not found'}</div>;

    const patient = visit.patient_profiles;
    const age = calculateAge(patient?.date_of_birth);

    // Build bed location string from admission data
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

    // Group available beds by floor/ward/room for the picker
    const groupedBeds = availableBeds.reduce((acc, bed) => {
        const floor = bed.rooms?.wards?.floors?.name || 'Unknown Floor';
        const ward = bed.rooms?.wards?.name || 'Unknown Ward';
        const room = bed.rooms?.room_number || '?';
        const key = `${floor} → ${ward} → Room ${room}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(bed);
        return acc;
    }, {});

    return (
        <div>
            <button onClick={() => navigate(-1)} className="btn btn-ghost mb-4 flex items-center gap-2">
                <ArrowLeft size={18} /> Back
            </button>

            {/* Patient header */}
            <div className="card mb-6" style={{ borderRadius: 16, padding: 24 }}>
                <div className="flex items-center gap-4 flex-wrap">
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'var(--primary-100)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, color: 'var(--primary-700)'
                    }}>
                        {patient?.full_name?.[0]}
                    </div>
                    <div>
                        <div className="text-lg font-bold" style={{ color: 'var(--gray-900)' }}>
                            {patient?.full_name}
                        </div>
                        <div className="flex gap-2 text-sm" style={{ color: 'var(--gray-500)' }}>
                            <span className="badge badge-blue font-mono">{patient?.patient_uid}</span>
                            <span>{age.display} · {patient?.gender}</span>
                            {patient?.blood_group && (
                                <span className="badge badge-red flex items-center gap-1">
                                    <Droplet size={12} fill="currentColor" /> {patient.blood_group}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="ml-auto flex gap-2 flex-wrap">
                        <button onClick={() => navigate(`/doctor/prescription/${visitId}`)} className="btn btn-primary btn-sm flex items-center gap-2">
                            <Pill size={16} /> Write Prescription
                        </button>
                        {!admission && visit.status === 'OPEN' && (
                            <button onClick={openAdmitModal} className="btn btn-sm flex items-center gap-2"
                                style={{ background: '#7c3aed', color: '#fff' }}>
                                <Bed size={16} /> Admit Patient
                            </button>
                        )}
                        {visit.status === 'OPEN' && !admission && (
                            <button onClick={closeVisit} className="btn btn-secondary btn-sm flex items-center gap-2">
                                <Check size={16} /> Close Visit
                            </button>
                        )}
                    </div>
                </div>
                {patient?.allergies?.length > 0 && (
                    <div className="alert alert-error mt-4">
                        <AlertTriangle size={18} /> <strong>Allergies:</strong> {patient.allergies.join(', ')}
                    </div>
                )}
                <div className="mt-3 text-sm" style={{ color: 'var(--gray-600)' }}>
                    <strong>Chief Complaint:</strong> {visit.chief_complaint || 'None recorded'}
                </div>
            </div>

            {/* ═══════════ IPD ADMISSION BANNER ═══════════ */}
            {admission && (
                <div className="card mb-6" style={{
                    borderRadius: 16,
                    border: '2px solid #7c3aed',
                    background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)'
                }}>
                    <div className="card-body" style={{ padding: 20 }}>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff'
                                }}>
                                    <Bed size={22} />
                                </div>
                                <div>
                                    <div className="font-bold" style={{ color: '#7c3aed', fontSize: 16 }}>
                                        Patient Admitted (IPD)
                                    </div>
                                    <div className="text-sm" style={{ color: 'var(--gray-600)' }}>
                                        Treatment is ongoing
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                <button onClick={() => setShowAddNote(true)}
                                    className="btn btn-sm flex items-center gap-2"
                                    style={{ background: '#7c3aed', color: '#fff' }}>
                                    <Plus size={14} /> Add Checkup Note
                                </button>
                                <button onClick={() => setShowDischargeModal(true)}
                                    className="btn btn-sm btn-danger flex items-center gap-2">
                                    <DischargeIcon size={14} /> Discharge
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-700)' }}>
                                <Building2 size={16} className="text-primary-600" />
                                <div>
                                    <div className="text-xs uppercase font-bold" style={{ color: 'var(--gray-400)' }}>Location</div>
                                    <div className="font-medium">{getBedLocation(admission)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-700)' }}>
                                <Clock size={16} className="text-primary-600" />
                                <div>
                                    <div className="text-xs uppercase font-bold" style={{ color: 'var(--gray-400)' }}>Duration</div>
                                    <div className="font-medium">{getAdmissionDuration(admission.created_at)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-700)' }}>
                                <ClipboardList size={16} className="text-primary-600" />
                                <div>
                                    <div className="text-xs uppercase font-bold" style={{ color: 'var(--gray-400)' }}>Admitted Since</div>
                                    <div className="font-medium">{formatIST(admission.created_at)}</div>
                                </div>
                            </div>
                            {admission.reason && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-700)' }}>
                                    <FileText size={16} className="text-primary-600" />
                                    <div>
                                        <div className="text-xs uppercase font-bold" style={{ color: 'var(--gray-400)' }}>Reason</div>
                                        <div className="font-medium">{admission.reason}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
                {/* Vitals */}
                <div className="card" style={{ borderRadius: 16 }}>
                    <div className="card-header flex items-center gap-2">
                        <Heart size={18} className="text-primary-600" /> Vitals
                    </div>
                    <div className="card-body">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ['weight_kg', 'Weight (kg)', Weight],
                                ['height_cm', 'Height (cm)', Ruler],
                                ['temperature_celsius', 'Temp (°C)', Thermometer],
                                ['heart_rate', 'Heart Rate', Heart],
                                ['blood_pressure_systolic', 'Systolic BP', Activity],
                                ['blood_pressure_diastolic', 'Diastolic BP', Activity],
                                ['spo2_percent', 'SpO2 (%)', Activity],
                                ['respiratory_rate', 'Resp Rate', Wind],
                            ].map(([key, label, Icon]) => (
                                <div key={key} className="form-group" style={{ marginBottom: 12 }}>
                                    <label className="label text-xs flex items-center gap-1.5">
                                        <Icon size={14} className="text-primary-600" /> {label}
                                    </label>
                                    <input className="input" type="number" step="any" placeholder="—"
                                        value={vitals[key]}
                                        onChange={e => setVitals({ ...vitals, [key]: e.target.value })} />
                                </div>
                            ))}
                        </div>
                        <button onClick={saveVitals} className="btn btn-primary btn-sm w-full mt-2" disabled={savingVitals}>
                            {savingVitals ? 'Saving...' : 'Save Vitals'}
                        </button>
                    </div>
                </div>

                {/* Notes & Diagnosis */}
                <div className="card" style={{ borderRadius: 16 }}>
                    <div className="card-header flex items-center gap-2">
                        <FileText size={18} className="text-primary-600" /> Notes & Diagnosis
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="label">Diagnosis</label>
                            <input className="input" placeholder="e.g. Viral Fever, URTI"
                                value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="label">Doctor's Notes</label>
                            <textarea className="input" rows={6} placeholder="Observations, examination findings, treatment plan..."
                                value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                        <button onClick={saveNotes} className="btn btn-primary btn-sm w-full" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Notes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════ IPD PROGRESS NOTES ═══════════ */}
            {admission && progressNotes.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                        <ClipboardList className="text-primary-600" size={20} /> IPD Progress Notes ({progressNotes.length})
                    </h3>
                    <div className="space-y-3">
                        {progressNotes.map(note => (
                            <div key={note.id} className="card" style={{ borderRadius: 14 }}>
                                <div className="card-body" style={{ padding: '14px 20px' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`badge ${note.note_type === 'PROGRESS' ? 'badge-blue' : note.note_type === 'LAB_RESULT' ? 'badge-green' : 'badge-purple'}`}>
                                                {note.note_type}
                                            </span>
                                            {note.title && (
                                                <span className="font-semibold text-sm" style={{ color: 'var(--gray-900)' }}>
                                                    {note.title}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--gray-400)' }}>
                                            <span>{note.staff_profiles?.full_name}</span>
                                            <span>·</span>
                                            <span>{formatIST(note.created_at)}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--gray-700)', whiteSpace: 'pre-wrap' }}>
                                        {note.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Existing prescriptions for this visit */}
            {visit.prescriptions?.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                        <Pill className="text-primary-600" size={20} /> Prescriptions for this Visit ({visit.prescriptions.length})
                    </h3>
                    <div className="space-y-3">
                        {visit.prescriptions.map(rx => {
                            const drugs = parseDrugs(rx.drugs);
                            return (
                                <div key={rx.id} className="card" style={{ borderRadius: 14 }}>
                                    <div className="card-body" style={{ padding: '14px 20px' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-semibold text-sm" style={{ color: 'var(--primary-600)' }}>
                                                    {rx.prescription_uid}
                                                </span>
                                                <span className={`badge ${rx.status === 'APPROVED' ? 'badge-green' : rx.status === 'DISPENSED' ? 'badge-blue' : 'badge-gray'}`}>
                                                    {rx.status}
                                                </span>
                                                <span className="text-xs" style={{ color: 'var(--gray-400)' }}>v{rx.version}</span>
                                            </div>
                                            <button onClick={() => setSelectedRx(rx)} className="btn btn-ghost btn-sm text-primary">View Full Details</button>
                                        </div>
                                        <div className="text-sm mt-2" style={{ color: 'var(--gray-600)' }}>
                                            <strong>Drugs:</strong> {drugs.map(d => d.name).join(', ') || '—'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Medical History - Other Prescriptions */}
            {pastPrescriptions.filter(p => p.visit_id !== visitId).length > 0 && (
                <div className="mt-8 pt-6" style={{ borderTop: '2px dashed var(--gray-100)' }}>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                        <History className="text-primary-600" size={20} /> Past Medication History
                    </h3>
                    <div className="space-y-3">
                        {pastPrescriptions.filter(p => p.visit_id !== visitId).map(rx => {
                            const drugs = parseDrugs(rx.drugs);
                            return (
                                <div key={rx.id} className="card" style={{ borderRadius: 14, opacity: 0.85 }}>
                                    <div className="card-body" style={{ padding: '14px 20px' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-semibold uppercase" style={{ color: 'var(--gray-400)' }}>{formatDate(rx.created_at)}</span>
                                                <span className="font-mono text-xs" style={{ color: 'var(--gray-500)' }}>{rx.prescription_uid}</span>
                                                <span className={`badge badge-sm ${rx.status === 'APPROVED' ? 'badge-green' : 'badge-gray'}`}>{rx.status}</span>
                                            </div>
                                            <button onClick={() => setSelectedRx(rx)} className="btn btn-ghost btn-xs text-primary">Details</button>
                                        </div>
                                        <div className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                                            <strong>Prescribed by:</strong> {rx.staff_profiles?.full_name || 'MD'}
                                        </div>
                                        <div className="text-xs mt-1" style={{ color: 'var(--gray-600)' }}>
                                            <strong>Meds:</strong> {drugs.map(d => d.name).join(', ') || '—'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════════ ADMIT PATIENT MODAL ═══════════ */}
            {showAdmitModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 560, borderRadius: 20 }}>
                        <div className="modal-header">
                            <h2 className="flex items-center gap-2">
                                <Bed size={20} style={{ color: '#7c3aed' }} /> Admit Patient to IPD
                            </h2>
                            <button onClick={() => setShowAdmitModal(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-info mb-4">
                                <AlertTriangle size={16} />
                                <span className="text-sm">
                                    Admitting <strong>{patient?.full_name}</strong> will mark the selected bed as occupied and convert this visit to IPD.
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="label">Reason for Admission *</label>
                                <textarea className="input" rows={2} placeholder="e.g. Post-surgery observation, IV antibiotics required..."
                                    value={admitReason} onChange={e => setAdmitReason(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label className="label">Select Available Bed *</label>
                                {Object.keys(groupedBeds).length === 0 ? (
                                    <div className="text-center py-4" style={{ color: 'var(--gray-400)' }}>
                                        No beds available. Please free up a bed first.
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 14 }}>
                                        {Object.entries(groupedBeds).map(([location, beds]) => (
                                            <div key={location}>
                                                <div className="text-xs font-bold uppercase px-4 py-2" style={{
                                                    background: 'var(--gray-50)', color: 'var(--gray-500)',
                                                    borderBottom: '1px solid var(--gray-100)',
                                                    letterSpacing: '0.04em'
                                                }}>
                                                    {location}
                                                </div>
                                                {beds.map(bed => (
                                                    <div
                                                        key={bed.id}
                                                        onClick={() => setSelectedBedId(bed.id)}
                                                        style={{
                                                            padding: '10px 16px', cursor: 'pointer',
                                                            borderBottom: '1px solid var(--gray-100)',
                                                            background: selectedBedId === bed.id ? 'var(--primary-50)' : '#fff',
                                                            borderLeft: selectedBedId === bed.id ? '3px solid var(--primary-600)' : '3px solid transparent',
                                                            transition: 'all .15s'
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Bed size={14} style={{ color: selectedBedId === bed.id ? 'var(--primary-600)' : 'var(--gray-400)' }} />
                                                                <span className="font-medium text-sm">Bed {bed.bed_number}</span>
                                                                <span className="badge badge-green" style={{ fontSize: 10 }}>Available</span>
                                                            </div>
                                                            <span className="text-xs" style={{ color: 'var(--gray-400)' }}>{bed.bed_type}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowAdmitModal(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleAdmit}
                                className="btn flex items-center gap-2"
                                style={{ background: '#7c3aed', color: '#fff' }}
                                disabled={admitting || !selectedBedId || !admitReason.trim()}>
                                {admitting ? 'Admitting...' : <><Bed size={16} /> Confirm Admission</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ADD PROGRESS NOTE MODAL ═══════════ */}
            {showAddNote && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 520, borderRadius: 20 }}>
                        <div className="modal-header">
                            <h2 className="flex items-center gap-2">
                                <ClipboardList size={20} className="text-primary-600" /> Add Checkup / Progress Note
                            </h2>
                            <button onClick={() => setShowAddNote(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="label">Note Type</label>
                                <select className="select" value={noteForm.note_type}
                                    onChange={e => setNoteForm({ ...noteForm, note_type: e.target.value })}>
                                    <option value="PROGRESS">Progress Note</option>
                                    <option value="CHECKUP">Regular Checkup</option>
                                    <option value="LAB_RESULT">Lab Result</option>
                                    <option value="OBSERVATION">Observation</option>
                                    <option value="TREATMENT_UPDATE">Treatment Update</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Title (optional)</label>
                                <input className="input" placeholder="e.g. Morning Round, Post-Op Check"
                                    value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Content *</label>
                                <textarea className="input" rows={5}
                                    placeholder="Observations, vitals summary, treatment changes, patient condition..."
                                    value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowAddNote(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleAddNote} className="btn btn-primary flex items-center gap-2"
                                disabled={savingNote || !noteForm.content.trim()}>
                                <Send size={16} /> {savingNote ? 'Saving...' : 'Save Note'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ DISCHARGE MODAL ═══════════ */}
            {showDischargeModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 520, borderRadius: 20 }}>
                        <div className="modal-header">
                            <h2 className="flex items-center gap-2">
                                <DischargeIcon size={20} style={{ color: 'var(--red-600)' }} /> Discharge Patient
                            </h2>
                            <button onClick={() => setShowDischargeModal(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-warning mb-4">
                                <AlertTriangle size={16} />
                                <span className="text-sm">
                                    This will discharge <strong>{patient?.full_name}</strong> and free up the bed ({getBedLocation(admission)}).
                                </span>
                            </div>
                            <div className="form-group">
                                <label className="label">Discharge Summary</label>
                                <textarea className="input" rows={3} placeholder="Summary of treatment, outcomes, and condition at discharge..."
                                    value={dischargeSummary} onChange={e => setDischargeSummary(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="label">Discharge Notes</label>
                                <textarea className="input" rows={3} placeholder="Follow-up instructions, medications to continue, diet..."
                                    value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="label">Admission Fee (₹)</label>
                                <input className="input" type="number" placeholder="e.g. 5000" min="0"
                                    value={admissionFee} onChange={e => setAdmissionFee(e.target.value)} />
                                <span className="text-xs text-gray-400 mt-1 block">This will be added to the patient's final discharge prescription PDF.</span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowDischargeModal(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleDischarge} className="btn btn-danger flex items-center gap-2" disabled={discharging}>
                                <DischargeIcon size={16} /> {discharging ? 'Discharging...' : 'Confirm Discharge'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prescription Detail Modal */}
            {selectedRx && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 800, borderRadius: 20 }}>
                        <div className="modal-header">
                            <h2 className="text-lg font-bold">Prescription Details: {selectedRx.prescription_uid}</h2>
                            <button onClick={() => setSelectedRx(null)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-4 flex flex-wrap gap-4">
                                <div className="text-sm">
                                    <span className="text-gray-500 block text-xs uppercase font-bold">Status</span>
                                    <span className={`badge ${selectedRx.status === 'APPROVED' ? 'badge-green' : 'badge-gray'}`}>{selectedRx.status}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500 block text-xs uppercase font-bold">Date</span>
                                    <span>{formatDate(selectedRx.created_at)}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500 block text-xs uppercase font-bold">Doctor</span>
                                    <span>{selectedRx.staff_profiles?.full_name || 'Dr. Attendant'}</span>
                                </div>
                            </div>

                            {selectedRx.diagnosis && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Diagnosis</span>
                                    <p className="text-sm text-gray-800">{selectedRx.diagnosis}</p>
                                </div>
                            )}

                            <h3 className="text-sm font-bold mb-2 uppercase text-gray-500">Medications</h3>
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

                            {selectedRx.notes && (
                                <div className="mt-4 p-3 border rounded-lg">
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Clinical Notes</span>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRx.notes}</p>
                                </div>
                            )}
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
