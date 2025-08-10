import React, { useState, useRef, useEffect } from 'react';
import { SpinnerIcon } from './Icons';

interface VerificationCodeProps {
    onComplete: (code: string) => void;
    isVerifying: boolean;
    error?: string;
}

export const VerificationCode: React.FC<VerificationCodeProps> = ({
    onComplete,
    isVerifying,
    error
}) => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Focus the first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^[0-9]*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Move to next input if value is entered
        if (value !== '' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // If all digits are filled, call onComplete
        if (newCode.every(digit => digit !== '') && value !== '') {
            onComplete(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && code[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-center space-x-4">
                {code.map((digit, index) => (
                    <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={digit}
                        ref={el => inputRefs.current[index] = el}
                        onChange={e => handleChange(index, e.target.value)}
                        onKeyDown={e => handleKeyDown(index, e)}
                        className="w-12 h-12 text-center text-2xl border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                        disabled={isVerifying}
                    />
                ))}
            </div>
            {isVerifying && (
                <div className="flex justify-center">
                    <SpinnerIcon className="w-6 h-6 text-blue-600" />
                </div>
            )}
            {error && (
                <p className="text-center text-red-500 text-sm">{error}</p>
            )}
        </div>
    );
};