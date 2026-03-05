import React, { useState } from 'react';
import { Book, FolderOpen, Tag, CheckCircle2, Save } from 'lucide-react';

// 复用项目的莫兰迪配色方案
const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryLight: '#e8ddd4',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    accent: '#c4a484'
};

export default function Mp3Management() {
    const [formData, setFormData] = useState({
        book: '',
        course: '',
        category: ''
    });

    const [selectedFileId, setSelectedFileId] = useState(1);

    // 模拟从后端获取的 MP3 文件列表
    const mp3Files = [
        { id: 1, mp3: "9-1-dialog.mp3", json: "9-1-dialog.json" },
        { id: 2, mp3: "9-2-dialog.mp3", json: "9-2-dialog.json" },
        { id: 3, mp3: "9-3-dialog.mp3", json: "9-3-dialog.json" },
        { id: 4, mp3: "", json: "" }, // 空行模拟
        { id: 5, mp3: "", json: "" },
        { id: 6, mp3: "", json: "" },
        { id: 7, mp3: "", json: "" },
    ];

    const handleSave = () => {
        console.log("Saving data:", { ...formData, selectedFileId });
        alert("Settings Saved Successfully!");
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 页面标题 */}
            <h1 className="text-xl font-black text-center tracking-widest uppercase mb-8" style={{ color: colors.text }}>
                MP3 FILES MANAGEMENT
            </h1>

            {/* 上部：基本信息表单 (BOOK/COURSE/CATEGORY) */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.border }}>
                <div className="grid grid-cols-1">
                    {[
                        { label: 'BOOK:', key: 'book', icon: Book },
                        { label: 'COURSE:', key: 'course', icon: FolderOpen },
                        { label: 'CATEGORY:', key: 'category', icon: Tag },
                    ].map((field, idx) => (
                        <div key={field.key} className={`flex items-center border-b last:border-0 ${idx === 0 ? 'bg-green-50/30' : ''}`} style={{ borderColor: colors.border }}>
                            <div className="w-32 px-6 py-4 flex items-center gap-2 border-r font-black text-xs tracking-tighter" style={{ color: colors.text, borderColor: colors.border }}>
                                <field.icon size={14} /> {field.label}
                            </div>
                            <input
                                type="text"
                                value={formData[field.key]}
                                onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                                className="flex-grow px-6 py-4 bg-transparent outline-none text-sm font-medium"
                                style={{ color: colors.text }}
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* 中部：文件选择表格 */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.border }}>
                <div className="px-6 py-4 border-b font-black text-xs tracking-widest bg-stone-50/50" style={{ color: colors.textLight, borderColor: colors.border }}>
                    PLEASE CHOOSE MP3 FILE:
                </div>
                <div className="overflow-y-auto max-h-[400px]">
                    <table className="w-full border-collapse">
                        <tbody>
                        {mp3Files.map((file) => (
                            <tr
                                key={file.id}
                                onClick={() => file.mp3 && setSelectedFileId(file.id)}
                                className={`group cursor-pointer transition-colors ${selectedFileId === file.id ? 'bg-stone-100/50' : 'hover:bg-stone-50/30'}`}
                            >
                                <td className="w-16 px-6 py-3 border-b border-r text-center" style={{ borderColor: colors.border }}>
                                    {file.mp3 && (
                                        <div className={`w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                                            selectedFileId === file.id ? 'border-stone-800 bg-stone-800' : 'border-stone-300'
                                        }`}>
                                            {selectedFileId === file.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-3 border-b text-sm font-bold tracking-tight italic" style={{ color: colors.text, borderColor: colors.border }}>
                                    {file.mp3 ? `${file.mp3} | ${file.json}` : <span className="opacity-0">-</span>}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 下部：操作按钮 */}
            <div className="flex justify-center pt-4">
                <button
                    onClick={handleSave}
                    className="group relative flex items-center gap-3 px-12 py-4 rounded-xl font-black text-sm tracking-[0.2em] shadow-lg transition-all hover:scale-105 active:scale-95 overflow-hidden"
                    style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Save size={18} className="relative z-10" />
                    <span className="relative z-10">SUBMIT DATA</span>
                </button>
            </div>
        </div>
    );
}