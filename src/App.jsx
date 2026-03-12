import React, { useState, useEffect, useRef } from 'react';
import { Volume2, FileText, Languages, ChevronDown, UserCircle, LogOut, Settings, Database, Upload, BookOpen, FileType, List } from 'lucide-react';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import VoiceUpload from './pages/VoiceUpload';
import TextSubmit from './pages/TextSubmit';
import VerbConjugation from './pages/VerbConjugation';
import VoiceManagement from './pages/VoiceManagement';
import VoicePool from './pages/VoicePool';
import AdjectiveI from './pages/AdjectiveI';
import AdjectiveNa from './pages/AdjectiveNa';

const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryLight: '#e8ddd4',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    highlight: '#637382',
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState('Guest');
    const [activeMenu, setActiveMenu] = useState('WELCOME');
    const [activeFirstLevel, setActiveFirstLevel] = useState('VOICE/TEXT');
    const [openSubMenu, setOpenSubMenu] = useState(null);

    const menuRef = useRef(null);

    const menuStructure = [
        {
            id: 'VOICE/TEXT',
            submenus: [
                { id: 'VOICE POOL', icon: Database, page: 'VoicePool' },
                { id: 'VOICE UPLOAD', icon: Upload, page: 'VoiceUpload' },
                { id: 'VOICE MANAGEMENT', icon: Settings, page: 'VoiceManagement' },
            ]
        },
        {
            id: 'TEXT/VOICE',
            submenus: [
                { id: 'TEXT SUBMIT', icon: FileText, page: 'TextSubmit' },
            ]
        },
        {
            id: 'CONJUGATION',
            submenus: [
                { id: 'VERB', icon: BookOpen, page: 'VerbConjugation' },
                { id: 'ADJECTIVE I', icon: FileType, page: 'AdjectiveI' },
                { id: 'ADJECTIVE NA', icon: List, page: 'AdjectiveNa' },
            ]
        },
    ];

    useEffect(() => {
        // Check if user is already logged in
        const storedRole = localStorage.getItem('user_role');
        if (storedRole) {
            setRole(storedRole.charAt(0).toUpperCase() + storedRole.slice(1));
            setIsAuthenticated(true);
        }

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenSubMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogin = (selectedRole) => {
        localStorage.setItem('user_role', selectedRole.toLowerCase());
        setRole(selectedRole);
        setIsAuthenticated(true);
        setActiveMenu('WELCOME');
    };

    const handleLogout = () => {
        localStorage.removeItem('user_role');
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background }}>
            {/* Navigation Menu */}
            <nav className="shadow-sm sticky top-0 z-[1000]" style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}` }}>
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
                    {/* Left role indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
                        <UserCircle size={14} style={{ color: colors.primary }} />
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.text }}>{role}</span>
                    </div>

                    {/* Main Menu */}
                    <div className="flex items-center gap-2 h-full" ref={menuRef}>
                        {/* First Level Menus */}
                        {menuStructure.map((menu) => (
                            <div
                                key={menu.id}
                                className="relative h-full flex items-center"
                                onMouseEnter={() => setOpenSubMenu(menu.id)}
                                onMouseLeave={() => setOpenSubMenu(null)}
                            >
                                <button
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 ${
                                        activeFirstLevel === menu.id ? 'shadow-md scale-105' : 'hover:bg-stone-50'
                                    }`}
                                    style={{
                                        backgroundColor: activeFirstLevel === menu.id ? colors.highlight : 'transparent',
                                        color: activeFirstLevel === menu.id ? '#ffffff' : colors.textLight
                                    }}
                                >
                                    <span className="text-sm">{menu.id}</span>
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${openSubMenu === menu.id ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Submenu */}
                                {openSubMenu === menu.id && menu.submenus && (
                                    <div className="absolute top-full left-0 w-52 bg-white border border-stone-200 rounded-xl shadow-2xl py-2 z-[1100] animate-in fade-in slide-in-from-top-2 duration-200">
                                        {menu.submenus.map((submenu, index) => {
                                            const Icon = submenu.icon;
                                            const isActive = activeMenu === submenu.id;
                                            return (
                                                <button
                                                    key={submenu.id}
                                                    onClick={() => { 
                                                        setActiveMenu(submenu.id); 
                                                        setActiveFirstLevel(menu.id);
                                                        setOpenSubMenu(null);
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                                                        isActive 
                                                            ? 'bg-stone-100 text-stone-800' 
                                                            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                                                    } ${index > 0 ? 'border-t border-stone-100' : ''}`}
                                                >
                                                    <Icon size={14} />
                                                    {submenu.id}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Exit Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all duration-300 group"
                    >
                        <LogOut size={14} />
                        <span className="text-xs font-bold">EXIT</span>
                    </button>
                </div>
            </nav>

            {/* Content Area */}
            <div className="p-4 md:p-5">
                <div className="max-w-5xl mx-auto">
                    {activeMenu === 'WELCOME' && <Welcome />}
                    {activeMenu === 'VOICE POOL' && <VoicePool />}
                    {activeMenu === 'VOICE UPLOAD' && <VoiceUpload />}
                    {activeMenu === 'VOICE MANAGEMENT' && <VoiceManagement />}
                    {activeMenu === 'TEXT SUBMIT' && <TextSubmit />}
                    {activeMenu === 'VERB' && <VerbConjugation />}
                    {activeMenu === 'ADJECTIVE I' && <AdjectiveI />}
                    {activeMenu === 'ADJECTIVE NA' && <AdjectiveNa />}
                </div>
            </div>
        </div>
    );
}

export default App;