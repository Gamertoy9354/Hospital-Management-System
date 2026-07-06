import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useRealtime } from '../../hooks/useRealtime';
import { Map, Construction, Building2 } from 'lucide-react';

const STATUS = {
    AVAILABLE: { bg: '#dcfce7', border: '#86efac', dot: '#22c55e', text: '#166534', label: 'Available' },
    OCCUPIED: { bg: '#fee2e2', border: '#fca5a5', dot: '#ef4444', text: '#991b1b', label: 'Occupied' },
    HOUSEKEEPING: { bg: '#fef9c3', border: '#fde047', dot: '#eab308', text: '#854d0e', label: 'Cleaning' },
    RESERVED: { bg: '#dbeafe', border: '#93c5fd', dot: '#3b82f6', text: '#1e40af', label: 'Reserved' },
};

export default function BedMap() {
    const [floors, setFloors] = useState([]);
    const [summary, setSummary] = useState({});
    const [selectedBed, setSelectedBed] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [mapRes, sumRes] = await Promise.all([
                api.get('/api/beds/map'),
                api.get('/api/beds/summary')
            ]);
            setFloors(mapRes.data);
            setSummary(sumRes.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);
    useRealtime('beds', fetchData);

    if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                <Map className="text-primary-600" size={24} /> Bed & Room Map
            </h1>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {[
                    ['total', 'Total Beds', '#f9fafb', '#6b7280'],
                    ['available', 'Available', '#f0fdf4', '#16a34a'],
                    ['occupied', 'Occupied', '#fef2f2', '#dc2626'],
                    ['housekeeping', 'Cleaning', '#fefce8', '#ca8a04']
                ].map(([k, l, bg, c]) => (
                    <div key={k} className="stat-card" style={{ background: bg }}>
                        <div className="stat-value" style={{ color: c }}>{summary[k] || 0}</div>
                        <div className="stat-label">{l}</div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-5">
                {Object.entries(STATUS).map(([s, c]) => (
                    <div key={s} className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-600)' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot }} />
                        {c.label}
                    </div>
                ))}
            </div>

            {/* Floor map */}
            {floors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Construction size={48} strokeWidth={1.5} />
                    </div>
                    <h3>No floors configured</h3>
                    <p>Set up floors, wards, and beds in Admin → Floors & Beds</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {floors.map(floor => (
                        <div key={floor.id} className="card" style={{ borderRadius: 16 }}>
                            <div className="card-header flex items-center gap-2">
                                <Building2 size={18} className="text-primary-600" /> {floor.name}
                            </div>
                            <div className="card-body">
                                {(floor.wards || []).map(ward => (
                                    <div key={ward.id} className="mb-4">
                                        <h3 className="text-xs font-semibold uppercase mb-2" style={{
                                            color: 'var(--gray-400)', letterSpacing: '0.08em'
                                        }}>{ward.name} ({ward.ward_type})</h3>
                                        {(ward.rooms || []).map(room => (
                                            <div key={room.id} className="mb-3">
                                                <div className="text-xs mb-1" style={{ color: 'var(--gray-400)' }}>
                                                    Room {room.room_number}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {(room.beds || []).map(bed => {
                                                        const s = STATUS[bed.status] || STATUS.AVAILABLE;
                                                        return (
                                                            <button
                                                                key={bed.id}
                                                                onClick={() => setSelectedBed(bed)}
                                                                style={{
                                                                    background: s.bg, border: `1px solid ${s.border}`,
                                                                    color: s.text, borderRadius: 10, padding: '8px 14px',
                                                                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                                    transition: 'all .15s', fontFamily: 'var(--font-sans)',
                                                                    display: 'flex', alignItems: 'center', gap: 6
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: 8, height: 8, borderRadius: '50%', background: s.dot
                                                                }} />
                                                                Bed {bed.bed_number}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Bed action modal */}
            {selectedBed && (
                <BedModal bed={selectedBed} onClose={() => setSelectedBed(null)} onUpdate={fetchData} />
            )}
        </div>
    );
}

function BedModal({ bed, onClose, onUpdate }) {
    const s = STATUS[bed.status] || STATUS.AVAILABLE;
    const nextActions = {
        AVAILABLE: ['OCCUPIED', 'RESERVED'],
        OCCUPIED: ['HOUSEKEEPING'],
        HOUSEKEEPING: ['AVAILABLE'],
        RESERVED: ['AVAILABLE', 'OCCUPIED']
    };
    const actions = nextActions[bed.status] || [];

    const handleAction = async (newStatus) => {
        await api.put(`/api/beds/${bed.id}/status`, { status: newStatus });
        onUpdate();
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 380 }}>
                <div className="modal-body" style={{ padding: 24 }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div style={{
                            width: 44, height: 44, borderRadius: '50%', background: s.dot,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 16
                        }}>{bed.bed_number}</div>
                        <div>
                            <div className="font-semibold" style={{ color: 'var(--gray-900)' }}>Bed {bed.bed_number}</div>
                            <div className="text-sm" style={{ color: s.text }}>{s.label}</div>
                        </div>
                    </div>

                    {actions.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <div className="text-sm font-medium mb-2" style={{ color: 'var(--gray-500)' }}>Change Status:</div>
                            {actions.map(a => {
                                const st = STATUS[a];
                                return (
                                    <button key={a} onClick={() => handleAction(a)}
                                        style={{
                                            width: '100%', padding: '10px 16px', borderRadius: 12,
                                            fontSize: 14, fontWeight: 500, cursor: 'pointer',
                                            background: st.bg, border: `1px solid ${st.border}`,
                                            color: st.text, fontFamily: 'var(--font-sans)',
                                            transition: 'all .15s'
                                        }}>
                                        Mark as {st.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <button onClick={onClose} className="btn btn-secondary w-full">Close</button>
                </div>
            </div>
        </div>
    );
}
