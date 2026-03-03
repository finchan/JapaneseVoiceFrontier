import { FileText } from 'lucide-react';

// Morandi color scheme
const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    accent: '#c4a484',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
};

export default function TextToVoice() {
    return (
        <div className="min-h-[calc(100vh-120px)] flex items-center justify-center japanese-text">
            <div className="text-center">
                <FileText size={80} className="mx-auto mb-6" style={{ color: colors.primary }} />
                <h2 className="text-2xl font-medium mb-2" style={{ color: colors.text }}>
                    Text to Voice
                </h2>
                <p style={{ color: colors.textLight }}>Coming soon...</p>
            </div>
        </div>
    );
}
