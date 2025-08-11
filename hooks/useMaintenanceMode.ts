import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceSettings } from '../types/maintenance';
import { useAuth } from './useAuth';

export const useMaintenanceMode = () => {
    const [maintenance, setMaintenance] = useState<MaintenanceSettings & { isAutomatic?: boolean } | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'maintenance'), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as MaintenanceSettings & { isAutomatic?: boolean };
                setMaintenance(data);
            } else {
                setMaintenance(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const isInMaintenanceMode = () => {
        if (!maintenance?.isEnabled) return false;
        if (user?.role === 'admin') return false;
        
        // For manual mode, just check if it's enabled
        if (!maintenance.isAutomatic) {
            return true;
        }
        
        // For automatic mode, check the time schedule
        const now = new Date();
        const start = new Date(maintenance.startTime);
        const end = new Date(maintenance.endTime);
        
        return now >= start && now <= end;
    };

    return {
        maintenance,
        isInMaintenanceMode: isInMaintenanceMode()
    };
};
