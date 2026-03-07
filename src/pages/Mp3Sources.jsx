import React, {useState, useEffect, useRef} from "react";
import WaveSurfer from "wavesurfer.js";
import {Book, Layers, FileAudio, Play, Pause, Loader2, RotateCcw, Gauge} from "lucide-react";

const colors = {
    primary: "#9c8c7d",
    text: "#6b5b5b",
    border: "#e6e0d8",
    bgBook: "#ece5e0",
    bgCourse: "#e8ddd4",
    bgFile: "#e0e5ec",
    active: "#7d8d9c",
    morandiBlack: "#3d3d3d",
    activeLine: '#7d8d9c',
};

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5];

export default function Mp3Sources() {
    const [books, setBooks] = useState([]);
    const [courses, setCourses] = useState([]);
    const [files, setFiles] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    const wavesurferRef = useRef(null);
    const waveContainerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const activeLineRef = useRef(null);

    // 快捷键逻辑
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!wavesurferRef.current) return;
            if (e.code === 'Space') {
                e.preventDefault();
                wavesurferRef.current.playPause();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                const prev = [...segments].reverse().find(s => s.end < currentTime - 0.5);
                wavesurferRef.current.setTime(prev ? prev.start : 0);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                const next = segments.find(s => s.start > currentTime);
                if (next) wavesurferRef.current.setTime(next.start);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, segments, playbackSpeed]);

    // 字幕自动滚动居中
    useEffect(() => {
        if (activeLineRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const activeLine = activeLineRef.current;
            const scrollTarget = activeLine.offsetTop - (container.clientHeight / 2) + (activeLine.clientHeight / 2);
            container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
    }, [currentTime]);

    useEffect(() => {
        fetch("http://localhost:8000/api/sources/books")
            .then(res => res.json())
            .then(data => setBooks(data.books || []));
    }, []);

    const handleBookClick = (book) => {
        setSelectedBook(book);
        setSelectedCourse(null);
        setSelectedFile(null);
        setCourses([]);
        setFiles([]);
        fetch(`http://localhost:8000/api/sources/courses?book=${encodeURIComponent(book)}`)
            .then(res => res.json())
            .then(data => setCourses(data.courses || []));
    };

    const handleCourseClick = (course) => {
        setSelectedCourse(course);
        setSelectedFile(null);
        setFiles([]);
        fetch(`http://localhost:8000/api/sources/files?book=${encodeURIComponent(selectedBook)}&course=${encodeURIComponent(course)}`)
            .then(res => res.json())
            .then(data => setFiles(data.files || []));
    };

    const handleFileClick = async (fileObj) => {
        setSelectedFile(fileObj.name);
        setLoading(true);
        setSegments([]);
        setIsPlaying(false);
        setCurrentTime(0);

        try {
            const params = new URLSearchParams({ book: selectedBook, course: selectedCourse, filename: fileObj.name });
            const res = await fetch(`http://localhost:8000/api/sources/load_content?${params}`);
            const data = await res.json();
            setSegments(data.segments || []);

            const audioRes = await fetch(data.mp3_url);
            const audioBlob = await audioRes.blob();
            const blobUrl = URL.createObjectURL(audioBlob);

            setTimeout(() => initWaveSurfer(blobUrl), 100);
        } catch (e) { console.error("加载失败", e); } finally { setLoading(false); }
    };

    const initWaveSurfer = (url) => {
        if (wavesurferRef.current) wavesurferRef.current.destroy();
        const ws = WaveSurfer.create({
            container: waveContainerRef.current,
            waveColor: "#c9c0b8",
            progressColor: "#9c8c7d",
            cursorColor: "#7d8d9c",
            height: 60,
            responsive: true,
            normalize: true,
        });
        wavesurferRef.current = ws;
        ws.setPlaybackRate(playbackSpeed);
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("audioprocess", (time) => setCurrentTime(time));
        ws.on("interaction", (time) => setCurrentTime(time));
        ws.load(url);
    };

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        if (wavesurferRef.current) wavesurferRef.current.setPlaybackRate(speed);
    };

    const renderWords = (seg) => {
        if (seg.words && seg.words.length > 0) {
            return seg.words.map((word, wIdx) => {
                const isWordActive = currentTime >= word.start && currentTime <= word.end;
                return (
                    <span key={wIdx} className={`transition-colors duration-200 ${isWordActive ? "bg-amber-200 text-stone-900 rounded px-0.5" : ""}`}>
                        {word.word}
                    </span>
                );
            });
        }
        return seg.text;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 p-4">
            <style>{`.custom-scroll::-webkit-scrollbar { width: 4px; } .custom-scroll::-webkit-scrollbar-thumb { background: ${colors.morandiBlack}; border-radius: 10px; }`}</style>

            {/* 三栏联动菜单 */}
            <div className="grid grid-cols-3 h-[300px] rounded-3xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: colors.border }}>
                <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgBook }}>
                    <div className="p-4 sticky top-0 bg-inherit font-black text-[10px] text-stone-500 border-b">BOOKS</div>
                    {books.map(b => (
                        <div key={b} onClick={() => handleBookClick(b)} className={`px-6 py-4 text-sm font-bold cursor-pointer ${selectedBook === b ? "bg-white/60" : "hover:bg-white/30"}`}>{b}</div>
                    ))}
                </div>

                <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgCourse }}>
                    <div className="p-4 sticky top-0 bg-inherit font-black text-[10px] text-stone-500 border-b">COURSES</div>
                    {courses.map(c => (
                        <div key={c} onClick={() => handleCourseClick(c)} className={`px-6 py-4 text-sm font-bold cursor-pointer ${selectedCourse === c ? "bg-white/60" : "hover:bg-white/30"}`}>{c}</div>
                    ))}
                </div>

                <div className="custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgFile }}>
                    <div className="p-4 sticky top-0 bg-inherit font-black text-[10px] text-stone-500 border-b">FILES</div>
                    {files.map(f => (
                        <div key={f.id} onClick={() => handleFileClick(f)} className={`px-6 py-4 cursor-pointer border-b border-white/10 ${selectedFile === f.name ? "bg-white/60 text-[#7d8d9c]" : "hover:bg-white/30 text-stone-600"}`}>
                            <div className="text-[13px] font-bold truncate">{f.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 下方控制栏与字幕区域 */}
            {selectedFile && (
                <div className="bg-white rounded-[40px] p-8 shadow-xl border border-stone-100">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-stone-100">
                        <div className="flex-1 min-w-0 text-left">
                            <h2 className="text-2xl font-black text-stone-800 tracking-tight truncate">{selectedFile}</h2>
                            <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">{selectedBook} / {selectedCourse}</p>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <button onClick={() => wavesurferRef.current?.playPause()}
                                    className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                                    style={{backgroundColor: colors.primary}}>
                                {isPlaying ? <Pause size={24}/> : <Play size={24} className="ml-1"/>}
                            </button>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <div className="flex items-center gap-3 bg-stone-50 p-2 rounded-2xl border border-stone-100">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm">
                                    <Gauge size={16} className="text-stone-400"/>
                                    <select value={playbackSpeed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} className="bg-transparent text-sm font-bold text-stone-600 outline-none cursor-pointer">
                                        {SPEEDS.map(s => <option key={s} value={s}>{s.toFixed(2)}X</option>)}
                                    </select>
                                </div>
                                <button onClick={() => handleSpeedChange(1.0)} className="p-2 hover:bg-stone-200 rounded-xl transition-colors text-stone-500"><RotateCcw size={18}/></button>
                            </div>
                        </div>
                    </div>
                    <div ref={waveContainerRef} className="mb-8 rounded-2xl overflow-hidden bg-stone-50 p-4"/>
                    <div ref={scrollContainerRef} className="space-y-4 h-[400px] overflow-y-auto relative scroll-smooth pr-2 custom-scrollbar">
                        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300"/></div> :
                            segments.map((seg, idx) => {
                                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                                return (
                                    <div key={idx} ref={isActive ? activeLineRef : null} onClick={() => wavesurferRef.current?.setTime(seg.start)}
                                         className={`p-5 rounded-2xl cursor-pointer transition-all duration-500 ${isActive ? "bg-stone-100 ring-2 ring-stone-200 shadow-sm" : "hover:bg-stone-50 opacity-60"}`}>
                                        <div className={`text-lg font-medium japanese-text leading-relaxed transition-colors ${isActive ? "text-stone-900 scale-[1.01]" : "text-stone-400"}`}>{renderWords(seg)}</div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}
        </div>
    );
}