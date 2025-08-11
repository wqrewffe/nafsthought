import React from 'react';

interface MaintenanceBannerProps {
    message: string;
    startTime: string;
    endTime: string;
}

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({ message, startTime, endTime }) => {
    return (
        <div className="fixed inset-x-0 top-0 z-50">
            <div className="bg-yellow-500 text-white p-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between flex-wrap">
                        <div className="w-0 flex-1 flex items-center min-w-0">
                            <span className="flex p-2 rounded-lg bg-yellow-600">
                                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                            <p className="ml-3 font-medium text-white">
                                <span className="md:hidden">{message}</span>
                                <span className="hidden md:inline">
                                    {message} (From: {new Date(startTime).toLocaleString()} - Until: {new Date(endTime).toLocaleString()})
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
