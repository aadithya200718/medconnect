import { ReactNode } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Shield,
    Home,
    FileText,
    Clock,
    User,
    LogOut,
    Menu,
    X,
    Scan,
    Users,
    PlusCircle,
    Package,
    History
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import clsx from 'clsx';

interface NavItem {
    label: string;
    path: string;
    icon: ReactNode;
}

const patientNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/patient', icon: <Home className="w-5 h-5" /> },
    { label: 'Prescriptions', path: '/patient/prescriptions', icon: <FileText className="w-5 h-5" /> },
    { label: 'Consents', path: '/patient/consents', icon: <Clock className="w-5 h-5" /> },
    { label: 'Scan Medicine', path: '/patient/scan', icon: <Scan className="w-5 h-5" /> },
    { label: 'Profile', path: '/patient/profile', icon: <User className="w-5 h-5" /> },
];

const doctorNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/doctor', icon: <Home className="w-5 h-5" /> },
    { label: 'Patients', path: '/doctor/patients', icon: <Users className="w-5 h-5" /> },
    { label: 'New Prescription', path: '/doctor/prescribe', icon: <PlusCircle className="w-5 h-5" /> },
    { label: 'My Prescriptions', path: '/doctor/prescriptions', icon: <FileText className="w-5 h-5" /> },
];

const pharmacyNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/pharmacy', icon: <Home className="w-5 h-5" /> },
    { label: 'Dispense', path: '/pharmacy/dispense', icon: <Scan className="w-5 h-5" /> },
    { label: 'Inventory', path: '/pharmacy/inventory', icon: <Package className="w-5 h-5" /> },
    { label: 'History', path: '/pharmacy/history', icon: <History className="w-5 h-5" /> },
];

export function DashboardLayout() {
    const { user, logout } = useAuthStore();
    const { sidebarOpen, toggleSidebar } = useUIStore();
    const navigate = useNavigate();

    if (!user) return null;

    const navItems =
        user.role === 'patient' ? patientNavItems :
            user.role === 'doctor' ? doctorNavItems :
                pharmacyNavItems;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const userName =
        user.role === 'patient' ? (user as any).fullName :
            user.role === 'doctor' ? (user as any).fullName :
                (user as any).pharmacyName;

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <motion.aside
                className={clsx(
                    'fixed lg:static inset-y-0 left-0 z-40 w-64 glass-card rounded-none lg:rounded-r-2xl',
                    'flex flex-col transition-transform duration-300',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
                initial={false}
            >
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <img src="/logo.jpg" alt="MedConnect" className="w-10 h-10 rounded-xl object-contain" />
                        <div>
                            <h1 className="text-lg font-bold text-white">MedConnect</h1>
                            <p className="text-xs text-white/50 capitalize">{user.role} Portal</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === `/${user.role}`}
                            className={({ isActive }) => clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                                isActive
                                    ? 'bg-primary-500/20 text-primary-400'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                            )}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{userName}</p>
                            <p className="text-xs text-white/50 capitalize">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-white/60 hover:bg-danger-500/20 hover:text-danger-400 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </motion.aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <motion.div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={toggleSidebar}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 glass-card rounded-none">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg hover:bg-white/10"
                    >
                        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-400" />
                        <span className="font-bold text-white">MedConnect</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </header>

                {/* Page Content */}
                <div className="p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
