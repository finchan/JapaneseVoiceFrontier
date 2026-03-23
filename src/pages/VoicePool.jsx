import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { BookOpen, Layers, FileAudio, Play, Pause, Loader2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, SkipBack, SkipForward, Gauge, RotateCcw, Repeat } from "lucide-react";
import WordLookup, { WordLookupPanel } from '../components/WordLookup';
import API_CONFIG from '../config';


const colors = {
    primary: "#9c8c7d",
    text: "#6b5b5b",
    border: "#e6e0d8",
    bgBook: "#f2ede8",
    bgCourse: "#e9e4de",
    bgFile: "#e0dbd4",
    active: "#7d8d9c",
    morandiBlack: "#3d3d3d",
    activeLine: '#7d8d9c',
    morandiNeonGreen: '#F2EBBF',
    morandiRed: '#d6a0a0',
    cardBorder: '#4a4a4a'
};

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5];

export default function VoicePool() {
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
    const [mobileTab, setMobileTab] = useState('BOOKS');
    const [mobileMenuCollapsed, setMobileMenuCollapsed] = useState(false);
    const [repeatMode, setRepeatMode] = useState(false);
    const [isRateOpen, setIsRateOpen] = useState(false);


    const wavesurferRef = useRef(null);
    const waveContainerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const activeLineRef = useRef(null);
    const dropdownRef = useRef(null);
    const repeatModeRef = useRef(false);
    const segmentsRef = useRef([]);


    const { lookup, hideLookup, inflectionMode, toggleMode, fetchDictionaryData, handleTextSelection, getMoraList, parseAccentPattern } = WordLookup();

    // 快捷键逻辑
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!wavesurferRef.current || segments.length === 0) return;

            // 1. 输入保护：如果用户正在输入，不触发快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // 2. 定义倍速档位
            const rateLevels = [0.5, 0.75, 1.0, 1.25, 1.5];

            if (e.code === 'Space') {
                e.preventDefault();
                wavesurferRef.current.playPause();
            } else if (e.code === 'ArrowUp') {
                // 上键：切换到更慢的一档
                e.preventDefault();
                const currentIdx = rateLevels.indexOf(playbackSpeed);
                const newIdx = currentIdx > 0 ? currentIdx - 1 : 0;
                const newSpeed = rateLevels[newIdx];
                setPlaybackSpeed(newSpeed);
                wavesurferRef.current.setPlaybackRate(newSpeed);
            } else if (e.code === 'ArrowDown') {
                // 下键：切换到更快的一档
                e.preventDefault();
                const currentIdx = rateLevels.indexOf(playbackSpeed);
                const newIdx = (currentIdx < rateLevels.length - 1 && currentIdx !== -1)
                    ? currentIdx + 1
                    : rateLevels.length - 1;
                const newSpeed = rateLevels[newIdx];
                setPlaybackSpeed(newSpeed);
                wavesurferRef.current.setPlaybackRate(newSpeed);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                if (repeatModeRef.current) setRepeatMode(false);
                // 获取当前播放索引
                const currentIndex = segments.findIndex(
                    seg => currentTime >= seg.start && currentTime <= seg.end
                );

                // 左键：重听本句或跳转到上一句
                const currentLineStart = segments[currentIndex]?.start || 0;
                if (currentTime - currentLineStart > 1.5) {
                    // 如果当前句已播放超过1.5秒，重听当前句
                    wavesurferRef.current.setTime(currentLineStart);
                } else {
                    // 否则跳转到上一句
                    const prevIndex = Math.max(0, currentIndex - 1);
                    wavesurferRef.current.setTime(segments[prevIndex].start);
                }
                wavesurferRef.current.play();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                if (repeatModeRef.current) setRepeatMode(false);
                // 右键：跳转到下一句开头
                const nextIndex = segments.findIndex(seg => seg.start > currentTime);
                if (nextIndex !== -1) {
                    wavesurferRef.current.setTime(segments[nextIndex].start);
                    wavesurferRef.current.play();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, segments, playbackSpeed]);

    // 同步 Ref 以便在事件监听器中使用最新状态
    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { segmentsRef.current = segments; }, [segments]);



    useEffect(() => {
        if (wavesurferRef.current) wavesurferRef.current.setPlaybackRate(playbackSpeed);
    }, [playbackSpeed]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsRateOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.sourcesBooks))
            .then(res => res.json())
            .then(data => setBooks(data.books || []));
    }, []);

    const handleBookClick = (book) => {
        setSelectedBook(book);
        setSelectedCourse(null);
        setSelectedFile(null);
        setCourses([]);
        setFiles([]);
        setMobileTab('COURSES');
        fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.sourcesCourses) + `?book=${encodeURIComponent(book)}`)
            .then(res => res.json())
            .then(data => setCourses(data.courses || []));
    };

    const handleCourseClick = (course) => {
        setSelectedCourse(course);
        setSelectedFile(null);
        setFiles([]);
        setMobileTab('FILES');
        fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.sourcesFiles) + `?book=${encodeURIComponent(selectedBook)}&course=${encodeURIComponent(course)}`)
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
            const res = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.sourcesLoadContent) + `?${params}`);
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
        const isMobile = window.innerWidth < 768;
        const ws = WaveSurfer.create({
            container: waveContainerRef.current,
            waveColor: "#c9c0b8",
            progressColor: "#9c8c7d",
            barWidth: isMobile ? 1 : 2,
            barGap: isMobile ? 5 : 1,
            height: isMobile ? 40 : 80,
            responsive: true,
            normalize: true,
            cursorWidth: 0,
        });

        wavesurferRef.current = ws;
        ws.setPlaybackRate(playbackSpeed);
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("audioprocess", (time) => {
            setCurrentTime(time);
            // 单句循环逻辑
            if (repeatModeRef.current) {
                const currentSegment = segmentsRef.current.find(seg => time >= seg.start && time <= seg.end);
                if (currentSegment && time >= currentSegment.end - 0.1) {
                    ws.setTime(currentSegment.start);
                }
            }
        });
        ws.on("seeking", (time) => setCurrentTime(time));
        ws.on("interaction", (time) => setCurrentTime(time));

        ws.load(url);
    };


    const handleWordClick = (e, startTime) => {
        e.stopPropagation();
        if (window.getSelection().toString().trim().length > 0) return;
        if (repeatMode) setRepeatMode(false);
        wavesurferRef.current?.setTime(startTime);
        wavesurferRef.current?.play();
    };

    const renderWords = (seg) => {
        if (seg.words && seg.words.length > 0) {
            return seg.words.map((word, wIdx) => {
                const isWordActive = currentTime >= word.start && currentTime <= word.end;
                return (
                    <span
                        key={wIdx}
                        onClick={(e) => handleWordClick(e, word.start)}
                        className={`px-0 rounded transition-colors duration-200 cursor-pointer ${isWordActive ? "bg-orange-200 font-bold" : "hover:bg-stone-100"}`}
                    >
                        {word.word}
                    </span>
                );
            });
        }
        return (
            <span
                onClick={(e) => handleWordClick(e, seg.start)}
                className="cursor-pointer hover:bg-stone-100 px-0 rounded"
            >
                {seg.text}
            </span>
        );
    };




    return (
        <div className="max-w-5xl mx-auto h-[calc(100svh-80px)] md:h-[calc(100vh-105px)] flex flex-col p-2 pb-8 space-y-3 overflow-hidden">
            <style>{`
                .custom-scroll::-webkit-scrollbar { width: 4px; } 
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: ${colors.morandiBlack}; border-radius: 10px; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .dot-pattern {
                    background-color: transparent;
                    background-image: radial-gradient(#00000015 0.5px, transparent 0.5px);
                    background-size: 4px 4px;
                }
            `}</style>


            {/* Desktop: 3-column grid - hidden on mobile */}
            <div className="hidden md:grid grid-cols-3 h-[220px] rounded-2xl border overflow-hidden bg-white/80 backdrop-blur-sm shadow-lg transition-all" style={{ borderColor: colors.border }}>

                {/* BOOKS Column */}
                <div className="border-r hide-scrollbar overflow-y-auto bg-stone-50/30">
                    <div className="p-3 sticky top-0 bg-white/90 backdrop-blur-md flex items-center gap-2 font-black text-[15px] text-stone-800 border-b tracking-[0.05em] uppercase select-none">
                        <BookOpen size={14} /> BOOKS
                    </div>
                    {books.map(b => (
                        <div key={b} onClick={() => handleBookClick(b)} 
                            className={`px-5 py-3 text-[13px] transition-all cursor-pointer border-l-4 ${selectedBook === b ? "bg-[#9c8c7d]/10 text-[#9c8c7d] border-[#9c8c7d] font-bold" : "hover:bg-stone-100/50 text-stone-600 border-transparent hover:border-stone-200"}`}>
                            {b}
                        </div>
                    ))}
                    <div className="sticky bottom-0 h-8 bg-gradient-to-t from-stone-50/80 to-transparent pointer-events-none"></div>
                </div>

                {/* COURSES Column */}
                <div className="border-r hide-scrollbar overflow-y-auto bg-stone-50/10">
                    <div className="p-3 sticky top-0 bg-white/90 backdrop-blur-md flex items-center gap-2 font-black text-[15px] text-stone-800 border-b tracking-[0.05em] uppercase select-none">
                        <Layers size={14} /> COURSES
                    </div>
                    {courses.map(c => (
                        <div key={c} onClick={() => handleCourseClick(c)} 
                            className={`px-5 py-3 text-[13px] transition-all cursor-pointer border-l-4 ${selectedCourse === c ? "bg-[#9c8c7d]/10 text-[#9c8c7d] border-[#9c8c7d] font-bold" : "hover:bg-stone-100/50 text-stone-600 border-transparent hover:border-stone-200"}`}>
                            {c}
                        </div>
                    ))}
                    <div className="sticky bottom-0 h-8 bg-gradient-to-t from-stone-50/60 to-transparent pointer-events-none"></div>
                </div>

                {/* FILES Column */}
                <div className="hide-scrollbar overflow-y-auto bg-white/20">
                    <div className="p-3 sticky top-0 bg-white/90 backdrop-blur-md flex items-center gap-2 font-black text-[15px] text-stone-800 border-b tracking-[0.05em] uppercase select-none">
                        <FileAudio size={14} /> FILES
                    </div>
                    {files.map(f => (
                        <div key={f.id} onClick={() => handleFileClick(f)} 
                            className={`px-5 py-3 transition-all cursor-pointer border-l-4 ${selectedFile === f.name ? "bg-[#7d8d9c]/10 text-[#7d8d9c] border-[#7d8d9c] font-bold" : "hover:bg-stone-100/50 text-stone-600 border-transparent hover:border-stone-200"}`}>
                            <div className="text-[13px] truncate">{f.name}</div>
                        </div>
                    ))}
                    <div className="sticky bottom-0 h-8 bg-gradient-to-t from-white/60 to-transparent pointer-events-none"></div>
                </div>
            </div>

            {/* Mobile: Tabbed menu */}
            <div className="md:hidden flex flex-col rounded-xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: colors.border }}>

                {/* Compact bar - shown when file is selected and menu is collapsed */}
                {selectedFile && mobileMenuCollapsed ? (
                    <div
                        onClick={() => setMobileMenuCollapsed(false)}
                        className="bg-[#faf9f6]/95 backdrop-blur-md px-5 py-3.5 flex items-center gap-3 cursor-pointer border-b border-stone-100 shadow-sm transition-all active:bg-stone-50"
                    >
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                            <FileAudio size={16} className="text-[#7d8d9c]" />
                        </div>
                        <span className="flex-1 text-[14px] font-black truncate text-stone-700 tracking-tight">
                            {selectedFile}
                        </span>
                        <ChevronDown size={18} className="text-stone-400" />
                    </div>
                ) : (
                    <div className="flex flex-col h-[480px]">
                        {/* Vertical Tree Breadcrumb Header */}
                        <div className="flex flex-col gap-1.5 p-5 bg-stone-50 border-b">
                            {/* BOOKS level */}
                            <div
                                onClick={() => setMobileTab('BOOKS')}
                                className={`text-[14px] font-bold cursor-pointer transition-colors ${mobileTab === 'BOOKS' ? 'text-[#9c8c7d]' : 'text-stone-400'}`}
                            >
                                {mobileTab === 'BOOKS' ? 'BOOKS' : selectedBook}
                            </div>

                            {/* COURSES level */}
                            {mobileTab !== 'BOOKS' && (
                                <div
                                    onClick={() => setMobileTab('COURSES')}
                                    className={`text-[14px] font-bold flex items-center gap-1 transition-colors pl-[20px] cursor-pointer ${mobileTab === 'COURSES' ? 'text-[#9c8c7d]' : 'text-stone-400'}`}
                                >
                                    <span>{`> `}</span>
                                    <span>{mobileTab === 'COURSES' ? 'COURSES' : selectedCourse}</span>
                                </div>
                            )}

                            {/* FILES level */}
                            {mobileTab === 'FILES' && (
                                <div className="text-[14px] font-bold flex items-center gap-1 pl-[40px] text-[#9c8c7d]">
                                    <span>{`> `}</span>
                                    <span className="truncate">FILES</span>
                                </div>
                            )}
                        </div>

                        {/* List Content */}
                        <div className="flex-1 custom-scroll overflow-y-auto bg-white">
                            {mobileTab === 'BOOKS' && books.map(b => (
                                <div
                                    key={b}
                                    onClick={() => handleBookClick(b)}
                                    className={`px-6 py-4 text-[15px] font-bold flex items-center justify-between cursor-pointer border-b border-stone-50 transition-colors ${selectedBook === b ? "bg-stone-50 text-[#9c8c7d]" : "hover:bg-stone-50/50 text-stone-600"}`}
                                >
                                    <span>{b}</span>
                                    <ChevronRight size={16} className="text-stone-300" />
                                </div>
                            ))}
                            {mobileTab === 'COURSES' && courses.map(c => (
                                <div
                                    key={c}
                                    onClick={() => handleCourseClick(c)}
                                    className={`px-6 py-4 text-[15px] font-bold flex items-center justify-between cursor-pointer border-b border-stone-50 transition-colors ${selectedCourse === c ? "bg-stone-50 text-[#9c8c7d]" : "hover:bg-stone-50/50 text-stone-600"}`}
                                >
                                    <span>{c}</span>
                                    <ChevronRight size={16} className="text-stone-300" />
                                </div>
                            ))}
                            {mobileTab === 'FILES' && files.map(f => (
                                <div
                                    key={f.id}
                                    onClick={() => {
                                        handleFileClick(f);
                                        setMobileMenuCollapsed(true);
                                    }}
                                    className={`px-6 py-4 cursor-pointer border-b border-stone-50 transition-colors ${selectedFile === f.name ? "bg-stone-50 text-[#7d8d9c]" : "hover:bg-stone-50/50 text-stone-600"}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileAudio size={16} className={selectedFile === f.name ? "text-[#7d8d9c]" : "text-stone-300"} />
                                        <div className="text-[15px] font-bold truncate">{f.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                )}
            </div>


            {/* 下方控制栏与字幕区域 */}
            {selectedFile && (
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl p-4 md:p-6 shadow-xl border border-stone-100 overflow-hidden">
                    {/* Desktop: File info - hidden on mobile */}
                    <div className="hidden md:flex items-center justify-between mb-4 pb-4 border-b border-stone-100">

                        <div className="flex-1 min-w-0 text-left">
                            <h2 className="text-medium font-black text-stone-800 tracking-tight truncate">{selectedFile}</h2>
                            <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">{selectedBook} / {selectedCourse}</p>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <button onClick={() => wavesurferRef.current?.playPause()}
                                className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                                style={{ backgroundColor: colors.primary }}>
                                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                            </button>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <div className="flex items-center gap-3 bg-stone-50 p-2.5 rounded-2xl border border-stone-100">
                                <div className="relative" ref={dropdownRef}>
                                    <button onClick={() => setIsRateOpen(!isRateOpen)}
                                        className="flex items-center bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm gap-2 min-w-[100px] justify-between text-sm font-bold">
                                        <Gauge size={16} className="text-stone-400" /> {playbackSpeed.toFixed(2)}X
                                    </button>
                                    {isRateOpen && (
                                        <div className="absolute bottom-full mb-2 left-0 w-full bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                            {SPEEDS.map(r => (
                                                <div key={r} onClick={() => {
                                                    setPlaybackSpeed(r);
                                                    setIsRateOpen(false);
                                                }}
                                                    className="px-4 py-2 text-sm cursor-pointer hover:bg-stone-50 text-center font-bold text-stone-600 border-b border-stone-50 last:border-none">{r.toFixed(2)}X</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setPlaybackSpeed(1.0)}
                                    title="恢复原速"
                                    className="p-2.5 rounded-xl border border-stone-200 bg-white text-stone-500 shadow-sm hover:bg-stone-50 transition-colors">
                                    <RotateCcw size={16} />
                                </button>
                                <button
                                    onClick={() => setRepeatMode(!repeatMode)}
                                    title={repeatMode ? "取消循环" : "单句循环"}
                                    className={`p-2.5 rounded-xl border transition-all duration-200 ${repeatMode ? "bg-[#7d8d9c] text-white border-[#7d8d9c] shadow-inner" : "bg-white border-stone-200 text-stone-500 shadow-sm hover:bg-stone-50"}`}
                                >
                                    <Repeat size={16} className={repeatMode ? "animate-pulse" : ""} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile: 7-button controls in one row */}
                    <div className="md:hidden mb-3">
                        <div className="flex items-center justify-between gap-1">
                            {/* ← Left - Circle */}
                            <button
                                onClick={() => {
                                    if (!wavesurferRef.current) return;
                                    if (repeatMode) setRepeatMode(false);
                                    const currentIndex = segments.findIndex(seg => currentTime >= seg.start && currentTime <= seg.end);
                                    const currentLineStart = segments[currentIndex]?.start || 0;
                                    if (currentTime - currentLineStart > 1.5) {
                                        wavesurferRef.current.setTime(currentLineStart);
                                    } else {
                                        const prevIndex = Math.max(0, currentIndex - 1);
                                        wavesurferRef.current.setTime(segments[prevIndex].start);
                                    }
                                    wavesurferRef.current.play();
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                            >
                                <SkipBack size={16} />
                            </button>

                            {/* ▶ Play - Circle */}
                            <button
                                onClick={() => wavesurferRef.current?.playPause()}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                                style={{ backgroundColor: colors.primary }}
                            >
                                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                            </button>

                            {/* → Right - Circle */}
                            <button
                                onClick={() => {
                                    if (!wavesurferRef.current) return;
                                    if (repeatMode) setRepeatMode(false);
                                    const nextIndex = segments.findIndex(seg => seg.start > currentTime);
                                    if (nextIndex !== -1) {
                                        wavesurferRef.current.setTime(segments[nextIndex].start);
                                        wavesurferRef.current.play();
                                    }
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                            >
                                <SkipForward size={16} />
                            </button>

                            {/* Separator */}
                            <div className="w-px h-8 bg-stone-300"></div>

                            {/* ↑ Up - Slower - Circle */}
                            <button
                                onClick={() => {
                                    const currentIdx = SPEEDS.indexOf(playbackSpeed);
                                    const newIdx = currentIdx > 0 ? currentIdx - 1 : 0;
                                    setPlaybackSpeed(SPEEDS[newIdx]);
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                            >
                                <ChevronUp size={18} />
                            </button>

                            {/* Rate as text (Toggles Repeat Mode on Mobile) */}
                            <div
                                onClick={() => setRepeatMode(!repeatMode)}
                                className={`text-xs font-bold transition-all px-2 py-1 rounded-lg flex items-center justify-center min-w-[40px] ${repeatMode ? "bg-[#7d8d9c] text-white shadow-inner" : "text-stone-600 bg-stone-50"}`}
                            >
                                <span className={repeatMode ? "animate-pulse" : ""}>{playbackSpeed.toFixed(2)}</span>
                            </div>

                            {/* ↓ Down - Faster - Circle */}
                            <button
                                onClick={() => {
                                    const currentIdx = SPEEDS.indexOf(playbackSpeed);
                                    const newIdx = currentIdx < SPEEDS.length - 1 ? currentIdx + 1 : SPEEDS.length - 1;
                                    setPlaybackSpeed(SPEEDS[newIdx]);
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                            >
                                <ChevronDown size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Wave */}
                    <div
                        ref={waveContainerRef}
                        onClick={(e) => {
                            if (!wavesurferRef.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percent = x / rect.width;
                            const duration = wavesurferRef.current.getDuration();
                            wavesurferRef.current.setTime(percent * duration);
                        }}
                        className="mb-6 md:mb-6 rounded-xl md:rounded-2xl overflow-hidden bg-stone-50 p-2 md:p-4"
                    ></div>

                    <div ref={scrollContainerRef} onMouseUp={handleTextSelection} className="flex-1 min-h-0 md:p-4 space-y-2 overflow-y-auto relative scroll-smooth pr-2 custom-scroll hide-scrollbar cursor-text">


                        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300" /></div> :
                            segments.map((seg, idx) => {
                                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                                return (
                                    <div key={idx} ref={isActive ? activeLineRef : null}
                                        onClick={() => {
                                            if (window.getSelection().toString().trim().length > 0) return;
                                            if (repeatMode) setRepeatMode(false);
                                            wavesurferRef.current?.setTime(seg.start);
                                            wavesurferRef.current?.play();
                                        }}
                                        className={`p-2 rounded-lg cursor-pointer transition-all duration-300 ${isActive ? "shadow-inner" : ""}`}
                                        style={isActive ? { backgroundColor: '#e8ddd4' } : {}}>
                                        <div className="flex flex-wrap gap-x-1 text-[15px] leading-relaxed" style={{ color: colors.text, fontFamily: "'Noto Sans JP', sans-serif" }}>

                                            {renderWords(seg)}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>

                </div>
            )}

            <WordLookupPanel
                lookup={lookup}
                inflectionMode={inflectionMode}
                toggleMode={toggleMode}
                hideLookup={hideLookup}
                fetchDictionaryData={fetchDictionaryData}
                getMoraList={getMoraList}
                parseAccentPattern={parseAccentPattern}
            />
        </div>
    );
}