import axios from 'axios';
import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { Plus, Trash2, Edit, Server } from 'lucide-react';

const AppConfiguration = () => {
    const [apps, setApps] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingApp, setEditingApp] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dbHost: '',
        dbUser: '',
        dbPass: '',
        dbName: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        try {
            const response = await axios.get('/api/admin/apps');
            const data = response.data;
            if (Array.isArray(data)) {
                setApps(data);
            }
        } catch (error) {
            console.error('Error fetching apps:', error);
        }
    };

    const handleOpenModal = (app = null) => {
        if (app) {
            setEditingApp(app);
            // Parse db_config if it's stored as JSON string or object
            let config = {};
            try {
                config = typeof app.db_config === 'string' ? JSON.parse(app.db_config) : app.db_config || {};
            } catch (e) { console.error(e); }

            setFormData({
                name: app.name,
                description: app.description || '',
                dbHost: config.host || '',
                dbUser: config.user || '',
                dbPass: config.password || '',
                dbName: config.database || ''
            });
        } else {
            setEditingApp(null);
            setFormData({
                name: '',
                description: '',
                dbHost: '',
                dbUser: '',
                dbPass: '',
                dbName: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const dbConfig = {
            host: formData.dbHost,
            user: formData.dbUser,
            password: formData.dbPass,
            database: formData.dbName
        };

        const payload = {
            name: formData.name,
            description: formData.description,
            dbConfig
        };

        try {
            if (editingApp) {
                await axios.put(`/api/admin/apps/${editingApp.id}`, payload);
            } else {
                await axios.post('/api/admin/apps', payload);
            }

            setIsModalOpen(false);
            fetchApps();
        } catch (error) {
            console.error('Error saving app:', error);
            alert('Failed to save app');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this app?')) return;
        try {
            await axios.delete(`/api/admin/apps/${id}`);
            fetchApps();
        } catch (error) {
            console.error('Error deleting app:', error);
        }
    };

    return (
        <DashboardLayout title="App Configuration">
            <div className="page-container">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Applications</h2>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> Add New App
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apps.map(app => (
                        <div key={app.id} className="glass-panel p-6 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl border border-white/50 relative group">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenModal(app)}
                                    className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(app.id)}
                                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                                    <Server size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">{app.name}</h3>
                            </div>
                            <p className="text-gray-500 text-sm mb-4">{app.description || 'No description provided.'}</p>

                            <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                                ID: {app.id}
                            </div>
                        </div>
                    ))}
                </div>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingApp ? "Edit App" : "Add New App"}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                rows="2"
                            />
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="text-sm font-bold text-gray-800 mb-3">Database Configuration</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Host</label>
                                    <input
                                        type="text"
                                        value={formData.dbHost}
                                        onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary outline-none text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Database Name</label>
                                    <input
                                        type="text"
                                        value={formData.dbName}
                                        onChange={(e) => setFormData({ ...formData, dbName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary outline-none text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
                                    <input
                                        type="text"
                                        value={formData.dbUser}
                                        onChange={(e) => setFormData({ ...formData, dbUser: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary outline-none text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={formData.dbPass}
                                        onChange={(e) => setFormData({ ...formData, dbPass: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2 px-4 rounded-lg shadow hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
};

export default AppConfiguration;
