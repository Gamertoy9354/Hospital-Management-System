import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Layers, Plus, Building2, Construction, X } from 'lucide-react';

export default function FloorWardSetup() {
    const [floors, setFloors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(null); // 'floor' | 'ward' | 'room' | 'bed'
    const [parentId, setParentId] = useState(null);
    const [form, setForm] = useState({});

    const fetchFloors = async () => {
        try {
            const res = await api.get('/api/beds/map');
            setFloors(res.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchFloors(); }, []);

    const handleAdd = async () => {
        try {
            if (showAdd === 'floor') {
                await api.post('/api/beds/floors', form);
            } else if (showAdd === 'ward') {
                await api.post('/api/beds/wards', { ...form, floor_id: parentId });
            } else if (showAdd === 'room') {
                await api.post('/api/beds/rooms', { ...form, ward_id: parentId });
            } else if (showAdd === 'bed') {
                await api.post('/api/beds/beds-crud', { ...form, room_id: parentId });
            }
            setShowAdd(null);
            setForm({});
            setParentId(null);
            fetchFloors();
        } catch { }
    };

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                    <Layers className="text-primary-600" size={24} /> Floors & Beds Setup
                </h1>
                <button onClick={() => { setShowAdd('floor'); setForm({ name: '', floor_number: '' }); }}
                    className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Floor
                </button>
            </div>

            {floors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Construction size={48} strokeWidth={1.5} />
                    </div>
                    <h3>No floors yet</h3>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                        Start by adding a floor, then add wards, rooms, and beds.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {floors.map(floor => (
                        <div key={floor.id} className="card" style={{ borderRadius: 16 }}>
                            <div className="card-header flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Building2 size={18} className="text-primary-600" /> {floor.name} (Floor {floor.floor_number})
                                </span>
                                <button onClick={() => {
                                    setShowAdd('ward');
                                    setParentId(floor.id);
                                    setForm({ name: '', ward_type: 'GENERAL' });
                                }} className="btn btn-sm btn-secondary">+ Ward</button>
                            </div>
                            <div className="card-body">
                                {(!floor.wards || floor.wards.length === 0) ? (
                                    <p className="text-sm" style={{ color: 'var(--gray-400)' }}>No wards. Add one above.</p>
                                ) : floor.wards.map(ward => (
                                    <div key={ward.id} className="mb-4 p-3" style={{ background: 'var(--gray-50)', borderRadius: 12 }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-sm" style={{ color: 'var(--gray-800)' }}>
                                                {ward.name} <span className="badge badge-blue">{ward.ward_type}</span>
                                            </span>
                                            <button onClick={() => {
                                                setShowAdd('room');
                                                setParentId(ward.id);
                                                setForm({ room_number: '', room_type: 'STANDARD' });
                                            }} className="btn btn-sm btn-ghost">+ Room</button>
                                        </div>

                                        {(ward.rooms || []).map(room => (
                                            <div key={room.id} className="mb-2 ml-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm" style={{ color: 'var(--gray-600)' }}>
                                                        Room {room.room_number} ({room.room_type})
                                                    </span>
                                                    <button onClick={() => {
                                                        setShowAdd('bed');
                                                        setParentId(room.id);
                                                        setForm({ bed_number: '', bed_type: 'STANDARD' });
                                                    }} className="btn btn-sm btn-ghost text-xs">+ Bed</button>
                                                </div>
                                                {(room.beds || []).length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1 ml-4">
                                                        {room.beds.map(bed => (
                                                            <span key={bed.id} className="badge badge-gray" style={{ fontSize: 11 }}>
                                                                Bed {bed.bed_number} ({bed.status})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAdd && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2>Add {showAdd.charAt(0).toUpperCase() + showAdd.slice(1)}</h2>
                            <button onClick={() => { setShowAdd(null); setForm({}); }} className="btn btn-ghost btn-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {showAdd === 'floor' && (
                                <>
                                    <div className="form-group">
                                        <label className="label">Floor Name</label>
                                        <input className="input" placeholder="e.g. Ground Floor"
                                            value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Floor Number</label>
                                        <input className="input" type="number" placeholder="0, 1, 2..."
                                            value={form.floor_number || ''} onChange={e => setForm({ ...form, floor_number: Number(e.target.value) })} />
                                    </div>
                                </>
                            )}
                            {showAdd === 'ward' && (
                                <>
                                    <div className="form-group">
                                        <label className="label">Ward Name</label>
                                        <input className="input" placeholder="e.g. Pediatric Ward"
                                            value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Ward Type</label>
                                        <select className="select" value={form.ward_type || 'GENERAL'}
                                            onChange={e => setForm({ ...form, ward_type: e.target.value })}>
                                            <option value="GENERAL">General</option>
                                            <option value="ICU">ICU</option>
                                            <option value="NICU">NICU</option>
                                            <option value="PRIVATE">Private</option>
                                            <option value="SEMI_PRIVATE">Semi-Private</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            {showAdd === 'room' && (
                                <>
                                    <div className="form-group">
                                        <label className="label">Room Number</label>
                                        <input className="input" placeholder="e.g. 101"
                                            value={form.room_number || ''} onChange={e => setForm({ ...form, room_number: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Room Type</label>
                                        <select className="select" value={form.room_type || 'STANDARD'}
                                            onChange={e => setForm({ ...form, room_type: e.target.value })}>
                                            <option value="STANDARD">Standard</option>
                                            <option value="DELUXE">Deluxe</option>
                                            <option value="SUITE">Suite</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            {showAdd === 'bed' && (
                                <>
                                    <div className="form-group">
                                        <label className="label">Bed Number</label>
                                        <input className="input" placeholder="e.g. A, B, 1, 2"
                                            value={form.bed_number || ''} onChange={e => setForm({ ...form, bed_number: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Bed Type</label>
                                        <select className="select" value={form.bed_type || 'STANDARD'}
                                            onChange={e => setForm({ ...form, bed_type: e.target.value })}>
                                            <option value="STANDARD">Standard</option>
                                            <option value="CRADLE">Cradle</option>
                                            <option value="ICU">ICU</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => { setShowAdd(null); setForm({}); }} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleAdd} className="btn btn-primary">Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
