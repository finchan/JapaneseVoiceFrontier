import React, {useState, useEffect} from 'react';
import {Book, FolderOpen, Tag, Save, Loader2} from 'lucide-react';

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

export default function Mp3Management() {
    const [formData, setFormData] = useState({book: '', course: '', category: ''});
    const [mp3Files, setMp3Files] = useState([]);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. 页面加载时请求后台文件列表
    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/manage/files');
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

    // 2. 提交数据到后台
    const handleSave = async () => {
        const selected = mp3Files.find(f => f.id === selectedFileId);
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
            const response = await fetch('http://localhost:8000/api/manage/submit', {
                method: 'POST',
                body: submitData
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert("Archive Successful!");
                // 1. 重置表单 (按需可选)
                setFormData({book: '', course: '', category: ''});
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

    const customScrollbar = `
        .macos-scroll::-webkit-scrollbar { width: 5px; }
        .macos-scroll::-webkit-scrollbar-track { background: transparent; }
        .macos-scroll::-webkit-scrollbar-thumb { background: ${colors.morandiBlack}; border-radius: 10px; }
    `;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <style>{customScrollbar}</style>

            <h1 className="text-2xl text-center tracking-[0.2em] uppercase mb-8 font-black"
                style={{color: colors.text}}>
                MP3 FILES MANAGEMENT
            </h1>

            {/* 上部：表单区域 */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{borderColor: colors.border}}>
                <div className="grid grid-cols-1">
                    {[
                        {label: 'BOOK', key: 'book', icon: Book},
                        {label: 'COURSE', key: 'course', icon: FolderOpen}
                    ].map((field, idx) => (
                        <div key={field.key}
                             className={`flex items-center border-b last:border-0 ${idx === 0 ? 'bg-green-50/20' : ''}`}
                             style={{borderColor: colors.border}}>
                            <div
                                className="w-36 px-6 py-4 flex items-center gap-2 border-r text-[14px] font-black shrink-0"
                                style={{color: colors.text, borderColor: colors.border}}>
                                <field.icon size={14}/>
                                <span>{field.label}</span>
                            </div>
                            <input
                                type="text"
                                value={formData[field.key]}
                                onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                                className="flex-grow px-6 py-4 bg-transparent outline-none text-[14px] font-medium"
                                style={{color: colors.code}}
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                            />
                        </div>
                    ))}

                </div>
            </div>

            {/* 中部：表格区域 (显示 8 条) */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{borderColor: colors.border}}>
                <div
                    className="px-6 py-4 border-b text-[14px] tracking-widest bg-stone-50/50 font-black flex justify-between items-center"
                    style={{color: colors.text, borderColor: colors.border}}>
                    <span>CHOOSE MP3 FILE (FROM SERVER)</span>
                    {loading && <Loader2 size={14} className="animate-spin"/>}
                </div>

                <div className="overflow-y-auto max-h-[384px] macos-scroll">
                    <table className="w-full border-collapse">
                        <tbody className="divide-y" style={{borderColor: colors.border}}>
                        {mp3Files.length > 0 ? mp3Files.map((file) => (
                            <tr
                                key={file.id}
                                onClick={() => setSelectedFileId(file.id)}
                                className={`group cursor-pointer transition-colors ${selectedFileId === file.id ? 'bg-stone-100/50' : 'hover:bg-stone-50/30'}`}
                            >
                                <td className="w-16 px-6 py-3 border-r text-center"
                                    style={{borderColor: colors.border}}>
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                                            selectedFileId === file.id ? 'border-stone-800 bg-stone-800' : 'border-stone-300'
                                        }`}>
                                        {selectedFileId === file.id && <div className="w-2 h-2 rounded-full bg-white"/>}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-[14px]" style={{color: colors.code}}>
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

            {/* 下部：SUBMIT 按钮 */}
            <div className="flex justify-center pt-6">
                <button
                    onClick={handleSave}
                    disabled={loading || mp3Files.length === 0}
                    className="group flex items-center justify-center gap-3 px-14 py-4 rounded-full font-black text-sm tracking-[0.3em] shadow-lg transition-all hover:brightness-110 active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{backgroundColor: colors.primary}}
                >
                    <Save size={18}/>
                    <span>SUBMIT</span>
                </button>
            </div>
        </div>
    );
}