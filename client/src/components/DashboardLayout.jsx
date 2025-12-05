import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, User, LogOut, LayoutDashboard, Settings, Users, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = ({ children, title }) => {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop
    const navigate = useNavigate();
    const location = useLocation();

    // Helper function to check if route is active
    const isActive = (path) => {
        // Exact match only - no child routes
        return location.pathname === path;
    };

    // Helper function to get menu item classes
    const getMenuItemClass = (path) => {
        const baseClass = "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors";
        const activeClass = "bg-blue-50 text-primary font-medium";
        const inactiveClass = "hover:bg-black/5 text-gray-600";

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };

    const SidebarContent = () => (
        <div className="p-6 space-y-4">
            <div
                onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/')}
                className={getMenuItemClass(user?.role === 'admin' ? '/admin' : '/')}
                title="Dashboard"
            >
                <LayoutDashboard size={20} />
                {!isSidebarCollapsed && <span>Dashboard</span>}
            </div>

            {user?.role === 'admin' && (
                <>
                    <div
                        onClick={() => navigate('/admin/users')}
                        className={getMenuItemClass('/admin/users')}
                        title="User Management"
                    >
                        <Users size={20} />
                        {!isSidebarCollapsed && <span>User Management</span>}
                    </div>
                    <div
                        onClick={() => navigate('/admin/apps')}
                        className={getMenuItemClass('/admin/apps')}
                        title="App Configuration"
                    >
                        <Settings size={20} />
                        {!isSidebarCollapsed && <span>App Configuration</span>}
                    </div>
                    <div
                        onClick={() => navigate('/admin/locations')}
                        className={getMenuItemClass('/admin/locations')}
                        title="Locations"
                    >
                        <MapPin size={20} />
                        {!isSidebarCollapsed && <span>Locations</span>}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col">
            {/* App Header */}
            <header className="glass-panel m-4 mb-0 px-6 py-4 flex justify-between items-center z-20">
                <div className="flex items-center gap-4">
                    {/* Mobile Toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors text-gray-700 lg:hidden"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Desktop Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="hidden lg:block p-2 hover:bg-black/5 rounded-lg transition-colors text-gray-700"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            {title || 'EnvAiroMetrics'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Welcome,</span>
                        <span className="font-semibold text-gray-800">{user?.username}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="hidden md:inline">Logout</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 relative overflow-hidden">
                {/* Desktop Sidebar (Static) */}
                <motion.aside
                    initial={false}
                    animate={{ width: isSidebarCollapsed ? 80 : 256 }}
                    className="hidden lg:block glass-panel m-4 mt-0 z-10 border-r-0 rounded-r-none h-full overflow-hidden"
                >
                    <SidebarContent />
                </motion.aside>

                {/* Mobile Sidebar (Animated) */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSidebarOpen(false)}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                            />
                            {/* Drawer */}
                            <motion.aside
                                initial={{ x: -300 }}
                                animate={{ x: 0 }}
                                exit={{ x: -300 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute top-0 left-0 h-full w-64 glass-panel m-4 mt-0 z-40 border-r-0 rounded-r-none lg:hidden bg-white"
                            >
                                <SidebarContent />
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <main className="flex-1 p-4 overflow-y-auto">
                    {children}
                </main>
            </div>

            {/* Footer */}
            <footer className="text-center py-4 text-xs text-gray-500 glass-panel m-4 mt-0 rounded-t-none border-t-0">
                © 2025 Silotech. All rights reserved.
            </footer>
        </div>
    );
};

export default DashboardLayout;
