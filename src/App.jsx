import React, { useState, useEffect, useRef } from 'react';
import { Volume2, FileText, Languages, ChevronDown, LogIn, UserCircle, Check, LogOut } from 'lucide-react';
// 假设你的页面组件路径如下，请根据实际情况微调
import Mp3ToText from './pages/Mp3ToText';
import TextToVoice from './pages/TextToVoice';
import VerbeConjugation from './pages/VerbeConjugation';

const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryLight: '#e8ddd4',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState('Guest');
    const [isRoleOpen, setIsRoleOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState('MP3/TEXT');
    const dropdownRef = useRef(null);

    // 点击外部关闭下拉框
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsRoleOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogin = () => {
        localStorage.setItem('user_role', role.toLowerCase());
        setIsAuthenticated(true);
    };

    // --- 1. 登录前的欢迎页面 ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: colors.background }}>
                <div className="w-full max-w-md p-10 bg-white rounded-3xl shadow-xl border text-center animate-in fade-in zoom-in duration-500"
                     style={{ backgroundColor: colors.white, borderColor: colors.border }}>

                    <div className="mb-8 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: colors.primaryLight }}>
                            <UserCircle size={40} style={{ color: colors.primary }} />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>欢迎登录练习系统</h1>
                        <p className="text-sm mt-2" style={{ color: colors.textLight }}>请选择身份并进入</p>
                    </div>

                    <div className="flex items-center gap-3 relative">
                        <div className="relative flex-grow" ref={dropdownRef}>
                            <button
                                onClick={() => setIsRoleOpen(!isRoleOpen)}
                                className="w-full flex items-center justify-between bg-white px-5 py-3 rounded-2xl border shadow-sm transition-all text-sm font-bold"
                                style={{ borderColor: colors.border, color: colors.text }}
                            >
                                <span>{role === 'Admin' ? '管理员 (Admin)' : '普通用户 (Guest)'}</span>
                                <ChevronDown size={18} className={`transition-transform duration-300 ${isRoleOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isRoleOpen && (
                                <div className="absolute bottom-full mb-2 left-0 w-full bg-white border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
                                     style={{ borderColor: colors.border }}>
                                    {['Guest', 'Admin'].map((option) => (
                                        <div
                                            key={option}
                                            onClick={() => {
                                                setRole(option);
                                                setIsRoleOpen(false);
                                            }}
                                            className="px-5 py-3 text-sm font-bold cursor-pointer hover:bg-stone-50 flex items-center justify-between"
                                            style={{ color: colors.text }}
                                        >
                                            {option === 'Admin' ? '管理员 (Admin)' : '普通用户 (Guest)'}
                                            {role === option && <Check size={14} style={{ color: colors.primary }} />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleLogin}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white shadow-md hover:scale-105 active:scale-95 transition-all duration-300"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <LogIn size={20} />
                            <span>进入</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- 2. 登录后的主页面逻辑 ---
    return (
        <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background }}>
            {/* 原来的导航菜单 */}
            <nav className="shadow-sm sticky top-0 z-10" style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}` }}>
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6">
                    {/* 左侧角色展示 */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
                        <UserCircle size={14} style={{ color: colors.primary }} />
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.text }}>
                            {role}
                        </span>
                    </div>

                    {/* 中间核心菜单 */}
                    <div className="flex justify-center gap-2 p-3">
                        {[
                            { id: 'MP3/TEXT', icon: Volume2 },
                            { id: 'TEXT/VOICE', icon: FileText },
                            { id: 'VERBE CONJUGATION', icon: Languages }
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = activeMenu === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveMenu(item.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 ${
                                        isActive ? 'shadow-md scale-105' : 'hover:bg-stone-50'
                                    }`}
                                    style={{
                                        backgroundColor: isActive ? colors.primary : 'transparent',
                                        color: isActive ? '#ffffff' : colors.textLight
                                    }}
                                >
                                    <Icon size={16} />
                                    <span className="text-sm">{item.id}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* 右侧退出按钮 */}
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all duration-300 group"
                    >
                        <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        <span className="text-xs font-bold">EXIT</span>
                    </button>
                </div>
            </nav>

            {/* 主内容区域 */}
            <div className="p-4 md:p-10">
                <div className="max-w-5xl mx-auto">
                    {activeMenu === 'MP3/TEXT' && <Mp3ToText />}
                    {activeMenu === 'TEXT/VOICE' && <TextToVoice />}
                    {activeMenu === 'VERBE CONJUGATION' && <VerbeConjugation />}
                </div>
            </div>
        </div>
    );
}

export default App;