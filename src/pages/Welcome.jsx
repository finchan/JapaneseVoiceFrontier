import React from 'react';
import { Database, Upload, Settings, FileText, BookOpen, FileType, List } from 'lucide-react';

const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryLight: '#e8ddd4',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    accent: '#c4a484',
    highlight: '#e8ddd4',
};

const menuStructure = [
    {
        id: 'VOICE/TEXT',
        submenus: [
            { id: 'VOICE POOL', icon: Database },
            { id: 'VOICE UPLOAD', icon: Upload },
            { id: 'VOICE MANAGEMENT', icon: Settings },
        ]
    },
    {
        id: 'TEXT/VOICE',
        submenus: [
            { id: 'TEXT SUBMIT', icon: FileText },
        ]
    },
    {
        id: 'CONJUGATION',
        submenus: [
            { id: 'VERB', icon: BookOpen },
            { id: 'ADJECTIVE I', icon: FileType },
            { id: 'ADJECTIVE NA', icon: List },
        ]
    },
];

export default function Welcome() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <style>{`
                .welcome-title {
                    font-family: system-ui, -apple-system, sans-serif;
                }
                .welcome-bullet::before {
                    content: "•";
                    color: ${colors.primary};
                    font-weight: bold;
                    margin-right: 12px;
                }
                .welcome-submenu {
                    color: ${colors.textLight};
                }
                .welcome-main-menu {
                    color: ${colors.text};
                    font-weight: 600;
                }
            `}</style>

            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <h1 className="welcome-title text-3xl font-bold text-center mb-12 mt-6 tracking-wide" style={{ color: colors.text }}>
                    Japanese Learning Tools
                </h1>

                <div className="space-y-8 bg-white rounded-3xl p-8 shadow-sm border" style={{ backgroundColor: colors.white }}>
                    {menuStructure.map((menu) => (
                        <div key={menu.id}>
                            <div className="welcome-main-menu text-lg font-bold mb-3 flex items-center">
                                <span className="px-3 py-1 rounded-lg mr-3" style={{ color: colors.text }}>
                                    {menu.id}
                                </span>
                            </div>
                            <ul className="space-y-2 ml-4">
                                {menu.submenus.map((submenu) => {
                                    const Icon = submenu.icon;
                                    return (
                                        <li key={submenu.id} className="welcome-bullet flex items-center text-sm">
                                            <Icon size={14} className="mr-3" style={{ color: colors.textLight }} />
                                            <span className="welcome-submenu">{submenu.id}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                <p className="text-center mt-10 text-sm tracking-widest" style={{ color: colors.textLight }}>
                    More Features comming soon...
                </p>
            </div>
        </div>
    );
}
