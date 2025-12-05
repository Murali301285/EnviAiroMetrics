import axios from 'axios';
import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { Plus, Trash2, Edit, RefreshCw, Filter, Search, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const LocationManagement = () => {
    const [apps, setApps] = useState([]);
    const [selectedAppId, setSelectedAppId] = useState('');
    const [locations, setLocations] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);

    // Filters
    const [filterConfigured, setFilterConfigured] = useState('All'); // All, Yes, No
    const [filterActive, setFilterActive] = useState('Active'); // All, Active

    // Search, Sort, Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'last_received', direction: 'desc' });

    const [formData, setFormData] = useState({
        deviceId: '',
        location: '',
        fullAddress: '',
        remarks: '',
        isConfigured: false,
        sensorType: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchingLocations, setFetchingLocations] = useState(false);

    useEffect(() => {
        fetchApps();
    }, []);

    // Initial fetch removed - User must click Show
    // useEffect(() => {
    //     if (selectedAppId) {
    //         fetchLocations();
    //     } else {
    //         setLocations([]);
    //     }
    // }, [selectedAppId, filterConfigured, filterActive]);

    const handleShowData = () => {
        if (selectedAppId) {
            setLocations([]); // Reset data
            fetchLocations();
        } else {
            alert('Please select an application first.');
        }
    };

    const fetchApps = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/admin/apps', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApps(response.data);
            if (response.data.length > 0) {
                setSelectedAppId(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching apps:', error);
        }
    };

    const fetchLocations = async () => {
        setFetchingLocations(true);
        try {
            let url = `/api/admin/locations?appId=${selectedAppId}&active=${filterActive}`;
            if (filterConfigured !== 'All') {
                url += `&configured=${filterConfigured}`;
            }
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            console.log('Fetching locations with token:', token ? 'Token exists' : 'No token');

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLocations(response.data);
            setCurrentPage(1); // Reset to first page on new fetch
        } catch (error) {
            console.error('Error fetching locations:', error);
            if (error.response && error.response.status === 401) {
                alert('Session expired. Please login again.');
                window.location.href = '/login';
            }
        } finally {
            setFetchingLocations(false);
        }
    };

    const handleOpenModal = (loc = null) => {
        if (loc) {
            setEditingLocation(loc);
            setFormData({
                deviceId: loc.deviceid,
                location: loc.location,
                fullAddress: loc.full_address || '',
                remarks: loc.remarks || '',
                isConfigured: loc.is_configured === 1 || loc.is_configured === true,
                sensorType: loc.sensor_type || ''
            });
        } else {
            setEditingLocation(null);
            setFormData({
                deviceId: '',
                location: '',
                fullAddress: '',
                remarks: '',
                isConfigured: false,
                sensorType: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            appId: selectedAppId,
            deviceId: formData.deviceId,
            location: formData.location,
            fullAddress: formData.fullAddress,
            remarks: formData.remarks,
            isConfigured: formData.isConfigured,
            sensorType: formData.sensorType
        };

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (editingLocation) {
                await axios.put(`/api/admin/locations/${editingLocation.id}`, payload, config);
            } else {
                await axios.post('/api/admin/locations', payload, config);
            }

            setIsModalOpen(false);
            fetchLocations();
        } catch (error) {
            console.error('Error saving location:', error);
            alert(error.response?.data?.message || 'Failed to save location');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this location?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/locations/${id}?appId=${selectedAppId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchLocations();
        } catch (error) {
            console.error('Error deleting location:', error);
            alert('Failed to delete location');
        }
    };

    // --- Sorting, Filtering, Pagination Logic ---

    // Helper for Date Formatting (dd/mm/yyyy HH:mm:ss)
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Helper for Time Difference
    const calculateTimeDifference = (dateString) => {
        if (!dateString) return '-';
        const now = new Date();
        const lastReceived = new Date(dateString);
        const diffMs = now - lastReceived;

        if (diffMs < 0) return '0 mins'; // Should not happen ideally

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let result = [];
        if (diffDays > 0) result.push(`${diffDays} days`);
        if (diffHrs > 0) result.push(`${diffHrs} hrs`);
        if (diffMins > 0) result.push(`${diffMins} mins`);

        return result.length > 0 ? result.join(' ') : 'Just now';
    };

    const exportToExcel = () => {
        const dataToExport = processedLocations.map(loc => ({
            'Device ID': loc.deviceid,
            'Location': loc.location,
            'Full Address': loc.full_address,
            'Sensor': loc.sensor_type,
            'Configured': loc.is_configured ? 'Yes' : 'No',
            'Configured On': formatDate(loc.configured_on),
            'Last Data Received': formatDate(loc.last_received),
            'Time Since Last Data': calculateTimeDifference(loc.last_received),
            'Status': loc.isDeleted ? 'Deleted' : 'Active',
            'Remarks': loc.remarks
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Locations");
        XLSX.writeFile(wb, `Locations_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const processedLocations = useMemo(() => {
        let items = [...locations];

        // 1. Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            items = items.filter(loc =>
                (loc.deviceid && loc.deviceid.toLowerCase().includes(lowerTerm)) ||
                (loc.location && loc.location.toLowerCase().includes(lowerTerm)) ||
                (loc.full_address && loc.full_address.toLowerCase().includes(lowerTerm)) ||
                (loc.remarks && loc.remarks.toLowerCase().includes(lowerTerm))
            );
        }

        // 2. Sort
        if (sortConfig.key) {
            console.log(`Sorting by ${sortConfig.key} (${sortConfig.direction})`);
            items.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle nulls/undefined
                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                // Date sorting
                if (['configured_on', 'last_received'].includes(sortConfig.key)) {
                    const dateA = aValue ? new Date(aValue).getTime() : 0;
                    const dateB = bValue ? new Date(bValue).getTime() : 0;
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                }

                // String sorting (case-insensitive)
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [locations, searchTerm, sortConfig]);

    const currentItems = useMemo(() => {
        if (itemsPerPage === 'All') return processedLocations;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return processedLocations.slice(indexOfFirstItem, indexOfLastItem);
    }, [processedLocations, currentPage, itemsPerPage]);

    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(processedLocations.length / itemsPerPage);

    // Helper for Sort Icon
    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <div className="w-4 h-4 ml-1 inline-block opacity-20"><ChevronUp size={14} /></div>;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} className="ml-1 inline-block text-primary" />
            : <ChevronDown size={14} className="ml-1 inline-block text-primary" />;
    };

    const renderHeader = (label, key) => (
        <th
            className="p-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors select-none"
            onClick={() => handleSort(key)}
        >
            <div className="flex items-center">
                {label}
                <SortIcon columnKey={key} />
            </div>
        </th>
    );

    return (
        <DashboardLayout title="Location Management">
            <div className="space-y-6">

                {/* Filters & Actions */}
                <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                    <div className="flex flex-wrap gap-4 items-end w-full md:w-auto">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Application</label>
                            <select
                                value={selectedAppId}
                                onChange={(e) => setSelectedAppId(e.target.value)}
                                className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                            >
                                {apps.map(app => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Configured</label>
                            <select
                                value={filterConfigured}
                                onChange={(e) => setFilterConfigured(e.target.value)}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                            >
                                <option value="All">All</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Status</label>
                            <select
                                value={filterActive}
                                onChange={(e) => setFilterActive(e.target.value)}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                            >
                                <option value="Active">Active Only</option>
                                <option value="All">All (Inc. Deleted)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full md:w-64"
                            />
                        </div>

                        <button
                            onClick={handleShowData}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 h-[42px]"
                            title="Show Data"
                        >
                            <RefreshCw size={20} /> <span className="hidden sm:inline">Show</span>
                        </button>

                        <button
                            onClick={exportToExcel}
                            disabled={processedLocations.length === 0}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 h-[42px]"
                            title="Download Excel"
                        >
                            <Download size={20} /> <span className="hidden sm:inline">Excel</span>
                        </button>

                        <button
                            onClick={() => handleOpenModal()}
                            disabled={!selectedAppId}
                            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                        >
                            <Plus size={20} /> <span className="hidden sm:inline">Add Location</span>
                        </button>
                    </div>
                </div>

                {/* Locations Table */}
                <div className="glass-panel overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">
                            Configured Locations
                            <span className="ml-2 text-sm font-normal text-gray-500">({processedLocations.length} total)</span>
                        </h3>
                        {fetchingLocations && <RefreshCw size={18} className="animate-spin text-gray-400" />}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50">
                                <tr className="border-b border-gray-200 text-gray-600 text-sm whitespace-nowrap">
                                    <th className="p-4 font-semibold">Sl No</th>
                                    {renderHeader('Device ID', 'deviceid')}
                                    {renderHeader('Location', 'location')}
                                    {renderHeader('Full Address', 'full_address')}
                                    {renderHeader('Sensor', 'sensor_type')}
                                    {renderHeader('Configured?', 'is_configured')}
                                    {renderHeader('Configured On', 'configured_on')}
                                    {renderHeader('Last Data Received', 'last_received')}
                                    <th
                                        className="p-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('last_received')}
                                    >
                                        <div className="flex items-center">
                                            Time Since Last Data
                                            <SortIcon columnKey="last_received" />
                                        </div>
                                    </th>
                                    {renderHeader('Status', 'isDeleted')}
                                    {renderHeader('Remarks', 'remarks')}
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {currentItems.length > 0 ? (
                                    currentItems.map((loc, index) => (
                                        <tr key={loc.id} className={`hover:bg-gray-50 transition-colors ${loc.isDeleted ? 'bg-red-50/50' : ''}`}>
                                            <td className="p-4 text-gray-500">
                                                {itemsPerPage === 'All' ? index + 1 : (currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900">{loc.deviceid}</td>
                                            <td className="p-4 text-gray-700">{loc.location}</td>
                                            <td className="p-4 text-gray-500 max-w-xs truncate" title={loc.full_address}>{loc.full_address || '-'}</td>
                                            <td className="p-4 text-gray-700">{loc.sensor_type || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${loc.is_configured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {loc.is_configured ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500">
                                                {formatDate(loc.configured_on)}
                                            </td>
                                            <td className="p-4 text-gray-500">
                                                {formatDate(loc.last_received)}
                                            </td>
                                            <td className="p-4 text-gray-500 font-medium">
                                                {calculateTimeDifference(loc.last_received)}
                                            </td>
                                            <td className="p-4">
                                                {loc.isDeleted ? (
                                                    <span className="text-red-500 font-medium">Deleted</span>
                                                ) : (
                                                    <span className="text-green-600 font-medium">Active</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-500 max-w-xs truncate" title={loc.remarks}>{loc.remarks || '-'}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(loc)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Location"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {!loc.isDeleted && (
                                                        <button
                                                            onClick={() => handleDelete(loc.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Location"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="12" className="p-8 text-center text-gray-500">
                                            {selectedAppId ? 'No locations found matching criteria.' : 'Please select an app to view locations.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Rows per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value="All">All</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 mr-2">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingLocation ? 'Edit Location' : 'Add New Location'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* App Name Display */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-2 text-blue-800 mb-2">
                        <span className="font-semibold text-sm">Application:</span>
                        <span className="text-sm">{apps.find(a => a.id == selectedAppId)?.name || 'Unknown App'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
                            <input
                                type="text"
                                value={formData.deviceId}
                                onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="e.g., DEV-001"
                                required
                                disabled={!!editingLocation}
                            />
                            {editingLocation && <p className="text-xs text-gray-500 mt-1">Cannot be changed.</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sensor Type</label>
                            <input
                                type="text"
                                value={formData.sensorType}
                                onChange={(e) => setFormData({ ...formData, sensorType: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="e.g., NH3, CO2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name (Short)</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="e.g., Main Hall Entrance"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                        <textarea
                            value={formData.fullAddress}
                            onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Complete address details..."
                            rows="2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Optional notes..."
                            rows="2"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="isConfigured"
                            checked={formData.isConfigured}
                            onChange={(e) => setFormData({ ...formData, isConfigured: e.target.checked })}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="isConfigured" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                            Is Configured? (Ready to send data)
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-70 flex items-center gap-2"
                        >
                            {loading && <RefreshCw size={16} className="animate-spin" />}
                            {editingLocation ? 'Update Location' : 'Create Location'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
};

export default LocationManagement;
