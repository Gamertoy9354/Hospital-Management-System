import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { CheckCircle, Baby, User, Building2, AlertTriangle, ArrowLeft, ArrowRight, Check } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];
const RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Other'];

export default function PatientRegister() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdPatient, setCreatedPatient] = useState(null);

    const [form, setForm] = useState({
        full_name: '', date_of_birth: '', gender: '', blood_group: '',
        guardian_name: '', guardian_relationship: '', guardian_phone: '', guardian_email: '',
        address: '', city: 'Gujarat',
        allergies: '', chronic_conditions: ''
    });

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const canProceed = () => {
        if (step === 1) return form.full_name && form.date_of_birth && form.gender;
        if (step === 2) return form.guardian_name && form.guardian_phone?.length === 10;
        return true;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...form,
                allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
                chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
            };
            const res = await api.post('/api/patients', payload);
            setCreatedPatient(res.data);
            setStep(4); // success
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // Success screen
    if (step === 4 && createdPatient) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 500 }}>
                <div className="card shadow-lg text-center" style={{ maxWidth: 420, padding: 40, borderRadius: 20 }}>
                    <div className="flex justify-center mb-6">
                        <CheckCircle size={64} className="text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--gray-900)' }}>
                        Patient Registered!
                    </h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--gray-500)' }}>
                        {createdPatient.full_name} has been registered successfully.
                    </p>
                    <div style={{
                        background: 'var(--primary-50)', borderRadius: 12, padding: 16, marginBottom: 24
                    }}>
                        <div className="text-xs font-medium" style={{ color: 'var(--gray-500)' }}>Patient ID</div>
                        <div className="text-2xl font-bold font-mono" style={{ color: 'var(--primary-600)' }}>
                            {createdPatient.patient_uid}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate(`/patients/${createdPatient.id}`)}
                            className="btn btn-primary flex-1"
                        >
                            View Profile
                        </button>
                        <button
                            onClick={() => {
                                setStep(1);
                                setForm({
                                    full_name: '', date_of_birth: '', gender: '', blood_group: '',
                                    guardian_name: '', guardian_relationship: '', guardian_phone: '', guardian_email: '',
                                    address: '', city: 'Gujarat', allergies: '', chronic_conditions: ''
                                });
                                setCreatedPatient(null);
                            }}
                            className="btn btn-secondary flex-1"
                        >
                            Register Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--gray-900)' }}>Register New Patient</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--gray-500)' }}>
                Complete the form in 3 steps to register a new patient.
            </p>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: step >= s ? 'var(--primary-600)' : 'var(--gray-200)',
                            color: step >= s ? '#fff' : 'var(--gray-500)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 600, transition: 'all .2s'
                        }}>
                            {step > s ? <Check size={16} /> : s}
                        </div>
                        <span className="text-sm font-medium hide-mobile" style={{
                            color: step >= s ? 'var(--gray-900)' : 'var(--gray-400)'
                        }}>
                            {s === 1 ? 'Child Info' : s === 2 ? 'Guardian' : 'Medical'}
                        </span>
                        {s < 3 && <div className="flex-1" style={{
                            height: 2, background: step > s ? 'var(--primary-600)' : 'var(--gray-200)',
                            borderRadius: 1
                        }} />}
                    </div>
                ))}
            </div>

            <div className="card" style={{ maxWidth: 600, borderRadius: 16 }}>
                <div className="card-body" style={{ padding: 24 }}>
                    {/* Step 1: Child Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                                <Baby className="text-primary-600" size={20} /> Child Information
                            </h2>
                            <div className="form-group">
                                <label className="label">Full Name *</label>
                                <input className="input" placeholder="Child's full name" value={form.full_name}
                                    onChange={e => set('full_name', e.target.value)} autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="label">Date of Birth *</label>
                                    <input type="date" className="input" value={form.date_of_birth}
                                        onChange={e => set('date_of_birth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Gender *</label>
                                    <select className="select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                                        <option value="">Select</option>
                                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Blood Group</label>
                                <select className="select" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                                    <option value="">Select (optional)</option>
                                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Guardian */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                                <User className="text-primary-600" size={20} /> Guardian Information
                            </h2>
                            <div className="form-group">
                                <label className="label">Guardian Name *</label>
                                <input className="input" placeholder="Father/Mother/Guardian name" value={form.guardian_name}
                                    onChange={e => set('guardian_name', e.target.value)} autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="label">Relationship</label>
                                <select className="select" value={form.guardian_relationship} onChange={e => set('guardian_relationship', e.target.value)}>
                                    <option value="">Select</option>
                                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Phone Number *</label>
                                <input type="tel" className="input" placeholder="10-digit mobile" value={form.guardian_phone}
                                    onChange={e => set('guardian_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} />
                            </div>
                            <div className="form-group">
                                <label className="label">Email (optional)</label>
                                <input type="email" className="input" placeholder="email@example.com" value={form.guardian_email}
                                    onChange={e => set('guardian_email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="label">Address</label>
                                <textarea className="input" rows={2} placeholder="Full address" value={form.address}
                                    onChange={e => set('address', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="label">City</label>
                                <input className="input" placeholder="City" value={form.city}
                                    onChange={e => set('city', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Medical */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--gray-800)' }}>
                                <Building2 className="text-primary-600" size={20} /> Medical History
                            </h2>
                            <div className="form-group">
                                <label className="label">Known Allergies</label>
                                <input className="input" placeholder="Comma separated (e.g. Penicillin, Peanuts)"
                                    value={form.allergies} onChange={e => set('allergies', e.target.value)} autoFocus />
                                <p className="text-xs mt-1" style={{ color: 'var(--gray-400)' }}>Leave blank if none</p>
                            </div>
                            <div className="form-group">
                                <label className="label">Chronic Conditions</label>
                                <input className="input" placeholder="Comma separated (e.g. Asthma, Diabetes)"
                                    value={form.chronic_conditions} onChange={e => set('chronic_conditions', e.target.value)} />
                                <p className="text-xs mt-1" style={{ color: 'var(--gray-400)' }}>Leave blank if none</p>
                            </div>

                            {/* Summary */}
                            <div style={{ background: 'var(--gray-50)', borderRadius: 12, padding: 16, marginTop: 16 }}>
                                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--gray-700)' }}>Review</h3>
                                <div className="text-sm space-y-1" style={{ color: 'var(--gray-600)' }}>
                                    <div><strong>Name:</strong> {form.full_name}</div>
                                    <div><strong>DOB:</strong> {form.date_of_birth} | <strong>Gender:</strong> {form.gender}</div>
                                    <div><strong>Guardian:</strong> {form.guardian_name} ({form.guardian_relationship || 'N/A'})</div>
                                    <div><strong>Phone:</strong> {form.guardian_phone}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <div className="alert alert-error mt-4"><AlertTriangle size={18} /> {error}</div>}

                    {/* Navigation */}
                    <div className="flex justify-between mt-6">
                        {step > 1 ? (
                            <button onClick={() => setStep(s => s - 1)} className="btn btn-secondary flex items-center gap-2">
                                <ArrowLeft size={16} /> Back
                            </button>
                        ) : (
                            <button onClick={() => navigate(-1)} className="btn btn-ghost">Cancel</button>
                        )}

                        {step < 3 ? (
                            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary flex items-center gap-2" disabled={!canProceed()}>
                                Next <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} className="btn btn-success flex items-center gap-2" disabled={loading || !canProceed()}>
                                {loading ? (
                                    <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Registering...</>
                                ) : <><Check size={18} /> Register Patient</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
