import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import SearchableSelect from '../components/SearchableSelect';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Download, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AppDashboard = () => {
    const { appId } = useParams();

    // Date Defaults
    const getDefaultDates = () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const format = (d) => {
            const pad = (n) => n < 10 ? '0' + n : n;
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        return { from: format(startOfDay), to: format(endOfDay) };
    };

    const [dateFrom, setDateFrom] = useState(getDefaultDates().from);
    const [dateTo, setDateTo] = useState(getDefaultDates().to);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [devices, setDevices] = useState([]);
    const [rawData, setRawData] = useState([]);
    const [hourlyData, setHourlyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [appName, setAppName] = useState('Loading...');

    // Pagination States
    const [hourlyPage, setHourlyPage] = useState(1);
    const [hourlyLimit, setHourlyLimit] = useState(10);
    const [rawPage, setRawPage] = useState(1);
    const [rawLimit, setRawLimit] = useState(10);
    const [dbPage, setDbPage] = useState(1);
    const [dbLimit, setDbLimit] = useState(10);

    // Data Limit & Search States
    const [dataLimit, setDataLimit] = useState('1000');
    const [rawSearchTerm, setRawSearchTerm] = useState('');
    const [dbSearchTerm, setDbSearchTerm] = useState('');

    // Chart Refs for Download
    const h2sAqiChartRef = useRef(null);
    const h2sPpmChartRef = useRef(null);
    const odourChartRef = useRef(null);

    useEffect(() => {
        fetchAppName();
        fetchDevices();
    }, [appId]);

    useEffect(() => {
        if (selectedDevice) {
            fetchData();
        }
    }, [selectedDevice]);

    const fetchAppName = async () => {
        try {
            const response = await axios.get('/api/admin/apps');
            const data = response.data;
            const app = data.find(a => a.id === parseInt(appId));
            if (app) setAppName(app.name);
        } catch (error) {
            console.error('Error fetching app name:', error);
        }
    };

    const fetchDevices = async () => {
        try {
            const response = await axios.get(`/api/data/devices?appId=${appId}`);
            const data = response.data;
            setDevices(data);
            if (data.length > 0 && !selectedDevice) {
                setSelectedDevice(data[0].deviceid);
            }
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `/api/data/dashboard?appId=${appId}`;
            if (selectedDevice) url += `&deviceId=${selectedDevice}`;
            if (dateFrom) url += `&fromDate=${dateFrom}`;
            if (dateTo) url += `&toDate=${dateTo}`;
            if (dataLimit) url += `&limit=${dataLimit}`;

            const response = await axios.get(url);
            const data = response.data;
            setRawData(data.rawData || []);
            setHourlyData(data.hourlyData || []);
            setHourlyPage(1); // Reset pagination on new fetch
            setRawPage(1);
            setDbPage(1);
            setRawSearchTerm(''); // Reset search on new fetch
            setDbSearchTerm('');
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadExcel = (data, filename) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${filename}-${selectedDevice || 'all'}-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Pagination Logic
    const paginate = (data, page, limit) => {
        if (limit === 'All') return data;
        const start = (page - 1) * limit;
        return data.slice(start, start + limit);
    };

    // Helper function to get category colors
    const getCategoryColor = (category) => {
        if (!category) return 'bg-gray-100 text-gray-600 border border-gray-300';

        switch (category.toLowerCase()) {
            case 'good':
                return 'bg-green-100 text-green-800 border border-green-300';
            case 'satisfactory':
                return 'bg-blue-100 text-blue-800 border border-blue-300';
            case 'moderate':
                return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
            case 'poor':
            case 'very poor':
            case 'severe':
            default:
                return 'bg-red-100 text-red-800 border border-red-300';
        }
    };

    // Search filter functions
    const filterRawData = (data) => {
        if (!rawSearchTerm.trim()) return data;
        const term = rawSearchTerm.toLowerCase();
        return data.filter(row =>
            row.deviceId?.toLowerCase().includes(term) ||
            row.location?.toLowerCase().includes(term) ||
            row.category?.toLowerCase().includes(term) ||
            row.revText?.toLowerCase().includes(term) ||
            new Date(row.receivedOn).toLocaleString().toLowerCase().includes(term)
        );
    };

    const filterDbData = (data) => {
        if (!dbSearchTerm.trim()) return data;
        const term = dbSearchTerm.toLowerCase();
        return data.filter(row =>
            row.deviceId?.toLowerCase().includes(term) ||
            row.location?.toLowerCase().includes(term) ||
            row.revText?.toLowerCase().includes(term) ||
            new Date(row.receivedOn).toLocaleString().toLowerCase().includes(term)
        );
    };

    //Download chart as image
    const downloadChartAsImage = (chartRef, filename) => {
        if (chartRef && chartRef.current) {
            const url = chartRef.current.toBase64Image();
            const link = document.createElement('a');
            link.download = `${filename}-${selectedDevice || 'all'}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = url;
            link.click();
        }
    };

    const PaginationControls = ({ total, page, limit, setPage, setLimit }) => {
        const totalPages = limit === 'All' ? 1 : Math.ceil(total / limit);

        return (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(e.target.value === 'All' ? 'All' : Number(e.target.value));
                            setPage(1);
                        }}
                        className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-primary"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value="All">All</option>
                    </select>
                    <span>entries</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        );
    };

    // Chart Config - Using Raw Data
    // Raw data is sorted DESC (newest first), so we reverse for the chart (oldest left, newest right)
    const chartData = [...rawData].reverse();

    const chartLabels = chartData.map(d => {
        const date = new Date(d.receivedOn);
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    });

    const isAqiApp = appName === 'AQI';

    // NH3 Data
    const nh3Values = chartData.map(d => d.nh3);

    // People Count Data (Relative)
    const minPir = chartData.length > 0 ? Math.min(...chartData.map(d => d.pir)) : 0;
    const peopleValues = chartData.map(d => d.pir - minPir);

    // AQI Data
    const h2sAqiValues = chartData.map(d => d.h2s_aqi || 0);
    const h2sPpmValues = chartData.map(d => d.h2s_ppm || 0);

    // Odour Index Data Parsing (from revText)
    const odourValues = chartData.map(d => {
        if (!d.revText) return 0;
        // Search for "Odour Index:X" or "Odour Index:X.XX"
        const match = d.revText.match(/Odour Index:([\d.]+)/i);
        return match ? parseFloat(match[1]) : 0;
    });

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { color: '#64748b' } },
            title: { display: false },
            tooltip: {
                callbacks: {
                    title: (context) => {
                        const index = context[0].dataIndex;
                        return new Date(chartData[index].receivedOn).toLocaleString();
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { color: '#64748b' }
            },
            x: {
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    maxTicksLimit: 20
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    // Chart Datasets
    const nh3ChartData = {
        labels: chartLabels,
        datasets: [{
            label: 'NH3 (PPM)',
            data: nh3Values,
            borderColor: '#00d2ff',
            backgroundColor: 'rgba(0, 210, 255, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
        }],
    };

    const peopleChartData = {
        labels: chartLabels,
        datasets: [{
            label: 'People Count (PIR)',
            data: peopleValues,
            borderColor: '#ff0080',
            backgroundColor: 'rgba(255, 0, 128, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
        }],
    };

    const h2sAqiChartData = {
        labels: chartLabels,
        datasets: [{
            label: 'H2S AQI',
            data: h2sAqiValues,
            borderColor: '#10b981', // Greenish
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
        }],
    };

    // Custom options for H2S AQI chart with colored zones
    const h2sAqiChartOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                max: Math.max(...h2sAqiValues, 100) + 20, // Add some padding
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return;

                    // Create gradient zones
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);

                    // Calculate positions based on AQI ranges
                    const maxY = Math.max(...h2sAqiValues, 100) + 20;
                    const good = 50 / maxY;          // 0-50: Good (Green)
                    const satisfactory = 100 / maxY; // 51-100: Satisfactory (Blue)

                    // Add color stops (from bottom to top)
                    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.05)');       // Green at bottom (Good)
                    gradient.addColorStop(good, 'rgba(34, 197, 94, 0.05)');    // Green until 50
                    gradient.addColorStop(good, 'rgba(59, 130, 246, 0.05)');   // Blue starts at 51
                    gradient.addColorStop(satisfactory, 'rgba(59, 130, 246, 0.05)'); // Blue until 100
                    gradient.addColorStop(satisfactory, 'rgba(239, 68, 68, 0.05)');  // Red starts at 101
                    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');       // Red to top

                    return gradient;
                }
            }
        },
        plugins: {
            ...commonOptions.plugins,
            legend: {
                ...commonOptions.plugins.legend,
                labels: {
                    ...commonOptions.plugins.legend.labels,
                    generateLabels: (chart) => {
                        const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
                        // Add category legend
                        return [
                            ...original,
                            {
                                text: 'Good (0-50)',
                                fillStyle: 'rgba(34, 197, 94, 0.3)',
                                strokeStyle: 'rgba(34, 197, 94, 1)',
                                lineWidth: 1,
                            },
                            {
                                text: 'Satisfactory (51-100)',
                                fillStyle: 'rgba(59, 130, 246, 0.3)',
                                strokeStyle: 'rgba(59, 130, 246, 1)',
                                lineWidth: 1,
                            },
                            {
                                text: 'Poor/Severe (>100)',
                                fillStyle: 'rgba(239, 68, 68, 0.3)',
                                strokeStyle: 'rgba(239, 68, 68, 1)',
                                lineWidth: 1,
                            }
                        ];
                    }
                }
            }
        }
    };

    // Odour Index Chart Config
    const odourChartData = {
        labels: chartLabels,
        datasets: [{
            label: 'Odour Index',
            data: odourValues,
            borderColor: '#8b5cf6', // Violet/Purple
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
        }],
    };

    const odourChartOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                max: Math.max(...odourValues, 100) + 10,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return;

                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    const maxY = Math.max(...odourValues, 100) + 10;

                    // Zones: 0-20 (Good), 21-40 (Fair), 41-60 (Moderate), 61-80 (Poor), 81-100 (Very Poor)
                    const p20 = 20 / maxY;
                    const p40 = 40 / maxY;
                    const p60 = 60 / maxY;
                    const p80 = 80 / maxY;
                    const p100 = 100 / maxY;

                    // Green -> Blue -> Yellow -> Orange -> Red
                    // Note: addColorStop positions are 0.0 to 1.0 (bottom to top)

                    // 0-20 Good (Green)
                    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.1)');
                    gradient.addColorStop(p20, 'rgba(34, 197, 94, 0.1)');

                    // 21-40 Fair (Blue)
                    gradient.addColorStop(p20, 'rgba(59, 130, 246, 0.1)');
                    gradient.addColorStop(p40, 'rgba(59, 130, 246, 0.1)');

                    // 41-60 Moderate (Yellow)
                    gradient.addColorStop(p40, 'rgba(234, 179, 8, 0.1)');
                    gradient.addColorStop(p60, 'rgba(234, 179, 8, 0.1)');

                    // 61-80 Poor (Orange)
                    gradient.addColorStop(p60, 'rgba(249, 115, 22, 0.1)');
                    gradient.addColorStop(p80, 'rgba(249, 115, 22, 0.1)');

                    // 81-100 Very Poor (Red)
                    gradient.addColorStop(p80, 'rgba(239, 68, 68, 0.1)');
                    gradient.addColorStop(p100, 'rgba(239, 68, 68, 0.1)');

                    // > 100 (Keep Red)
                    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');

                    return gradient;
                }
            }
        },
        plugins: {
            ...commonOptions.plugins,
            legend: {
                ...commonOptions.plugins.legend,
                labels: {
                    ...commonOptions.plugins.legend.labels,
                    generateLabels: (chart) => {
                        const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
                        return [
                            ...original,
                            { text: 'Good (1-20)', fillStyle: 'rgba(34, 197, 94, 0.5)', strokeStyle: 'transparent' },
                            { text: 'Fair (21-40)', fillStyle: 'rgba(59, 130, 246, 0.5)', strokeStyle: 'transparent' },
                            { text: 'Mod (41-60)', fillStyle: 'rgba(234, 179, 8, 0.5)', strokeStyle: 'transparent' },
                            { text: 'Poor (61-80)', fillStyle: 'rgba(249, 115, 22, 0.5)', strokeStyle: 'transparent' },
                            { text: 'V.Poor (81-100)', fillStyle: 'rgba(239, 68, 68, 0.5)', strokeStyle: 'transparent' },
                        ];
                    }
                }
            }
        }
    };

    const h2sPpmChartData = {
        labels: chartLabels,
        datasets: [{
            label: 'H2S PPM',
            data: h2sPpmValues,
            borderColor: '#f59e0b', // Orange/Yellow
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
        }],
    };

    const deviceOptions = devices.map(d => ({ value: d.deviceid, label: `${d.deviceid} - ${d.location}` }));

    return (
        <DashboardLayout title={appName}>
            <div className="space-y-6">

                {/* Filter Header */}
                <div className="glass-panel p-4 mb-6 relative z-30">
                    <div className="flex flex-wrap gap-4 items-end justify-between">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="w-64">
                                <label className="block text-xs text-gray-600 mb-1">Device ID</label>
                                <SearchableSelect
                                    options={deviceOptions}
                                    value={selectedDevice}
                                    onChange={setSelectedDevice}
                                    placeholder="Select Device..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-600 mb-1">From Date</label>
                                <input
                                    type="datetime-local"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none h-[42px]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-600 mb-1">To Date</label>
                                <input
                                    type="datetime-local"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none h-[42px]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Data Limit</label>
                                <select
                                    value={dataLimit}
                                    onChange={(e) => setDataLimit(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none h-[42px] bg-white"
                                >
                                    <option value="1000">1000 rows</option>
                                    <option value="5000">5000 rows</option>
                                    <option value="10000">10000 rows</option>
                                    <option value="all">All Data ⚠️</option>
                                </select>
                            </div>

                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 h-[42px] disabled:opacity-70"
                            >
                                {loading ? <RefreshCw size={18} className="animate-spin" /> : <Filter size={18} />}
                                {loading ? 'Loading...' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {/* Info Label */}
                    <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Showing data for <span className="font-semibold text-gray-700">{selectedDevice || 'All Devices'}</span> from <span className="font-semibold text-gray-700">{new Date(dateFrom).toLocaleString()}</span> to <span className="font-semibold text-gray-700">{new Date(dateTo).toLocaleString()}</span>
                    </div>
                </div>

                {/* Charts - Conditional Rendering */}
                <div className="space-y-6">
                    {isAqiApp ? (
                        <>
                            <div className="glass-panel p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-green-600 rounded-full"></span>
                                        H2S AQI Dashboard
                                    </h3>
                                    <button
                                        onClick={() => downloadChartAsImage(h2sAqiChartRef, 'h2s-aqi-chart')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                    >
                                        <Download size={16} /> Download PNG
                                    </button>
                                </div>
                                <div className="h-[350px]">
                                    {rawData.length > 0 ? (
                                        <Line
                                            ref={h2sAqiChartRef}
                                            options={h2sAqiChartOptions}
                                            data={h2sAqiChartData}
                                            plugins={[{
                                                id: 'h2sAqiSeverityLines',
                                                afterDatasetsDraw(chart) {
                                                    const { ctx, chartArea: { left, right, top, bottom }, scales: { y } } = chart;

                                                    const levels = [
                                                        { value: 50, label: 'Good (0-50)', color: '#15803d' }, // green-700
                                                        { value: 100, label: 'Satisfactory (51-100)', color: '#1d4ed8' }, // blue-700
                                                    ];

                                                    ctx.save();
                                                    ctx.textAlign = 'right';
                                                    ctx.textBaseline = 'bottom';
                                                    ctx.font = 'bold 11px sans-serif';

                                                    // Draw standard levels
                                                    levels.forEach(level => {
                                                        const yPos = y.getPixelForValue(level.value);

                                                        if (yPos >= top && yPos <= bottom) {
                                                            ctx.beginPath();
                                                            ctx.lineWidth = 1;
                                                            ctx.strokeStyle = level.color;
                                                            ctx.globalAlpha = 0.6;
                                                            ctx.setLineDash([6, 4]);
                                                            ctx.moveTo(left, yPos);
                                                            ctx.lineTo(right, yPos);
                                                            ctx.stroke();

                                                            ctx.fillStyle = level.color;
                                                            ctx.globalAlpha = 1.0;
                                                            ctx.fillText(level.label, right - 10, yPos - 4);
                                                        }
                                                    });

                                                    // Special handling for Poor/Severe (>100)
                                                    // We render this label near the top if the scale goes above 100
                                                    if (y.max > 100) {
                                                        // Valid position just above the 100 line or at the chart top?
                                                        // Let's put it at y=105 or just below the top edge if visible
                                                        const poorLabelValue = Math.max(110, (y.max + 100) / 2); // Position it somewhere in the red zone
                                                        // Actually, just drawing it attached to the top of the chart might be safer if max is varying

                                                        // Let's try drawing a line/label at 101 or slightly above 100 line
                                                        const y100 = y.getPixelForValue(100);
                                                        if (y100 >= top) {
                                                            ctx.fillStyle = '#b91c1c'; // red-700
                                                            ctx.fillText('Poor/Severe (>100)', right - 10, y100 - 20); // 20px above the 100 line
                                                        }
                                                    }

                                                    ctx.restore();
                                                }
                                            }]}
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">No data available</div>
                                    )}
                                </div>
                            </div>

                            <div className="glass-panel p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-violet-600 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-violet-600 rounded-full"></span>
                                        Odour Index Dashboard
                                    </h3>
                                    <button
                                        onClick={() => downloadChartAsImage(odourChartRef, 'odour-chart')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium"
                                    >
                                        <Download size={16} /> Download PNG
                                    </button>
                                </div>
                                <div className="h-[350px]">
                                    {rawData.length > 0 ? (
                                        <Line
                                            ref={odourChartRef}
                                            options={odourChartOptions}
                                            data={odourChartData}
                                            plugins={[{
                                                id: 'odourSeverityLines',
                                                afterDatasetsDraw(chart) {
                                                    const { ctx, chartArea: { left, right, top, bottom }, scales: { y } } = chart;

                                                    const levels = [
                                                        { value: 20, label: 'Good (1-20)', color: '#15803d' }, // green-700
                                                        { value: 40, label: 'Fair (21-40)', color: '#1d4ed8' }, // blue-700
                                                        { value: 60, label: 'Moderate (41-60)', color: '#a16207' }, // yellow-700
                                                        { value: 80, label: 'Poor (61-80)', color: '#c2410c' }, // orange-700
                                                        { value: 100, label: 'Very Poor (81-100)', color: '#b91c1c' } // red-700
                                                    ];

                                                    ctx.save();
                                                    ctx.textAlign = 'right';
                                                    ctx.textBaseline = 'bottom';
                                                    ctx.font = 'bold 11px sans-serif';

                                                    levels.forEach(level => {
                                                        const yPos = y.getPixelForValue(level.value);

                                                        // Only draw if within visible chart area (approx)
                                                        if (yPos >= top && yPos <= bottom) {
                                                            // Line
                                                            ctx.beginPath();
                                                            ctx.lineWidth = 1;
                                                            ctx.strokeStyle = level.color;
                                                            ctx.globalAlpha = 0.6;
                                                            ctx.setLineDash([6, 4]); // Dashed line
                                                            ctx.moveTo(left, yPos);
                                                            ctx.lineTo(right, yPos);
                                                            ctx.stroke();

                                                            // Label
                                                            ctx.fillStyle = level.color;
                                                            ctx.globalAlpha = 1.0;
                                                            ctx.fillText(level.label, right - 10, yPos - 4);
                                                        }
                                                    });
                                                    ctx.restore();
                                                }
                                            }]}
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">No data available</div>
                                    )}
                                </div>
                            </div>

                            <div className="glass-panel p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-yellow-600 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-yellow-600 rounded-full"></span>
                                        H2S Dashboard
                                    </h3>
                                    <button
                                        onClick={() => downloadChartAsImage(h2sPpmChartRef, 'h2s-ppm-chart')}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
                                    >
                                        <Download size={16} /> Download PNG
                                    </button>
                                </div>
                                <div className="h-[350px]">
                                    {rawData.length > 0 ? (
                                        <Line ref={h2sPpmChartRef} options={commonOptions} data={h2sPpmChartData} />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">No data available</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
                                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                                    PPM Dashboard (NH3)
                                </h3>
                                <div className="h-[350px]">
                                    {hourlyData.length > 0 ? (
                                        <Line options={commonOptions} data={nh3ChartData} />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">No data available</div>
                                    )}
                                </div>
                            </div>

                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-semibold mb-4 text-accent flex items-center gap-2">
                                    <span className="w-1 h-6 bg-accent rounded-full"></span>
                                    People Count
                                </h3>
                                <div className="h-[350px]">
                                    {hourlyData.length > 0 ? (
                                        <Line options={commonOptions} data={peopleChartData} />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">No data available</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Hourly Data Table - Removed as per request */}
                {/* 
                <div className="glass-panel p-6 overflow-hidden mb-6">
                    ...
                </div> 
                */}

                {/* Raw Data Table */}
                <div className="glass-panel p-6 overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4 flex-1">
                            <h3 className="text-lg font-semibold">Received Raw Data ({rawData.length} rows)</h3>
                            <div className="relative flex-1 max-w-xs">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search data..."
                                    value={rawSearchTerm}
                                    onChange={(e) => {
                                        setRawSearchTerm(e.target.value);
                                        setRawPage(1); // Reset to first page on search
                                    }}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full text-sm"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownloadExcel(filterRawData(rawData), 'raw-data')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                        >
                            <Download size={16} /> Download Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50">
                                <tr className="border-b border-gray-200 text-gray-600 text-sm">
                                    <th className="p-3 font-semibold">Sl No</th>
                                    <th className="p-3 font-semibold">DateTime</th>
                                    <th className="p-3 font-semibold">Device Id</th>
                                    <th className="p-3 font-semibold">Location</th>
                                    <th className="p-3 font-semibold">PIR</th>
                                    {isAqiApp ? (
                                        <>
                                            <th className="p-3 font-semibold">H2S AQI</th>
                                            <th className="p-3 font-semibold">H2S PPM</th>
                                            <th className="p-3 font-semibold">Category</th>
                                        </>
                                    ) : (
                                        <th className="p-3 font-semibold">NH3</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filterRawData(rawData).length > 0 ? (
                                    paginate(filterRawData(rawData), rawPage, rawLimit).map((row, index) => (
                                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-gray-500">{(rawPage - 1) * (rawLimit === 'All' ? 0 : rawLimit) + index + 1}</td>
                                            <td className="p-3">{new Date(row.receivedOn).toLocaleString()}</td>
                                            <td className="p-3 font-medium">{row.deviceId}</td>
                                            <td className="p-3">{row.location}</td>
                                            <td className="p-3">{row.pir}</td>
                                            {isAqiApp ? (
                                                <>
                                                    <td className="p-3">{row.h2s_aqi}</td>
                                                    <td className="p-3">{row.h2s_ppm}</td>
                                                    <td className="p-3">
                                                        {row.category ? (
                                                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getCategoryColor(row.category)}`}>
                                                                {row.category}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">N/A</span>
                                                        )}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className="p-3">{row.nh3}</td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isAqiApp ? 8 : 6} className="p-8 text-center text-gray-500">No raw data found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        total={filterRawData(rawData).length}
                        page={rawPage}
                        limit={rawLimit}
                        setPage={setRawPage}
                        setLimit={setRawLimit}
                    />
                </div>

                {/* DB Data Table (Raw revText) */}
                <div className="glass-panel p-6 overflow-hidden mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4 flex-1">
                            <h3 className="text-lg font-semibold text-gray-800">DB Data (Raw String) ({rawData.length} rows)</h3>
                            <div className="relative flex-1 max-w-xs">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search raw data..."
                                    value={dbSearchTerm}
                                    onChange={(e) => {
                                        setDbSearchTerm(e.target.value);
                                        setDbPage(1); // Reset to first page on search
                                    }}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full text-sm"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownloadExcel(filterDbData(rawData), 'db-raw-data')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                        >
                            <Download size={16} /> Download Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50">
                                <tr className="border-b border-gray-200 text-gray-600 text-sm">
                                    <th className="p-3 font-semibold w-16">Sl No</th>
                                    <th className="p-3 font-semibold w-48">DateTime</th>
                                    <th className="p-3 font-semibold w-32">Device Id</th>
                                    <th className="p-3 font-semibold w-48">Location</th>
                                    <th className="p-3 font-semibold">Raw Data (revText)</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filterDbData(rawData).length > 0 ? (
                                    paginate(filterDbData(rawData), dbPage, dbLimit).map((row, index) => (
                                        <tr key={`db-${row.id}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-gray-500">{(dbPage - 1) * (dbLimit === 'All' ? 0 : dbLimit) + index + 1}</td>
                                            <td className="p-3">{new Date(row.receivedOn).toLocaleString()}</td>
                                            <td className="p-3 font-medium">{row.deviceId}</td>
                                            <td className="p-3">{row.location}</td>
                                            <td className="p-3 font-mono text-xs text-gray-600 break-all">{row.revText}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500">No data found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        total={filterDbData(rawData).length}
                        page={dbPage}
                        limit={dbLimit}
                        setPage={setDbPage}
                        setLimit={setDbLimit}
                    />
                </div>

            </div>
        </DashboardLayout>
    );
};

export default AppDashboard;
