import React, { useState } from 'react';
import { Volume2, FileText, Languages } from 'lucide-react';
import Mp3ToText from './pages/Mp3ToText';
import TextToVoice from './pages/TextToVoice';
import VerbeConjugation from './pages/VerbeConjugation';

// Morandi color scheme
const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryHover: '#8a7a6b',
    accent: '#c4a484',
    secondary: '#b8a99a',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    activeBg: '#e8ddd4',
    highlight: '#d4c4b8c',
};

function App() {
    const [activeMenu, setActiveMenu] = useState('MP3/TEXT');

    return (
        <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background }}>
            {/* Top Navigation Menu */}
            <nav className="shadow-sm sticky top-0 z-10" style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}` }}>
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-center gap-2 p-3">
                        {[
                            { id: 'MP3/TEXT', icon: Volume2 },
                            { id: 'TEXT/VOICE', icon: FileText },
                            { id: 'VERBE CONJUGATION', icon: Languages }
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveMenu(item.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                                        activeMenu === item.id ? 'shadow-md' : ''
                                    }`}
                                    style={{
                                        backgroundColor: activeMenu === item.id ? colors.primary : 'transparent',
                                        color: activeMenu === item.id ? '#ffffff' : colors.textLight
                                    }}
                                >
                                    <Icon size={16} />
                                    <span className="text-sm">{item.id}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Main Content - 修改点：使用 display: none 控制显隐，不销毁组件 */}
            <div className="p-4 md:p-10">
                <div className="max-w-4xl mx-auto">
                    {/* MP3/TEXT 页面 */}
                    <div style={{ display: activeMenu === 'MP3/TEXT' ? 'block' : 'none' }}>
                        <Mp3ToText />
                    </div>

                    {/* TEXT/VOICE 页面 */}
                    <div style={{ display: activeMenu === 'TEXT/VOICE' ? 'block' : 'none' }}>
                        <TextToVoice />
                    </div>

                    {/* VERBE CONJUGATION 页面 */}
                    <div style={{ display: activeMenu === 'VERBE CONJUGATION' ? 'block' : 'none' }}>
                        <VerbeConjugation />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;