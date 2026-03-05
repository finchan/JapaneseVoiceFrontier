import React, { useState, useEffect, useRef } from 'react';
import { Volume2, FileText, Languages, ChevronDown, LogIn, UserCircle, Check, LogOut, Settings, Database } from 'lucide-react';
import Mp3ToText from './pages/Mp3ToText';
import TextToVoice from './pages/TextToVoice';
import VerbeConjugation from './pages/VerbeConjugation';
// 新增引入
import Mp3Management from './pages/Mp3Management';
import Mp3Sources from './pages/Mp3Sources';

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
    // 新增状态：控制导航栏内的二级菜单
    const [isMp3SubMenuOpen, setIsMp3SubMenuOpen] = useState(false);

    const dropdownRef = useRef(null);
    const mp3MenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsRoleOpen(false);
            // 点击外部关闭 MP3 二级菜单
            if (mp3MenuRef.current && !mp3MenuRef.current.contains(e.target)) setIsMp3SubMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogin = () => {
        localStorage.setItem('user_role', role.toLowerCase());
        setIsAuthenticated(true);
    };

    if (!isAuthenticated) {
        /* ... 保持你原有的登录页面逻辑不变 ... */
    }

    return (
        <div className="min-h-screen font-sans" style={{ backgroundColor: colors.background }}>
            {/* 导航菜单 - 移除了 overflow-hidden 确保下拉不被遮挡 */}
            <nav className="shadow-sm sticky top-0 z-[1000]" style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}` }}>
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
                    {/* 左侧角色展示 */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
                        <UserCircle size={14} style={{ color: colors.primary }} />
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.text }}>{role}</span>
                    </div>

                    {/* 中间核心菜单 */}
                    <div className="flex items-center gap-2 h-full">
                        {/* 1. 带二级菜单的 MP3/TEXT */}
                        <div
                            className="relative h-full flex items-center"
                            ref={mp3MenuRef}
                            onMouseEnter={() => setIsMp3SubMenuOpen(true)}
                            onMouseLeave={() => setIsMp3SubMenuOpen(false)}
                        >
                            <button
                                onClick={() => setActiveMenu('MP3/TEXT')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 ${
                                    activeMenu.startsWith('MP3') ? 'shadow-md scale-105' : 'hover:bg-stone-50'
                                }`}
                                style={{
                                    backgroundColor: activeMenu.startsWith('MP3') ? colors.primary : 'transparent',
                                    color: activeMenu.startsWith('MP3') ? '#ffffff' : colors.textLight
                                }}
                            >
                                <Volume2 size={16} />
                                <span className="text-sm">MP3/TEXT</span>
                                <ChevronDown size={14} className={`transition-transform duration-300 ${isMp3SubMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* 二级菜单内容 */}
                            {isMp3SubMenuOpen && (
                                <div className="absolute top-full left-0 w-48 bg-white border border-stone-200 rounded-xl shadow-2xl py-2 z-[1100] animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => { setActiveMenu('MP3 MANAGEMENT'); setIsMp3SubMenuOpen(false); }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-900 font-bold transition-colors"
                                    >
                                        <Settings size={14} /> MP3 MANAGEMENT
                                    </button>
                                    <button
                                        onClick={() => { setActiveMenu('MP3 SOURCES'); setIsMp3SubMenuOpen(false); }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-900 font-bold border-t border-stone-100 transition-colors"
                                    >
                                        <Database size={14} /> MP3 SOURCES
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 其他一级菜单 */}
                        {[
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
                        <LogOut size={14} />
                        <span className="text-xs font-bold">EXIT</span>
                    </button>
                </div>
            </nav>

            {/* 主内容区域 */}
            <div className="p-4 md:p-10">
                <div className="max-w-5xl mx-auto">
                    {activeMenu === 'MP3/TEXT' && <Mp3ToText />}
                    {activeMenu === 'MP3 MANAGEMENT' && <Mp3Management />}
                    {activeMenu === 'MP3 SOURCES' && <Mp3Sources />}
                    {activeMenu === 'TEXT/VOICE' && <TextToVoice />}
                    {activeMenu === 'VERBE CONJUGATION' && <VerbeConjugation />}
                </div>
            </div>
        </div>
    );
}

export default App;