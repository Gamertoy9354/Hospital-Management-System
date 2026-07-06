import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { calculateAge, formatPhone } from '../../utils/formatters';
import { PlusCircle, Search, X, User, Phone, Droplet, AlertTriangle, Baby, Users } from 'lucide-react';

export default function PatientSearch() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, ADMITTED, PENDING
    const [allPatients, setAllPatients] = useState([]);
    const [admittedPatients, setAdmittedPatients] = useState([]);
    const [pendingPatients, setPendingPatients] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    // Load patients based on tab
    useEffect(() => {
        if (activeTab === 'ALL') loadPatients();
        else if (activeTab === 'ADMITTED') loadAdmitted();
        else if (activeTab === 'PENDING') loadPending();
    }, [activeTab]);

    const loadPatients = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/patients/list');
            setAllPatients(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    const loadAdmitted = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/patients/admitted');
            setAdmittedPatients(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    const loadPending = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/patients/pending');
            setPendingPatients(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    // Search with debounce
    const search = useCallback(async (q) => {
        if (q.length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        try {
            const res = await api.get(`/api/patients/search?q=${encodeURIComponent(q)}`);
            setSearchResults(res.data);
        } catch { }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => search(query), 300);
        return () => clearTimeout(timer);
    }, [query, search]);

    // Show search results when searching, otherwise show selected tab's patients
    const displayPatients = query.length >= 2 ? searchResults :
        activeTab === 'ALL' ? allPatients :
            activeTab === 'ADMITTED' ? admittedPatients : pendingPatients;
    const isSearching = query.length >= 2;

    const totalCount = activeTab === 'ALL' ? allPatients.length : activeTab === 'ADMITTED' ? admittedPatients.length : pendingPatients.length;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-900)' }}>Patients</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--gray-500)' }}>
                        {totalCount} {activeTab === 'ALL' ? 'registered' : activeTab === 'ADMITTED' ? 'admitted' : 'pending'} patient{totalCount !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={() => navigate('/receptionist/patients/new')} className="btn btn-primary flex items-center gap-2">
                    <PlusCircle size={18} /> Register New
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b" style={{ borderColor: 'var(--gray-200)' }}>
                {['ALL', 'ADMITTED', 'PENDING'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 4px',
                            background: 'none', border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--primary-600)' : '2px solid transparent',
                            color: activeTab === tab ? 'var(--primary-700)' : 'var(--gray-500)',
                            fontWeight: activeTab === tab ? 600 : 500,
                            cursor: 'pointer', transition: 'all 0.2s',
                            marginBottom: -1
                        }}
                    >
                        {tab === 'ALL' ? 'All Patients' : tab === 'ADMITTED' ? 'Admitted Patients' : 'Pending Visits'}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 24 }}>
                <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', zIndex: 1, color: 'var(--gray-400)'
                }}>
                    <Search size={20} />
                </span>
                <input
                    type="text"
                    className="input input-lg"
                    placeholder="Search by name, phone, or Patient ID..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ paddingLeft: 44, width: '100%' }}
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--gray-400)', padding: 4
                        }}
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Search result info */}
            {isSearching && !searching && (
                <div className="text-sm mb-4" style={{ color: 'var(--gray-500)' }}>
                    Found <strong>{searchResults.length}</strong> result{searchResults.length !== 1 ? 's' : ''} for "<em>{query}</em>"
                </div>
            )}

            {(loading || (isSearching && searching && searchResults.length === 0)) && (
                <div className="flex justify-center py-8">
                    <div className="spinner" />
                </div>
            )}

            {/* Patient Cards */}
            {!loading && displayPatients.length > 0 && (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {displayPatients.map(p => {
                        const age = calculateAge(p.date_of_birth);
                        return (
                            <div key={p.id} className="card" style={{
                                cursor: 'pointer', transition: 'all .2s',
                                border: '1px solid var(--gray-200)'
                            }}
                                onClick={() => navigate(`/patients/${p.id}`)}
                                onMouseOver={e => {
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                    e.currentTarget.style.borderColor = 'var(--primary-300)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                                }}
                            >
                                <div className="card-body">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="font-semibold" style={{ color: 'var(--gray-900)', fontSize: 16 }}>
                                                {p.full_name}
                                            </div>
                                            <div className="text-xs font-mono" style={{ color: 'var(--primary-600)' }}>
                                                {p.patient_uid}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="badge badge-blue">{age.display}</span>
                                            {p.gender && (
                                                <span className="badge" style={{
                                                    background: p.gender === 'Male' ? '#dbeafe' : p.gender === 'Female' ? '#fce7f3' : '#f3e8ff',
                                                    color: p.gender === 'Male' ? '#1d4ed8' : p.gender === 'Female' ? '#be185d' : '#7c3aed',
                                                    fontSize: 11, display: 'flex', alignItems: 'center', gap: '4px'
                                                }}>
                                                    {p.gender}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--gray-500)' }}>
                                        <span className="flex items-center gap-1"><User size={14} className="text-gray-400" /> {p.guardian_name}</span>
                                        <span className="flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {formatPhone(p.guardian_phone)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {p.blood_group && (
                                            <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 11 }}>
                                                <Droplet size={11} fill="currentColor" /> {p.blood_group}
                                            </span>
                                        )}
                                        {p.allergies?.length > 0 && (
                                            <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 11 }}>
                                                <AlertTriangle size={11} /> {p.allergies.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty state */}
            {!loading && displayPatients.length === 0 && !searching && (
                <div className="empty-state">
                    <div className="empty-icon">
                        {isSearching ? <Search size={48} strokeWidth={1} /> : <Users size={48} strokeWidth={1} />}
                    </div>
                    <h3>{isSearching ? 'No patients found' : 'No patients registered yet'}</h3>
                    <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                        {isSearching
                            ? 'Try a different search term or register a new patient.'
                            : 'Get started by registering your first patient.'
                        }
                    </p>
                    <button onClick={() => navigate('/receptionist/patients/new')} className="btn btn-primary mt-4 flex items-center gap-2">
                        <PlusCircle size={18} /> Register New Patient
                    </button>
                </div>
            )}
        </div>
    );
}
