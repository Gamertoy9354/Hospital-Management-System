import { useEffect, useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import api from '../../utils/api';
import { Settings, Upload, Save, Check, Image as ImageIcon } from 'lucide-react';

export default function HospitalSetup() {
    const { config, setConfig } = useHospital();
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        api.get('/api/hospital-config/')
            .then(res => {
                const cfg = {};
                res.data.forEach(item => { cfg[item.key] = item.value; });
                setForm(cfg);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await api.put('/api/hospital-config/', form);
            setConfig(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { } finally { setSaving(false); }
    };

    const handleLogoUpload = async () => {
        if (!logoFile) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('logo', logoFile);
            const res = await api.post('/api/hospital-config/logo', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newLogoUrl = res.data.logo_url;
            setForm({ ...form, logo_url: newLogoUrl });
            setConfig({ ...config, logo_url: newLogoUrl });
            setLogoFile(null);
        } catch { } finally { setUploading(false); }
    };

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;

    const fields = [
        { key: 'hospital_name', label: 'Hospital Name', placeholder: 'e.g. Shree Child Care Hospital' },
        { key: 'tagline', label: 'Tagline', placeholder: 'e.g. Expert Pediatric Care' },
        { key: 'address', label: 'Address', placeholder: 'Full address' },
        { key: 'phone', label: 'Phone', placeholder: '+91 XXXXX XXXXX' },
        { key: 'email', label: 'Email', placeholder: 'info@hospital.com' },
        { key: 'registration_number', label: 'Registration Number', placeholder: 'Hospital reg number' },
        { key: 'consultation_fee', label: 'Consultation Fee (₹)', placeholder: 'e.g. 500' },
        { key: 'prescription_footer', label: 'Prescription Footer', placeholder: 'Get well soon!' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                <Settings className="text-primary-600" size={24} /> Hospital Setup
            </h1>

            <div className="card" style={{ maxWidth: 640, borderRadius: 16 }}>
                <div className="card-body" style={{ padding: 24 }}>
                    {/* Logo section */}
                    <div className="mb-6 pb-6 border-b">
                        <label className="label mb-3">Hospital Logo</label>
                        <div className="flex items-center gap-4">
                            {form.logo_url ? (
                                <img src={form.logo_url} alt="logo"
                                    style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', border: '1px solid var(--gray-200)' }} />
                            ) : (
                                <div style={{
                                    width: 80, height: 80, borderRadius: 16, background: 'var(--gray-100)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 32
                                }}>🏥</div>
                            )}
                            <div>
                                <input type="file" id="logo-input" accept="image/*" className="hidden"
                                    onChange={e => setLogoFile(e.target.files[0])} />
                                <label htmlFor="logo-input" className="btn btn-secondary btn-sm flex items-center gap-2 cursor-pointer">
                                    <ImageIcon size={16} /> {logoFile ? 'Change Image' : 'Choose Logo'}
                                </label>
                                {logoFile && (
                                    <button onClick={handleLogoUpload} className="btn btn-primary btn-sm mt-2 flex items-center gap-2" disabled={uploading}>
                                        <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Logo'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Config fields */}
                    {fields.map(f => (
                        <div key={f.key} className="form-group">
                            <label className="label">{f.label}</label>
                            <input className="input" placeholder={f.placeholder}
                                value={form[f.key] || ''}
                                onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                        </div>
                    ))}

                    <div className="flex items-center gap-3 mt-6">
                        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2" disabled={saving}>
                            <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        {saved && (
                            <span className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--green-600)' }}>
                                <Check size={16} /> Saved successfully!
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
