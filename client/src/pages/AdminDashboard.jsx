import axios from 'axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const AdminDashboard = () => {
    const [apps, setApps] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        try {
            const response = await axios.get('/api/admin/apps');
            const data = response.data;
            if (Array.isArray(data)) {
                setApps(data);
            } else {
                console.error('API returned non-array:', data);
                setApps([]);
            }
        } catch (error) {
            console.error('Error fetching apps:', error);
            setApps([]);
        }
    };

    return (
        <DashboardLayout title="Admin Dashboard">
            <div className="page-container">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apps.map(app => (
                        <div
                            key={app.id}
                            onClick={() => navigate(`/app/${app.id}`)}
                            className="glass-panel p-6 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl border border-white/50 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-blue-100 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Activity size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">{app.name}</h3>
                            </div>
                            <p className="text-gray-500 text-sm">{app.description || 'Monitor air quality and people count.'}</p>
                        </div>
                    ))}

                    {apps.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No apps configured. Go to App Configuration to add one.
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
