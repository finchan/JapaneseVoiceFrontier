import React, { useState, useEffect } from 'react';
import { Book, FolderOpen, Tag, Save, Loader2, Edit2, Check, X } from 'lucide-react';
import API_CONFIG from '../config';

const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryLight: '#e8ddd4',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    code: '#4a4a4a',
    morandiBlack: '#3d3d3d'
};

export default function VoiceManagement() {
    const [activeTab, setActiveTab] = useState('archive');
    const [formData, setFormData] = useState({ book: '', course: '', category: '' });
    const [mp3Files, setMp3Files] = useState([]);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [cleaningFiles, setCleaningFiles] = useState([]);
    const [selectedCleaningIds, setSelectedCleaningIds] = useState([]);

    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    // 1. 页面加载时请求后台文件列表
    useEffect(() => {
        if (activeTab === 'archive') {
            fetchFiles();
        } else if (activeTab === 'cleaning') {
            fetchCleaningFiles();
        } else if (activeTab === 'updating') {
            fetchCleaningFiles(); // Uses same logic for file list
        }
    }, [activeTab]);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.manageFiles));
            const data = await response.json();
            setMp3Files(data.files);
            // 默认选中第一个
            if (data.files.length > 0) {
                setSelectedFileId(data.files[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch files:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCleaningFiles = async () => {
        try {
            setLoading(true);
            const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.allFilesList));
            const data = await response.json();
            setCleaningFiles(data.files);
            setSelectedCleaningIds([]);
        } catch (error) {
            console.error("Failed to fetch cleaning files:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectFile = (id) => {
        setSelectedCleaningIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedCleaningIds.length} files?`)) return;

        const filesString = cleaningFiles
            .filter(f => selectedCleaningIds.includes(f.id))
            .map(f => `${f.mp3 || 'None'}|${f.json || 'None'}`)
            .join(',');

        const submitData = new FormData();
        submitData.append('selected_files', filesString);

        try {
            setLoading(true);
            const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.bulkDelete), {
                method: 'POST',
                body: submitData
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
                fetchCleaningFiles();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Delete failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEdit = (file) => {
        if (editingId === file.id) {
            // Cancel edit
            setEditingId(null);
        } else {
            setEditingId(file.id);
            // Get stem from mp3 if exists, else json
            const fileName = file.mp3 || file.json || '';
            const stem = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            setEditValue(stem);
        }
    };

    const handleSaveRename = async (file) => {
        const fileName = file.mp3 || file.json || '';
        const oldStem = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

        if (editValue.trim() === oldStem) {
            setEditingId(null);
            return;
        }

        const submitData = new FormData();
        submitData.append('old_mp3', file.mp3 || '');
        submitData.append('old_json', file.json || '');
        submitData.append('new_base', editValue.trim());

        try {
            setLoading(true);
            const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.manageRename), {
                method: 'POST',
                body: submitData
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
                setEditingId(null);
                fetchCleaningFiles();
            } else {
                // If it's an error from backend (like conflict), result might have 'error' or 'detail'
                alert("Error: " + (result.detail || result.message || "Failed to rename"));
            }
        } catch (error) {
            console.error("Rename failed:", error);
            alert("Rename failed.");
        } finally {
            setLoading(false);
        }
    };

    // 2. 提交数据到后台
    const handleSave = async (selected) => {
        if (!selected) {
            alert("Please select a file first.");
            return;
        }

        // 检查表单必填项
        if (!formData.book || !formData.course) {
            alert("Please fill in Book and Course information.");
            return;
        }

        const submitData = new FormData();
        submitData.append('book', formData.book);
        submitData.append('course', formData.course);
        submitData.append('category', formData.category);
        submitData.append('selected_file', `${selected.mp3} | ${selected.json}`);

        try {
            setLoading(true); // 开始加载动画
            const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.manageSubmit), {
                method: 'POST',
                body: submitData
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert("Archive Successful!");
                // Keep formData (Book/Course) for next files as requested
                // 2. 重新从后台获取文件列表（文件被移走后，这里会自动刷新不再显示该行）
                await fetchFiles();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Submission failed:", error);
            alert("Submission failed. Connection error.");
        } finally {
            setLoading(false);
        }
    };

    const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const tabsContainer = document.getElementById('tabs-container');
        const activeButton = tabsContainer?.querySelector(`[data-tab="${activeTab}"]`);
        if (activeButton) {
            setTabIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth
            });
        }
    }, [activeTab]);

    const customScrollbar = `
        .macos-scroll::-webkit-scrollbar { width: 5px; }
        .macos-scroll::-webkit-scrollbar-track { background: transparent; }
        .macos-scroll::-webkit-scrollbar-thumb { background: ${colors.morandiBlack}; border-radius: 10px; }
    `;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <style>{customScrollbar}</style>

            <h1 className="text-2xl text-center tracking-[0.2em] uppercase mb-6 font-black"
                style={{ color: colors.text }}>
                VOICE MANAGEMENT
            </h1>

            {/* Tab 导航 */}
            <div id="tabs-container" className="relative mb-6 border-b" style={{ borderColor: colors.border }}>
                <div className="flex">
                    {[
                        { key: 'archive', label: 'ARCHIVING' },
                        { key: 'cleaning', label: 'CLEANING' },
                        { key: 'updating', label: 'UPDATING' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            data-tab={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className="flex-1 py-3 px-4 text-[15px] font-black tracking-wider transition-colors"
                            style={{
                                color: activeTab === tab.key ? colors.primary : colors.textLight
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div
                    className="absolute bottom-0 h-[3px] rounded-full transition-all duration-300 ease-out"
                    style={{
                        left: tabIndicatorStyle.left,
                        width: tabIndicatorStyle.width,
                        backgroundColor: colors.primary
                    }}
                />
            </div>

            {/* Tab 内容 */}
            {activeTab === 'archive' && (
                <>
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.border }}>
                        <div className="grid grid-cols-1">
                            {[
                                { label: 'BOOK', key: 'book', icon: Book },
                                { label: 'COURSE', key: 'course', icon: FolderOpen }
                            ].map((field, idx) => (
                                <div key={field.key}
                                    className={`flex items-center border-b last:border-0 ${idx === 0 ? 'bg-green-50/20' : ''}`}
                                    style={{ borderColor: colors.border }}>
                                    <div
                                        className="w-36 px-6 py-4 flex items-center gap-2 border-r text-[14px] font-black shrink-0"
                                        style={{ color: colors.text, borderColor: colors.border }}>
                                        <field.icon size={14} />
                                        <span>{field.label}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData[field.key]}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                        className="flex-grow px-6 py-4 bg-transparent outline-none text-[14px] font-medium"
                                        style={{ color: colors.code }}
                                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                                    />
                                </div>
                            ))}

                        </div>
                    </div>

                    {/* 中部：表格区域 (显示 8 条) */}
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.border }}>
                        <div
                            className="px-6 py-4 border-b text-[14px] tracking-widest bg-stone-50/50 font-black flex justify-between items-center"
                            style={{ color: colors.text, borderColor: colors.border }}>
                            <span>SAVE A FILE</span>
                            {loading && <Loader2 size={14} className="animate-spin" />}
                        </div>

                        <div className="overflow-y-auto max-h-[384px] macos-scroll">
                            <table className="w-full border-collapse">
                                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                    {mp3Files.length > 0 ? mp3Files.map((file) => (
                                        <tr
                                            key={file.id}
                                            onClick={() => setSelectedFileId(file.id)}
                                            className={`group cursor-pointer transition-colors ${selectedFileId === file.id ? 'bg-stone-100/50' : 'hover:bg-stone-50/30'}`}
                                        >
                                            <td className="w-16 px-6 py-3 border-r text-center"
                                                style={{ borderColor: colors.border }}>
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSave(file);
                                                        }}
                                                        className="p-1.5 rounded-full text-white transition-all hover:scale-110 active:scale-95 shadow-sm"
                                                        style={{ backgroundColor: colors.primary }}
                                                        title="Archive This File"
                                                    >
                                                        <Save size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-[14px]" style={{ color: colors.code }}>
                                                <span className="font-medium tracking-tight">{file.mp3} | {file.json}</span>
                                            </td>
                                        </tr>
                                    )) : !loading && (
                                        <tr>
                                            <td colSpan="2"
                                                className="p-10 text-center text-xs text-stone-400 font-bold uppercase tracking-widest">No
                                                permanent files found on server.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom space */}
                    <div className="pt-6" />
                </>)}

            {activeTab === 'cleaning' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Upper Panel: Controls */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6 flex justify-between items-center" style={{ borderColor: colors.border }}>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    if (selectedCleaningIds.length === cleaningFiles.length) {
                                        setSelectedCleaningIds([]);
                                    } else {
                                        setSelectedCleaningIds(cleaningFiles.map(f => f.id));
                                    }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all hover:bg-stone-50"
                                style={{ color: colors.text, borderColor: colors.border }}
                            >
                                {selectedCleaningIds.length === cleaningFiles.length ? 'Select None' : 'Select All'}
                            </button>
                            <span className="text-xs font-bold text-stone-400">
                                {selectedCleaningIds.length} Selected
                            </span>
                        </div>

                        <button
                            onClick={handleBulkDelete}
                            disabled={selectedCleaningIds.length === 0 || loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-black text-xs uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#b05a5a' }}
                        >
                            DELETE
                        </button>
                    </div>

                    {/* Lower Panel: Table */}
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.border }}>
                        <div
                            className="px-6 py-4 border-b text-[14px] tracking-widest bg-stone-50/50 font-black flex justify-between items-center"
                            style={{ color: colors.text, borderColor: colors.border }}>
                            <span>CLEAN FILES</span>
                            {loading && <Loader2 size={14} className="animate-spin" />}
                        </div>

                        <div className="overflow-y-auto max-h-[384px] macos-scroll">
                            <table className="w-full border-collapse">
                                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                    {cleaningFiles.length > 0 ? cleaningFiles.map((file) => (
                                        <tr
                                            key={file.id}
                                            onClick={() => toggleSelectFile(file.id)}
                                            className={`group cursor-pointer transition-colors ${selectedCleaningIds.includes(file.id) ? 'bg-red-50/30' : 'hover:bg-stone-50/30'}`}
                                        >
                                            <td className="w-16 px-6 py-3 border-r text-center"
                                                style={{ borderColor: colors.border }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCleaningIds.includes(file.id)}
                                                    onChange={() => { }} // Controlled via tr onClick
                                                    className="w-4 h-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-[14px]" style={{ color: colors.code }}>
                                                <span className="font-medium tracking-tight">{file.mp3 || 'None'} | {file.json || 'None'}</span>
                                            </td>
                                        </tr>
                                    )) : !loading && (
                                        <tr>
                                            <td colSpan="2"
                                                className="p-10 text-center text-xs text-stone-400 font-bold uppercase tracking-widest">
                                                No files found on server.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'updating' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.border }}>
                        <div
                            className="px-6 py-4 border-b text-[14px] tracking-widest bg-stone-50/50 font-black flex justify-between items-center"
                            style={{ color: colors.text, borderColor: colors.border }}>
                            <span>UPDATE FILE NAMES</span>
                            {loading && <Loader2 size={14} className="animate-spin" />}
                        </div>

                        <div className="overflow-y-auto max-h-[448px] macos-scroll">
                            <table className="w-full border-collapse">
                                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                    {cleaningFiles.length > 0 ? cleaningFiles.map((file) => (
                                        <tr
                                            key={file.id}
                                            className={`transition-colors ${editingId === file.id ? 'bg-blue-50/20' : 'hover:bg-stone-50/10'}`}
                                        >
                                            <td className="w-16 px-2 py-3 border-r text-center"
                                                style={{ borderColor: colors.border }}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => editingId === file.id ? handleSaveRename(file) : handleToggleEdit(file)}
                                                        className="p-2 rounded-full text-white transition-all hover:scale-110 active:scale-95 shadow-sm"
                                                        style={{ backgroundColor: editingId === file.id ? '#5a8ab0' : colors.primary }}
                                                        title={editingId === file.id ? 'Save Changes' : 'Edit Filenames'}
                                                    >
                                                        {editingId === file.id ? <Check size={14} /> : <Edit2 size={14} />}
                                                    </button>
                                                    {editingId === file.id && (
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-2 rounded-full text-white transition-all hover:scale-110 active:scale-95 shadow-sm"
                                                            style={{ backgroundColor: '#b05a5a' }}
                                                            title="Cancel"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-[14px]" style={{ color: colors.code }}>
                                                {editingId === file.id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black w-8 text-stone-400">NAME:</span>
                                                            <input
                                                                type="text"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="flex-1 bg-white border rounded px-2 py-1 outline-none text-xs"
                                                                style={{ borderColor: colors.primary }}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="font-medium tracking-tight">
                                                        {file.mp3 || <span className="text-red-300 italic">None</span>} | {file.json || <span className="text-red-300 italic">None</span>}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : !loading && (
                                        <tr>
                                            <td colSpan="2"
                                                className="p-10 text-center text-xs text-stone-400 font-bold uppercase tracking-widest">
                                                No files found on server.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}