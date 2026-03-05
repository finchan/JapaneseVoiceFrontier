import React, { useState, useEffect, useRef } from 'react';
import { UserCircle2, ChevronDown, LogIn, User, ShieldCheck } from 'lucide-react';

const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryHover: '#8a7a6b',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
};

export default function Login({ onLogin }) {
    const [role, setRole] = useState('Guest');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogin = () => {
        onLogin(role);
    };

    const roles = [
        { id: 'Admin', icon: ShieldCheck, description: 'Full system access' },
        { id: 'Guest', icon: User, description: 'Restricted view access' }
    ];

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f7f5f0]">
            <div
                className="w-full max-w-md p-8 rounded-3xl shadow-xl bg-white border border-stone-100 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 rounded-full mb-4" style={{backgroundColor: '#f0ede6'}}>
                        <UserCircle2 size={48} style={{color: colors.primary}}/>
                    </div>
                    <h1 className="text-2xl font-bold" style={{color: colors.text}}>Welcome</h1>
                    <p className="text-sm mt-2" style={{color: colors.textLight}}>Please select your role to
                        continue</p>
                </div>

                {/* Login.jsx - Simplified Action Row without Hover Effects */}
                <div className="space-y-4 mt-4">
                    {/* Flex container for Dropdown and Button in one line */}
                    <div className="flex items-center gap-3 relative">
                        <div className="relative flex-grow" ref={dropdownRef}>
                            {/* Role Selection Toggle - Removed hover:bg-stone-100/50 */}
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full h-[56px] flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-5 text-stone-700 font-bold transition-all"
                                style={{ borderColor: colors.border }}
                            >
                                <div className="flex items-center gap-3">
                                    {role === 'Admin' ?
                                        <ShieldCheck size={18} className="text-stone-500" /> :
                                        <User size={18} className="text-stone-500" />
                                    }
                                    <span className="text-sm">{role}</span>
                                </div>
                                <ChevronDown size={18} className={`text-stone-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu - Opens upwards to avoid layout shift */}
                            {isDropdownOpen && (
                                <div className="absolute bottom-full mb-2 left-0 w-full bg-white border border-stone-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    {roles.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                setRole(item.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`px-5 py-4 cursor-pointer transition-colors flex items-center gap-4 ${
                                                role === item.id ? 'bg-stone-50' : 'bg-white'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg ${role === item.id ? 'bg-[#9c8c7d] text-white' : 'bg-stone-100 text-stone-500'}`}>
                                                <item.icon size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-bold text-sm ${role === item.id ? 'text-stone-900' : 'text-stone-600'}`}>{item.id}</span>
                                                <span className="text-[10px] text-stone-400 font-medium uppercase tracking-tight">{item.description}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Login Button */}
                        <button
                            onClick={handleLogin}
                            className="h-[56px] flex items-center justify-center gap-2 px-8 rounded-xl text-white font-bold shadow-md active:scale-95 transition-all duration-300 shrink-0"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <LogIn size={20} />
                            <span>LOGIN</span>
                        </button>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-30"
                       style={{color: colors.text}}>
                        Japanese Voice Frontier
                    </p>
                </div>
            </div>
        </div>
    );
}
