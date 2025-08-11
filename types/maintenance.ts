export interface MaintenanceSettings {
    isEnabled: boolean;
    isAutomatic: boolean;
    message: string;
    startTime: string | null;
    endTime: string | null;
}
