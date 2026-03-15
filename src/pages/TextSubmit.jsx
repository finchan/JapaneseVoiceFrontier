import React, { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import API_CONFIG from '../config';

// Morandi color palette
const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    accent: '#c4a484',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    buttonHover: '#8a7a6a'
};

export default function TextSubmit() {
    const [inputText, setInputText] = useState('');
    const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'

    const handleConvert = async () => {
        const lines = inputText.split('\n');
        const filename = lines[0].trim();
        const text = lines.slice(1).join('\n').trim();

        if (!filename || !text) {
            setStatus('error');
            return;
        }

        const role = localStorage.getItem('user_role') || 'guest';
        setStatus('loading');

        try {
            const formData = new FormData();
            formData.append('filename', filename);
            formData.append('text', text);
            formData.append('role', role);

        const res = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.convert), {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Server error');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.mp3`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            setStatus('success');
        } catch {
            setStatus('error');
        }
    };

    return (
        <div className="p-4 md:p-6 japanese-text">

            {/* Scrollbar & textarea styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px !important;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #3d3d3d !important;
                    border-radius: 10px;
                }
                .custom-textarea:focus {
                    outline: none;
                    border-color: ${colors.primary};
                    box-shadow: 0 0 0 2px rgba(156, 140, 125, 0.1);
                }
            `}</style>

            <div className="w-full md:w-[800px] lg:w-[1024px] bg-white rounded-2xl md:rounded-[32px] p-6 md:p-12 shadow-sm border flex flex-col"
                 style={{ borderColor: colors.border, minHeight: '500px' }}>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4 md:mb-8">
                    <FileText size={18} style={{ color: colors.primary }} />
                    <h2 className="text-xl md:text-2xl font-bold" style={{ color: colors.text }}>TEXT TO VOICE</h2>
                </div>

                {/* Hint */}
                <p className="text-xs mb-3" style={{ color: colors.textLight }}>
                    Line 1: output filename (no extension) &nbsp;|&nbsp; Line 2+: Japanese text to convert
                </p>

                {/* Textarea */}
                <div className="relative mb-4 md:mb-8 flex-grow">
                    <textarea
                        value={inputText}
                        onChange={(e) => { setInputText(e.target.value); setStatus(null); }}
                        className="w-full h-60 md:h-80 lg:h-[500px] min-h-[250px] p-4 md:p-6 rounded-xl md:rounded-2xl bg-stone-50 border transition-all custom-scrollbar custom-textarea resize-none text-base md:text-lg"
                        style={{ borderColor: colors.border, color: colors.text, backgroundColor: '#fdfdfc' }}
                        placeholder={"filename-without-extension\nこんにちは、一緒に勉強しましょう..."}
                    />
                </div>

                {/* Status message */}
                {status === 'success' && (
                    <p className="text-center text-sm font-bold mb-4" style={{ color: '#6a9e72' }}>
                        DONE - MP3 DOWNLOADED
                    </p>
                )}
                {status === 'error' && (
                    <p className="text-center text-sm font-bold mb-4" style={{ color: '#b05a5a' }}>
                        SOMETHING IS WRONG
                    </p>
                )}

                {/* Convert button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleConvert}
                        disabled={status === 'loading'}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Send size={16} />
                        {status === 'loading' ? 'CONVERTING...' : 'CONVERT'}
                    </button>
                </div>
            </div>
        </div>
    );
}
