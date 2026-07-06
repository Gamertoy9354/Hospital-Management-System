import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';

import {
    LayoutDashboard,
    Users,
    PlusCircle,
    Ticket,
    Bed,
    ClipboardList,
    Pill,
    Building2,
    Stethoscope,
    Settings,
    Layers,
    FileText,
    LogOut,
    Menu,
    X,
    IndianRupee
} from 'lucide-react';

const NAV_ITEMS = {
    RECEPTIONIST: [
        { path: '/receptionist', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/receptionist/patients', label: 'Patients', icon: Users },
        { path: '/receptionist/patients/new', label: 'Register Patient', icon: PlusCircle },
        { path: '/receptionist/tokens', label: 'OPD Tokens', icon: Ticket },
        { path: '/receptionist/billing', label: 'Billing', icon: IndianRupee },
        { path: '/receptionist/beds', label: 'Beds & Rooms', icon: Bed },
    ],
    DOCTOR: [
        { path: '/doctor', label: 'My Queue', icon: ClipboardList },
        { path: '/receptionist/patients', label: 'Patients', icon: Users },
    ],
    NURSE: [
        { path: '/nurse', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/receptionist/patients', label: 'Patients', icon: Users },
    ],
    PHARMACIST: [
        { path: '/pharmacist', label: 'Prescriptions', icon: Pill },
    ],
    SUPER_ADMIN: [
        { path: '/admin', label: 'Main Control', icon: LayoutDashboard },
        { path: '/receptionist', label: 'Receptionist View', icon: Building2 },
        { path: '/doctor', label: 'Doctor Queue', icon: Stethoscope },
        { path: '/nurse', label: 'Nurse View', icon: ClipboardList },
        { path: '/pharmacist', label: 'Pharmacy View', icon: Pill },
        { path: '/receptionist/patients', label: 'Patients Directory', icon: Users },
        { path: '/receptionist/tokens', label: 'OPD Tokens', icon: Ticket },
        { path: '/receptionist/billing', label: 'Billing Desk', icon: IndianRupee },
        { path: '/receptionist/beds', label: 'Admissions & Beds', icon: Bed },
        { path: '/admin/hospital', label: 'Hospital Configuration', icon: Settings },
        { path: '/admin/structure', label: 'Floors & Rooms Setup', icon: Layers },
        { path: '/admin/staff', label: 'Staff Directory', icon: Users },
        { path: '/admin/drugs', label: 'Central Drug Master', icon: Pill },
    ]
};

export default function AppLayout() {
    const { staff, logout } = useAuth();
    const { config } = useHospital();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navItems = NAV_ITEMS[staff?.role] || [];

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--gray-50)' }}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20"
                    style={{ background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(2px)' }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed z-30 flex flex-col`}
                style={{
                    top: 0, bottom: 0, left: 0, width: '264px',
                    background: '#fff',
                    borderRight: '1px solid var(--gray-200)',
                    transition: 'transform .3s ease',
                    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                }}
            >
                {/* Logo area */}
                <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--gray-100)' }}>
                    {config.logo_url ? (
                        <img src={config.logo_url} alt="logo"
                            style={{ height: 40, width: 40, borderRadius: 10, objectFit: 'cover' }} />
                    ) : (
                        <div style={{
                            height: 40, width: 40, borderRadius: 10,
                            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 18
                        }}>
                            {config.hospital_name?.[0] || 'H'}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--gray-900)' }}>
                            {config.hospital_name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                            {staff?.role?.replace('_', ' ')}
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="btn-ghost p-2 rounded-lg"
                        style={{ color: 'var(--gray-400)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 12px', borderRadius: 10,
                                fontSize: 14, fontWeight: 500,
                                textDecoration: 'none',
                                transition: 'all .15s',
                                background: isActive ? 'var(--primary-50)' : 'transparent',
                                color: isActive ? 'var(--primary-700)' : 'var(--gray-600)',
                            })}
                        >
                            <item.icon size={18} strokeWidth={2.5} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User section */}
                <div className="p-3 border-t" style={{ borderColor: 'var(--gray-100)' }}>
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div style={{
                            height: 32, width: 32, borderRadius: '50%',
                            background: 'var(--primary-100)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary-700)', fontWeight: 600, fontSize: 14
                        }}>
                            {staff?.full_name?.[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="text-sm font-medium truncate" style={{ color: 'var(--gray-900)' }}>
                                {staff?.full_name}
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            title="Logout"
                            className="btn-ghost"
                            style={{
                                border: 'none', cursor: 'pointer',
                                color: 'var(--gray-400)', padding: 6, borderRadius: 8,
                                transition: 'all .15s'
                            }}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Desktop sidebar — always visible */}
            <style>{`
        @media (min-width: 1024px) {
          aside { transform: translateX(0) !important; position: static !important; }
          aside button[title="Close"] { display: none; }
          .mobile-header { display: none !important; }
        }
      `}</style>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile header */}
                <header className="mobile-header flex items-center gap-3 px-4 py-3 bg-white border-b" style={{ borderColor: 'var(--gray-200)' }}>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        style={{
                            background: 'none', border: 'none', padding: 4,
                            borderRadius: 8, cursor: 'pointer', color: 'var(--gray-500)'
                        }}
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-semibold" style={{ color: 'var(--gray-800)' }}>
                        {config.hospital_name}
                    </span>
                </header>

                <main className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: 32 }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
