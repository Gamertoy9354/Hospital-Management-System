import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Users, PlusCircle, Edit2, Lock, Check, X, AlertTriangle } from 'lucide-react';

const ROLES = ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'SUPER_ADMIN'];

export default function StaffManagement() {
    const { staff: currentUser, updateStaff } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editStaff, setEditStaff] = useState(null);
    const [form, setForm] = useState({
        full_name: '', phone: '', role: 'DOCTOR', department: '',
        specialization: '', password: '', qualification: ''
    });
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [error, setError] = useState('');

    const fetchStaff = async () => {
        try {
            const res = await api.get('/api/staff');
            setStaff(res.data);
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        } finally { setLoading(false); }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/api/dashboard/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    };

    useEffect(() => {
        fetchStaff();
        fetchDepartments();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            if (editStaff) {
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                const res = await api.put(`/api/staff/${editStaff.id}`, payload);

                // If editing self, update AuthContext
                if (editStaff.id === currentUser?.id) {
                    updateStaff(res.data);
                }
            } else {
                await api.post('/api/staff', form);
            }
            setShowAdd(false);
            setEditStaff(null);
            setForm({ full_name: '', phone: '', role: 'DOCTOR', department: '', specialization: '', password: '', qualification: '' });
            fetchStaff();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save staff member');
        } finally { setSaving(false); }
    };

    const toggleActive = async (id) => {
        await api.post(`/api/staff/${id}/toggle`);
        fetchStaff();
    };

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                    <Users className="text-primary-600" size={24} /> Staff Management
                </h1>
                <button onClick={() => {
                    setEditStaff(null);
                    setForm({ full_name: '', phone: '', role: 'DOCTOR', department: '', specialization: '', password: '', qualification: '' });
                    setShowAdd(true);
                }} className="btn btn-primary flex items-center gap-2">
                    <PlusCircle size={18} /> Add Staff
                </button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(s => (
                            <tr key={s.id}>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: s.is_active ? 'var(--primary-100)' : 'var(--gray-100)',
                                            color: s.is_active ? 'var(--primary-700)' : 'var(--gray-400)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 600, fontSize: 13
                                        }}>
                                            {s.full_name?.[0]}
                                        </div>
                                        <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{s.full_name}</span>
                                    </div>
                                </td>
                                <td className="font-mono text-sm">{s.phone}</td>
                                <td><span className="badge badge-blue">{s.role}</span></td>
                                <td className="text-sm">{s.department || '—'}</td>
                                <td>
                                    <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                                        {s.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex gap-1">
                                        <button onClick={() => {
                                            setEditStaff(s);
                                            setForm({
                                                full_name: s.full_name, phone: s.phone, role: s.role,
                                                department: s.department || '', specialization: s.specialization || '',
                                                password: '', qualification: s.qualification || ''
                                            });
                                            setShowAdd(true);
                                        }} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => toggleActive(s.id)}
                                            className={`btn btn-sm flex items-center gap-1 ${s.is_active ? 'btn-ghost' : 'btn-success'}`}
                                            style={{ fontSize: 12 }}>
                                            {s.is_active ? <><Lock size={12} /> Deactivate</> : <><Check size={12} /> Activate</>}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showAdd && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h2>{editStaff ? 'Edit Staff' : 'Add Staff Member'}</h2>
                            <button onClick={() => { setShowAdd(false); setEditStaff(null); }} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {error && <div className="alert alert-error mb-4"><AlertTriangle size={18} /> {error}</div>}
                            <div className="form-group">
                                <label className="label">Full Name *</label>
                                <input className="input" value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. John Doe" />
                            </div>
                            <div className="form-group">
                                <label className="label">Phone *</label>
                                <input className="input" value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit phone" />
                            </div>
                            <div className="form-group">
                                <label className="label">Role *</label>
                                <select className="select" value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}>
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Department</label>
                                <select className="select" value={form.department}
                                    onChange={e => setForm({ ...form, department: e.target.value })}>
                                    <option value="">Select</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Specialization</label>
                                <input className="input" value={form.specialization}
                                    onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Pediatrician" />
                            </div>
                            <div className="form-group">
                                <label className="label">Qualification</label>
                                <input className="input" value={form.qualification}
                                    onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. MBBS, MD" />
                            </div>
                            <div className="form-group">
                                <label className="label">{editStaff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                                <input className="input" type="password" value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => { setShowAdd(false); setEditStaff(null); }} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editStaff ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
