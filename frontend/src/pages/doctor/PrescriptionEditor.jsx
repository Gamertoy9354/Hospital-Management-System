import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { calculateAge } from '../../utils/formatters';
import { ArrowLeft, Pill, Droplet, AlertTriangle, X, Check, Search, Sparkles, FileText, Loader2, ExternalLink, Calendar, IndianRupee } from 'lucide-react';

export default function PrescriptionEditor() {
    const { visitId } = useParams();
    const navigate = useNavigate();
    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [drugSearch, setDrugSearch] = useState('');
    const [drugResults, setDrugResults] = useState([]);
    const [drugs, setDrugs] = useState([]);
    const [notes, setNotes] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedRxId, setSavedRxId] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfUrls, setPdfUrls] = useState(null);

    const [scheduleNext, setScheduleNext] = useState(false);
    const [nextAppointment, setNextAppointment] = useState('');

    useEffect(() => {
        api.get(`/api/visits/${visitId}`)
            .then(res => {
                setVisit(res.data);
                setDiagnosis(res.data.diagnosis || '');
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [visitId]);

    const searchDrugs = async (q) => {
        setDrugSearch(q);
        if (q.length < 2) { setDrugResults([]); return; }
        const res = await api.get(`/api/prescriptions/drug-search?q=${encodeURIComponent(q)}`);
        setDrugResults(res.data);
    };

    const addDrug = (drug) => {
        setDrugs([...drugs, {
            drug_id: drug.id,
            name: drug.name,
            dosage_form: drug.dosage_form,
            strength: drug.strength || '',
            dose: '',
            frequency: 'TDS',
            duration_days: 5,
            route: 'ORAL',
            instructions: '',
            adult_dose_mg: drug.adult_dose_mg || 0,
            price_per_unit: drug.price_per_unit || null
        }]);
        setDrugSearch('');
        setDrugResults([]);
    };

    const updateDrug = (index, field, value) => {
        const updated = [...drugs];
        updated[index] = { ...updated[index], [field]: value };
        setDrugs(updated);
    };

    const removeDrug = (index) => {
        setDrugs(drugs.filter((_, i) => i !== index));
    };

    const savePrescription = async (silent = false) => {
        if (!silent) setSaving(true);
        try {
            const patient = visit.patient_profiles;
            const vitals = visit.patient_vitals?.[0];
            const combinedDrugs = drugs.map(d => ({
                drug_id: d.drug_id,
                name: d.name,
                dosage_form: d.dosage_form,
                strength: d.strength,
                dose: d.dose,
                frequency: d.frequency,
                duration_days: d.duration_days,
                route: d.route,
                instructions: d.instructions,
                price_per_unit: d.price_per_unit,
                total_quantity: d.total_quantity
            }));

            if (scheduleNext && nextAppointment) {
                combinedDrugs.push({
                    drug_id: 'appt-next', name: 'Next Appointment',
                    instructions: nextAppointment, price_per_unit: 0, total_quantity: 1, is_fee: true,
                    dosage_form: '', strength: '', dose: '', frequency: '', duration_days: 1, route: 'ORAL'
                });
            }

            const payload = {
                diagnosis,
                notes: aiInsights ? `${notes}\n\n--- AI INSIGHTS ---\n${aiInsights}` : notes,
                drugs: combinedDrugs
            };

            if (savedRxId) {
                await api.put(`/api/prescriptions/${savedRxId}`, payload);
            } else {
                payload.visit_id = visitId;
                payload.patient_id = patient.id;
                payload.patient_weight_kg = vitals?.weight_kg || null;
                payload.patient_age_months = visit ? calculateAge(patient.date_of_birth).years * 12 + calculateAge(patient.date_of_birth).months : null;

                const res = await api.post('/api/prescriptions', payload);
                setSavedRxId(res.data.id);
            }
        } catch { } finally { if (!silent) setSaving(false); }
    };

    const generateAiInsights = async () => {
        if (!savedRxId) return;
        setAiLoading(true);
        try {
            await savePrescription(true); // Auto-save latest data before AI
            const res = await api.post(`/api/prescriptions/${savedRxId}/ai-insights`);
            setAiInsights(res.data.insights);
        } catch (err) {
            alert('AI generation failed: ' + (err.response?.data?.error || err.message));
        } finally { setAiLoading(false); }
    };

    const generatePdfs = async () => {
        if (!savedRxId) return;
        setPdfLoading(true);
        try {
            await savePrescription(true); // Auto-save latest data before PDF
            const res = await api.post(`/api/prescriptions/${savedRxId}/generate-pdf`);
            setPdfUrls(res.data);
        } catch (err) {
            alert('PDF generation failed: ' + (err.response?.data?.error || err.message));
        } finally { setPdfLoading(false); }
    };

    const formatAiMarkdown = (text) => {
        if (!text) return '';
        let html = text
            // Headers: ### or ## or #
            .replace(/^### (.+)$/gm, '<h4 style="color:#166534;font-weight:700;margin:14px 0 6px;font-size:14px;border-bottom:1px solid #d1fae5;padding-bottom:4px;">$1</h4>')
            .replace(/^## (.+)$/gm, '<h3 style="color:#166534;font-weight:700;margin:16px 0 8px;font-size:15px;border-bottom:1px solid #d1fae5;padding-bottom:4px;">$1</h3>')
            .replace(/^# (.+)$/gm, '<h3 style="color:#166534;font-weight:700;margin:16px 0 8px;font-size:15px;border-bottom:1px solid #d1fae5;padding-bottom:4px;">$1</h3>')
            // Bold headers like **Title**
            .replace(/^\*\*(.+?)\*\*$/gm, '<h4 style="color:#166534;font-weight:700;margin:14px 0 6px;font-size:14px;">$1</h4>')
            // Inline bold
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1e3a5f;">$1</strong>')
            // Bullet points
            .replace(/^[-•] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
            // Numbered lists
            .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
            // Wrap consecutive <li> in <ul>
            .replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul style="margin:6px 0;padding-left:20px;list-style:disc;">$1</ul>')
            // Line breaks
            .replace(/\n\n/g, '<div style="margin-bottom:8px;"></div>')
            .replace(/\n/g, '<br/>');
        return html;
    };

    const medicineCost = drugs.reduce((sum, d) => sum + (d.price_per_unit ? Number(d.price_per_unit) * (Number(d.total_quantity) || 1) : 0), 0);

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;
    if (!visit) return <div className="alert alert-error">Visit not found</div>;

    const patient = visit.patient_profiles;
    const age = calculateAge(patient?.date_of_birth);

    return (
        <div>
            <button onClick={() => navigate(-1)} className="btn btn-ghost mb-4 flex items-center gap-2">
                <ArrowLeft size={18} /> Back
            </button>

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--gray-900)' }}>
                    <Pill className="text-primary-600" size={28} /> Write Prescription
                </h1>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-500)' }}>
                    <span className="badge badge-blue font-mono">{patient?.patient_uid}</span>
                    <span className="font-medium">{patient?.full_name} ({age.display})</span>
                    {patient?.blood_group && (
                        <span className="badge badge-red flex items-center gap-1">
                            <Droplet size={12} fill="currentColor" /> {patient.blood_group}
                        </span>
                    )}
                </div>
            </div>

            {/* Allergy warning */}
            {patient?.allergies?.length > 0 && (
                <div className="alert alert-error mb-6">
                    <AlertTriangle size={18} /> <strong>ALLERGIES:</strong> {patient.allergies.join(', ')}
                </div>
            )}

            {visit?.visit_admission?.status === 'DISCHARGED' && (
                <div className="alert mb-6" style={{ background: '#f3e8ff', color: '#6d28d9', borderLeft: '4px solid #7c3aed', padding: '12px 16px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IndianRupee size={18} />
                        <strong>IPD Admission Automatically Billed!</strong>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#5b21b6' }}>
                        Patient was discharged from IPD. Final admission fees mapping from the discharge log will be securely attached and correctly formatted onto the final PDF. No manual fee entry required here!
                    </div>
                </div>
            )}

            <div className="card mb-6" style={{ borderRadius: 16 }}>
                <div className="card-body" style={{ padding: 24 }}>
                    {/* Diagnosis */}
                    <div className="form-group">
                        <label className="label">Diagnosis</label>
                        <input className="input" placeholder="e.g. Viral Fever, URTI, AGE"
                            value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                    </div>

                    {/* Drug search */}
                    <div className="form-group">
                        <label className="label">Add Drug</label>
                        <div className="search-input-wrap">
                            <span className="search-icon">
                                <Search size={20} />
                            </span>
                            <input className="input" placeholder="Search drug by name..."
                                value={drugSearch} onChange={e => searchDrugs(e.target.value)} style={{ paddingLeft: 44 }} />
                        </div>
                        {drugResults.length > 0 && (
                            <div style={{
                                border: '1px solid var(--gray-200)', borderRadius: 12,
                                marginTop: 4, maxHeight: 200, overflowY: 'auto', background: '#fff'
                            }}>
                                {drugResults.map(d => (
                                    <div key={d.id} onClick={() => addDrug(d)}
                                        style={{
                                            padding: '10px 14px', cursor: 'pointer',
                                            borderBottom: '1px solid var(--gray-100)',
                                            fontSize: 14, transition: 'background .1s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = '#fff'}
                                    >
                                        <strong>{d.name}</strong>
                                        <span className="text-xs ml-2" style={{ color: 'var(--gray-400)' }}>
                                            {d.dosage_form} {d.strength && `· ${d.strength}`}
                                            {d.price_per_unit != null && <span style={{ color: 'var(--green-600)', fontWeight: 600 }}> · ₹{Number(d.price_per_unit).toFixed(2)}</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Drug list */}
                    {drugs.length === 0 ? (
                        <div className="text-center py-6" style={{ color: 'var(--gray-400)' }}>
                            Search and add drugs above
                        </div>
                    ) : (
                        <div className="space-y-4 mt-4">
                            {drugs.map((drug, i) => (
                                <div key={i} style={{
                                    border: '1px solid var(--gray-200)', borderRadius: 14, padding: 16, background: 'var(--gray-50)'
                                }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{i + 1}. {drug.name}</span>
                                            <span className="text-xs ml-2" style={{ color: 'var(--gray-400)' }}>
                                                {drug.dosage_form} {drug.strength && `· ${drug.strength}`}
                                            </span>
                                            {drug.price_per_unit != null && (
                                                <span className="badge badge-green ml-2" style={{ fontSize: 11 }}>₹{Number(drug.price_per_unit).toFixed(2)}</span>
                                            )}
                                        </div>
                                        <button onClick={() => removeDrug(i)} className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--red-500)', padding: '0 8px' }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="label text-xs">Dose</label>
                                            <input className="input" placeholder="e.g. 5ml, 1 tab"
                                                value={drug.dose} onChange={e => updateDrug(i, 'dose', e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="label text-xs">Frequency</label>
                                            <select className="select" value={drug.frequency}
                                                onChange={e => updateDrug(i, 'frequency', e.target.value)}>
                                                <option value="OD">OD (Once daily)</option>
                                                <option value="BD">BD (Twice daily)</option>
                                                <option value="TDS">TDS (3x daily)</option>
                                                <option value="QDS">QDS (4x daily)</option>
                                                <option value="SOS">SOS (As needed)</option>
                                                <option value="STAT">STAT (Once)</option>
                                                <option value="HS">HS (Bedtime)</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="label text-xs">Duration</label>
                                            <div className="flex items-center gap-2">
                                                <input className="input" type="number" min="1" max="365"
                                                    value={drug.duration_days} onChange={e => updateDrug(i, 'duration_days', e.target.value)} />
                                                <span className="text-xs" style={{ color: 'var(--gray-400)' }}>days</span>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="label text-xs">Total Qty</label>
                                            <div className="flex items-center gap-2">
                                                <input className="input" type="number" min="1"
                                                    value={drug.total_quantity || 1} onChange={e => updateDrug(i, 'total_quantity', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="label text-xs">Route</label>
                                            <select className="select" value={drug.route}
                                                onChange={e => updateDrug(i, 'route', e.target.value)}>
                                                <option value="ORAL">Oral</option>
                                                <option value="IV">IV</option>
                                                <option value="IM">IM</option>
                                                <option value="SC">SC</option>
                                                <option value="TOPICAL">Topical</option>
                                                <option value="NASAL">Nasal</option>
                                                <option value="RECTAL">Rectal</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group mt-2" style={{ marginBottom: 0 }}>
                                        <label className="label text-xs">Instructions</label>
                                        <input className="input" placeholder="e.g. After food, with milk"
                                            value={drug.instructions} onChange={e => updateDrug(i, 'instructions', e.target.value)} />
                                    </div>
                                </div>
                            ))}

                            {/* Medicine cost summary */}
                            {medicineCost > 0 && (
                                <div style={{
                                    background: 'var(--green-50)', border: '1px solid var(--green-200)',
                                    borderRadius: 10, padding: '10px 16px', display: 'flex',
                                    justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span className="text-sm font-medium" style={{ color: 'var(--green-700)' }}>Estimated Medicine Cost</span>
                                    <span className="font-bold font-mono" style={{ color: 'var(--green-800)', fontSize: 16 }}>₹{medicineCost.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Prescription notes */}
                    <div className="form-group mt-4">
                        <label className="label">Additional Notes</label>
                        <textarea className="input" rows={3} placeholder="Diet advice, follow-up, etc."
                            value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {/* Extras */}
                    <div className="grid gap-4 mt-6 border-t pt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', borderColor: 'var(--gray-200)' }}>
                        <div style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 12 }}>
                            <label className="flex items-center gap-2 mb-3" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--gray-800)' }}>
                                <input type="checkbox" checked={scheduleNext} onChange={e => setScheduleNext(e.target.checked)} />
                                <Calendar size={16} className="text-primary-600" /> Schedule Next Appointment
                            </label>
                            {scheduleNext && (
                                <input type="date" className="input" min={new Date().toISOString().split('T')[0]}
                                    value={nextAppointment} onChange={e => setNextAppointment(e.target.value)} />
                            )}
                        </div>
                    </div>

                    {/* Actions — Save / Update */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
                        <button onClick={() => savePrescription(false)} className="btn btn-success flex items-center gap-2" disabled={saving || drugs.length === 0}>
                            {saving ? 'Saving...' : <><Check size={18} /> {savedRxId ? 'Update Prescription' : 'Save Prescription'}</>}
                        </button>
                    </div>

                    {/* Actions — Step 2: AI + PDF (shown after save) */}
                    {savedRxId && (
                        <div className="mt-6">
                            <div style={{
                                background: 'var(--green-50)', border: '1px solid var(--green-200)',
                                borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center'
                            }}>
                                <Check size={20} style={{ color: 'var(--green-600)', marginBottom: 4 }} />
                                <div className="font-semibold" style={{ color: 'var(--green-700)' }}>Prescription Saved Successfully!</div>
                                <div className="text-sm mt-1" style={{ color: 'var(--green-600)' }}>Now generate AI insights and PDFs below</div>
                            </div>

                            <div className="flex flex-wrap gap-3 justify-center">
                                {/* AI Insights Button */}
                                <button
                                    onClick={generateAiInsights}
                                    disabled={aiLoading || !!aiInsights}
                                    className="btn flex items-center gap-2"
                                    style={{
                                        background: aiInsights ? 'var(--green-100)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                        color: aiInsights ? 'var(--green-700)' : '#fff',
                                        border: aiInsights ? '1px solid var(--green-300)' : 'none',
                                        padding: '10px 20px', borderRadius: 10
                                    }}
                                >
                                    {aiLoading ? <><Loader2 size={18} className="animate-spin" /> Generating AI Insights...</> :
                                        aiInsights ? <><Check size={18} /> AI Insights Generated</> :
                                            <><Sparkles size={18} /> Generate AI Details</>}
                                </button>

                                {/* Generate PDFs Button */}
                                <button
                                    onClick={generatePdfs}
                                    disabled={pdfLoading || !!pdfUrls}
                                    className="btn flex items-center gap-2"
                                    style={{
                                        background: pdfUrls ? 'var(--blue-100)' : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                                        color: pdfUrls ? 'var(--blue-700)' : '#fff',
                                        border: pdfUrls ? '1px solid var(--blue-300)' : 'none',
                                        padding: '10px 20px', borderRadius: 10
                                    }}
                                >
                                    {pdfLoading ? <><Loader2 size={18} className="animate-spin" /> Generating PDFs...</> :
                                        pdfUrls ? <><Check size={18} /> PDFs Ready</> :
                                            <><FileText size={18} /> Generate Prescription PDFs</>}
                                </button>
                            </div>

                            {/* AI Insights Preview */}
                            {aiInsights && (
                                <div className="mt-4" style={{
                                    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12,
                                    padding: 16, maxHeight: 400, overflowY: 'auto'
                                }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles size={16} style={{ color: '#7c3aed' }} />
                                        <span className="font-semibold text-sm" style={{ color: '#166534' }}>AI-Generated Medical Insights</span>
                                    </div>
                                    <div className="ai-md-content text-sm" style={{ lineHeight: 1.7, color: 'var(--gray-700)' }}
                                        dangerouslySetInnerHTML={{ __html: formatAiMarkdown(aiInsights) }} />
                                </div>
                            )}

                            {/* PDF Links */}
                            {pdfUrls && (
                                <div className="mt-4" style={{
                                    background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 12,
                                    padding: 16
                                }}>
                                    <div className="font-semibold text-sm mb-3" style={{ color: 'var(--blue-800)' }}>Prescription PDFs Ready</div>
                                    <div className="flex flex-wrap gap-3">
                                        <a href={pdfUrls.patient_pdf_url} target="_blank" rel="noopener noreferrer"
                                            className="btn btn-sm flex items-center gap-2"
                                            style={{ background: '#fff', border: '1px solid var(--blue-300)', color: 'var(--blue-700)' }}>
                                            <FileText size={14} /> Patient Copy <ExternalLink size={12} />
                                        </a>
                                        <a href={pdfUrls.staff_pdf_url} target="_blank" rel="noopener noreferrer"
                                            className="btn btn-sm flex items-center gap-2"
                                            style={{ background: '#fff', border: '1px solid var(--gray-300)', color: 'var(--gray-700)' }}>
                                            <FileText size={14} /> Staff / Billing Copy <ExternalLink size={12} />
                                        </a>
                                    </div>
                                    <div className="text-xs mt-2" style={{ color: 'var(--gray-400)' }}>
                                        Grand Total: ₹{pdfUrls.grand_total?.toFixed(2)} (Medicine: ₹{pdfUrls.medicine_total?.toFixed(2)} + Consultation: ₹{pdfUrls.consultation_fee?.toFixed(2)})
                                    </div>
                                </div>
                            )}

                            {/* Done button */}
                            <div className="flex justify-center mt-6">
                                <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ padding: '10px 32px' }}>
                                    Done — Back to Visit
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
