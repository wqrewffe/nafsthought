import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceSettings } from '../types/maintenance';

interface MaintenanceSettingsExtended extends MaintenanceSettings {
    isAutomatic: boolean;
}

const MaintenanceMode: React.FC = () => {
    const [maintenance, setMaintenance] = useState<MaintenanceSettingsExtended>({
        isEnabled: false,
        isAutomatic: false,
        message: '',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Default to 24 hours from now
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMaintenanceSettings = async () => {
            try {
                const maintenanceDoc = await getDoc(doc(db, 'settings', 'maintenance'));
                if (maintenanceDoc.exists()) {
                    setMaintenance(maintenanceDoc.data() as MaintenanceSettings);
                }
            } catch (error) {
                console.error('Error fetching maintenance settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMaintenanceSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, 'settings', 'maintenance'), maintenance);
            alert('Maintenance settings updated successfully');
        } catch (error) {
            console.error('Error updating maintenance settings:', error);
            alert('Failed to update maintenance settings');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Maintenance Mode
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mode Selection */}
                <div className="flex items-center space-x-4 mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Maintenance Mode Type:
                    </label>
                    <div className="flex space-x-4">
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                checked={!maintenance.isAutomatic}
                                onChange={() => setMaintenance(prev => ({ ...prev, isAutomatic: false }))}
                                className="form-radio text-blue-600"
                            />
                            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Manual</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                checked={maintenance.isAutomatic}
                                onChange={() => setMaintenance(prev => ({ ...prev, isAutomatic: true }))}
                                className="form-radio text-blue-600"
                            />
                            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Automatic</span>
                        </label>
                    </div>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center space-x-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={maintenance.isEnabled}
                            onChange={(e) => setMaintenance(prev => ({ ...prev, isEnabled: e.target.checked }))}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-slate-900 dark:text-white">
                            {maintenance.isEnabled ? 'Maintenance Mode Active' : 'Maintenance Mode Inactive'}
                        </span>
                    </label>
                </div>
                
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Maintenance Message
                    </label>
                    <textarea
                        value={maintenance.message}
                        onChange={(e) => setMaintenance(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                        rows={3}
                        placeholder="Site is under maintenance. We'll be back soon!"
                        required
                    />
                </div>

                {maintenance.isAutomatic && (
                    <>
                        {/* Quick Duration Options */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Quick Duration
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const now = new Date();
                                        const end = new Date(now.getTime() + 30 * 60000); // 30 minutes
                                        setMaintenance(prev => ({
                                            ...prev,
                                            startTime: now.toISOString(),
                                            endTime: end.toISOString()
                                        }));
                                    }}
                                    className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                                >
                                    30 Minutes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const now = new Date();
                                        const end = new Date(now.getTime() + 60 * 60000); // 1 hour
                                        setMaintenance(prev => ({
                                            ...prev,
                                            startTime: now.toISOString(),
                                            endTime: end.toISOString()
                                        }));
                                    }}
                                    className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                                >
                                    1 Hour
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const now = new Date();
                                        const end = new Date(now.getTime() + 2 * 60 * 60000); // 2 hours
                                        setMaintenance(prev => ({
                                            ...prev,
                                            startTime: now.toISOString(),
                                            endTime: end.toISOString()
                                        }));
                                    }}
                                    className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                                >
                                    2 Hours
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const now = new Date();
                                        const end = new Date(now.getTime() + 24 * 60 * 60000); // 24 hours
                                        setMaintenance(prev => ({
                                            ...prev,
                                            startTime: now.toISOString(),
                                            endTime: end.toISOString()
                                        }));
                                    }}
                                    className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                                >
                                    24 Hours
                                </button>
                            </div>
                        </div>

                        {/* Custom Time Selection */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Start Time
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="date"
                                        value={maintenance.startTime.slice(0, 10)}
                                        onChange={(e) => {
                                            const date = e.target.value;
                                            const time = maintenance.startTime.slice(11, 16);
                                            const newDateTime = new Date(`${date}T${time}`);
                                            setMaintenance(prev => ({ ...prev, startTime: newDateTime.toISOString() }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                        required
                                    />
                                    <input
                                        type="time"
                                        value={maintenance.startTime.slice(11, 16)}
                                        onChange={(e) => {
                                            const date = maintenance.startTime.slice(0, 10);
                                            const time = e.target.value;
                                            const newDateTime = new Date(`${date}T${time}`);
                                            setMaintenance(prev => ({ ...prev, startTime: newDateTime.toISOString() }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    End Time
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="date"
                                        value={maintenance.endTime.slice(0, 10)}
                                        onChange={(e) => {
                                            const date = e.target.value;
                                            const time = maintenance.endTime.slice(11, 16);
                                            const newDateTime = new Date(`${date}T${time}`);
                                            setMaintenance(prev => ({ ...prev, endTime: newDateTime.toISOString() }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                        required
                                    />
                                    <input
                                        type="time"
                                        value={maintenance.endTime.slice(11, 16)}
                                        onChange={(e) => {
                                            const date = maintenance.endTime.slice(0, 10);
                                            const time = e.target.value;
                                            const newDateTime = new Date(`${date}T${time}`);
                                            setMaintenance(prev => ({ ...prev, endTime: newDateTime.toISOString() }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        {maintenance.isAutomatic ? 'Save Schedule' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MaintenanceMode;
