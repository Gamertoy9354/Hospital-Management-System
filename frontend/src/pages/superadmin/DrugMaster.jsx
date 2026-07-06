import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Pill, Plus, Search, Edit2, Lock, Check, X, Download, Package, IndianRupee } from 'lucide-react';

export default function DrugMaster() {
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editDrug, setEditDrug] = useState(null);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [form, setForm] = useState({
        name: '', dosage_form: 'TABLET', strength: '',
        adult_dose_mg: '', category: '', manufacturer: '',
        stock_quantity: '', price_per_unit: ''
    });

    const emptyForm = {
        name: '', dosage_form: 'TABLET', strength: '',
        adult_dose_mg: '', category: '', manufacturer: '',
        stock_quantity: '', price_per_unit: ''
    };

    const fetchDrugs = async () => {
        try {
            const res = await api.get(`/api/dashboard/drug-master?q=${search}`);
            setDrugs(res.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchDrugs(); }, [search]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { ...form };
            // Convert numeric fields
            for (const field of ['adult_dose_mg', 'stock_quantity', 'price_per_unit']) {
                if (payload[field] === '' || payload[field] === null) delete payload[field];
                else payload[field] = Number(payload[field]);
            }

            if (editDrug) {
                await api.put(`/api/dashboard/drug-master/${editDrug.id}`, payload);
            } else {
                await api.post('/api/dashboard/drug-master', payload);
            }
            setShowAdd(false);
            setEditDrug(null);
            setForm(emptyForm);
            fetchDrugs();
        } catch { } finally { setSaving(false); }
    };

    const toggleDrug = async (id) => {
        await api.post(`/api/dashboard/drug-master/${id}/toggle`);
        fetchDrugs();
    };

    const handleSeedDrugs = async () => {
        if (!window.confirm('This will replace all existing drugs with demo data (69 Indian medicines with MRP pricing). Continue?')) return;
        setSeeding(true);
        try {
            const res = await api.post('/api/dashboard/drug-master/seed');
            alert(res.data.message);
            fetchDrugs();
        } catch (err) {
            alert('Seed failed: ' + (err.response?.data?.error || err.message));
        } finally { setSeeding(false); }
    };

    const getStockBadge = (qty) => {
        if (qty === null || qty === undefined) return { cls: 'badge-gray', label: '—' };
        if (qty <= 0) return { cls: 'badge-red', label: 'Out of Stock' };
        if (qty < 100) return { cls: 'badge-yellow', label: `${qty} (Low)` };
        return { cls: 'badge-green', label: qty.toLocaleString('en-IN') };
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                    <Pill className="text-primary-600" size={24} /> Drug Master
                </h1>
                <div className="flex gap-2">
                    <button onClick={handleSeedDrugs}
                        className="btn btn-sm flex items-center gap-2" disabled={seeding}
                        style={{ background: 'var(--purple-50)', color: 'var(--purple-700)', border: '1px solid var(--purple-200)' }}>
                        <Download size={14} /> {seeding ? 'Seeding...' : 'Seed Demo Drugs'}
                    </button>
                    <button onClick={() => {
                        setEditDrug(null);
                        setForm(emptyForm);
                        setShowAdd(true);
                    }} className="btn btn-primary flex items-center gap-2">
                        <Plus size={18} /> Add Drug
                    </button>
                </div>
            </div>

            <div className="search-input-wrap mb-6">
                <Search className="search-icon" size={20} />
                <input className="input" placeholder="Search drugs..."
                    value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 44, maxWidth: 400 }} />
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><div className="spinner" /></div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Form</th>
                                <th>Strength</th>
                                <th style={{ textAlign: 'right' }}>
                                    <span className="flex items-center gap-1 justify-end">
                                        <IndianRupee size={12} /> MRP
                                    </span>
                                </th>
                                <th style={{ textAlign: 'right' }}>
                                    <span className="flex items-center gap-1 justify-end">
                                        <Package size={12} /> Stock
                                    </span>
                                </th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drugs.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-4" style={{ color: 'var(--gray-400)' }}>No drugs found</td></tr>
                            ) : drugs.map(d => {
                                const stock = getStockBadge(d.stock_quantity);
                                return (
                                    <tr key={d.id}>
                                        <td className="font-medium" style={{ color: 'var(--gray-900)' }}>{d.name}</td>
                                        <td><span className="badge badge-blue">{d.dosage_form}</span></td>
                                        <td className="text-sm">{d.strength || '—'}</td>
                                        <td className="text-sm font-mono" style={{ textAlign: 'right', color: 'var(--gray-700)' }}>
                                            {d.price_per_unit != null ? `₹${Number(d.price_per_unit).toFixed(2)}` : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={`badge ${stock.cls}`}>{stock.label}</span>
                                        </td>
                                        <td className="text-sm">{d.category || '—'}</td>
                                        <td>
                                            <span className={`badge ${d.is_active ? 'badge-green' : 'badge-red'}`}>
                                                {d.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button onClick={() => {
                                                    setEditDrug(d);
                                                    setForm({
                                                        name: d.name, dosage_form: d.dosage_form, strength: d.strength || '',
                                                        adult_dose_mg: d.adult_dose_mg || '', category: d.category || '',
                                                        manufacturer: d.manufacturer || '',
                                                        stock_quantity: d.stock_quantity ?? '', price_per_unit: d.price_per_unit ?? ''
                                                    });
                                                    setShowAdd(true);
                                                }} className="btn btn-ghost btn-sm"><Edit2 size={14} /></button>
                                                <button onClick={() => toggleDrug(d.id)}
                                                    className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                                                    {d.is_active ? <Lock size={14} /> : <Check size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAdd && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h2>{editDrug ? 'Edit Drug' : 'Add Drug'}</h2>
                            <button onClick={() => { setShowAdd(false); setEditDrug(null); }} className="btn btn-ghost btn-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="label">Drug Name *</label>
                                <input className="input" value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-group">
                                    <label className="label">Dosage Form *</label>
                                    <select className="select" value={form.dosage_form}
                                        onChange={e => setForm({ ...form, dosage_form: e.target.value })}>
                                        {['TABLET', 'SYRUP', 'DROPS', 'INJECTION', 'CREAM', 'OINTMENT', 'CAPSULE', 'POWDER', 'INHALER', 'SUSPENSION'].map(f =>
                                            <option key={f} value={f}>{f}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Strength</label>
                                    <input className="input" value={form.strength}
                                        onChange={e => setForm({ ...form, strength: e.target.value })} placeholder="e.g. 500mg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-group">
                                    <label className="label">MRP / Price per Unit (₹)</label>
                                    <input className="input" type="number" step="0.01" min="0" value={form.price_per_unit}
                                        onChange={e => setForm({ ...form, price_per_unit: e.target.value })} placeholder="e.g. 5.50" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Stock Quantity</label>
                                    <input className="input" type="number" min="0" value={form.stock_quantity}
                                        onChange={e => setForm({ ...form, stock_quantity: e.target.value })} placeholder="e.g. 500" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Adult Dose (mg)</label>
                                <input className="input" type="number" value={form.adult_dose_mg}
                                    onChange={e => setForm({ ...form, adult_dose_mg: e.target.value })} placeholder="For pediatric dose calculation" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-group">
                                    <label className="label">Category</label>
                                    <input className="input" value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Antibiotic" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Manufacturer</label>
                                    <input className="input" value={form.manufacturer}
                                        onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Cipla" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => { setShowAdd(false); setEditDrug(null); }} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleSave} className="btn btn-primary" disabled={saving || !form.name}>
                                {saving ? 'Saving...' : editDrug ? 'Update' : 'Add Drug'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
