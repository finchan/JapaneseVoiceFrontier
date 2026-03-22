import React, {useState, useEffect, useRef} from "react";
import WaveSurfer from "wavesurfer.js";
import {BookOpen, Layers, FileAudio, Play, Pause, Loader2, ChevronUp, ChevronDown, SkipBack, SkipForward, Gauge, RotateCcw, Repeat} from "lucide-react";
import WordLookup, {WordLookupPanel} from '../components/WordLookup';
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


    const wavesurferRef = useRef(null);
    const waveContainerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const activeLineRef = useRef(null);
    const repeatModeRef = useRef(false);
    const segmentsRef = useRef([]);


    const {lookup, hideLookup, inflectionMode, toggleMode, fetchDictionaryData, handleTextSelection, getMoraList, parseAccentPattern} = WordLookup();

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

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        if (wavesurferRef.current) wavesurferRef.current.setPlaybackRate(speed);
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
        <div className="max-w-5xl mx-auto space-y-4 p-1">
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
            <div className="hidden md:grid grid-cols-3 h-[165px] rounded-xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: colors.border }}>

                <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgBook }}>
                    <div className="p-3 sticky top-0 bg-inherit flex items-center gap-2 font-bold text-[15px] text-stone-700 border-b">
                        <BookOpen size={14} /> BOOKS
                    </div>
                    {books.map(b => (
                        <div key={b} onClick={() => handleBookClick(b)} className={`px-6 py-3 text-xs font-normal cursor-pointer ${selectedBook === b ? "bg-white/60" : "hover:bg-white/30"}`}>{b}</div>
                    ))}
                </div>

                <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgCourse }}>
                    <div className="p-3 sticky top-0 bg-inherit flex items-center gap-2 font-bold text-[15px] text-stone-700 border-b">
                        <Layers size={14} /> COURSES
                    </div>
                    {courses.map(c => (
                        <div key={c} onClick={() => handleCourseClick(c)} className={`px-6 py-3 text-xs font-normal cursor-pointer ${selectedCourse === c ? "bg-white/60" : "hover:bg-white/30"}`}>{c}</div>
                    ))}
                </div>

                <div className="custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgFile }}>
                    <div className="p-3 sticky top-0 bg-inherit flex items-center gap-2 font-bold text-[15px] text-stone-700 border-b">
                        <FileAudio size={14} /> FILES
                    </div>
                    {files.map(f => (
                        <div key={f.id} onClick={() => handleFileClick(f)} className={`px-6 py-3 cursor-pointer border-b border-white/10 ${selectedFile === f.name ? "bg-white/60 text-[#7d8d9c]" : "hover:bg-white/30 text-stone-600"}`}>
                            <div className="text-xs font-normal truncate">{f.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile: Tabbed menu */}
            <div className="md:hidden flex flex-col rounded-xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: colors.border }}>
                
                {/* Compact bar - shown when file is selected and menu is collapsed */}
                {selectedFile && mobileMenuCollapsed ? (
                    <div 
                        onClick={() => setMobileMenuCollapsed(false)}
                        className="bg-stone-100 px-4 py-3 flex items-center gap-2 cursor-pointer"
                    >
                        <FileAudio size={16} className="text-stone-500" />
                        <span className="flex-1 text-sm font-bold truncate" style={{ color: colors.text }}>
                            {selectedFile}
                        </span>
                        <ChevronUp size={16} className="text-stone-400" />
                    </div>
                ) : (
                    <>
                        {/* Tab buttons */}
                        <div className="flex border-b" style={{ backgroundColor: colors.bgBook }}>
                            <button 
                                onClick={() => setMobileTab('BOOKS')}
                                className={`flex-1 py-3 text-[15px] font-bold flex items-center justify-center gap-1 transition-colors ${mobileTab === 'BOOKS' ? 'bg-white text-stone-800' : 'text-stone-500'}`}
                            >
                                <BookOpen size={12} /> BOOKS
                                {mobileTab === 'BOOKS' && !selectedBook && (
                                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                )}
                            </button>
                            <button 
                                onClick={() => setMobileTab('COURSES')}
                                className={`flex-1 py-3 text-[15px] font-bold flex items-center justify-center gap-1 transition-colors ${mobileTab === 'COURSES' ? 'bg-white text-stone-800' : 'text-stone-500'}`}
                            >
                                <Layers size={12} /> COURSES
                                {mobileTab === 'COURSES' && !selectedCourse && (
                                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                )}
                            </button>
                            <button 
                                onClick={() => setMobileTab('FILES')}
                                className={`flex-1 py-3 text-[15px] font-bold flex items-center justify-center gap-1 transition-colors ${mobileTab === 'FILES' ? 'bg-white text-stone-800' : 'text-stone-500'}`}
                            >
                                <FileAudio size={12} /> FILES
                                {mobileTab === 'FILES' && !selectedFile && (
                                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                )}
                            </button>
                        </div>

                        {/* Tab content */}
                        <div className="h-[450px] custom-scroll overflow-y-auto">
                            {mobileTab === 'BOOKS' && books.map(b => (
                                <div 
                                    key={b} 
                                    onClick={() => handleBookClick(b)} 
                                    className={`px-4 py-3 text-sm font-normal cursor-pointer border-b ${selectedBook === b ? "bg-stone-100" : "hover:bg-stone-50"}`}
                                >
                                    {b}
                                </div>
                            ))}
                            {mobileTab === 'COURSES' && courses.map(c => (
                                <div 
                                    key={c} 
                                    onClick={() => handleCourseClick(c)} 
                                    className={`px-4 py-3 text-sm font-normal cursor-pointer border-b ${selectedCourse === c ? "bg-stone-100" : "hover:bg-stone-50"}`}
                                >
                                    {c}
                                </div>
                            ))}
                            {mobileTab === 'FILES' && files.map(f => (
                                <div 
                                    key={f.id} 
                                    onClick={() => {
                                        handleFileClick(f);
                                        setMobileMenuCollapsed(true);
                                    }} 
                                    className={`px-4 py-3 cursor-pointer border-b ${selectedFile === f.name ? "bg-stone-100 text-[#7d8d9c]" : "hover:bg-stone-50 text-stone-600"}`}
                                >
                                    <div className="text-sm font-normal truncate">{f.name}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>


            {/* 下方控制栏与字幕区域 */}
            {selectedFile && (
                <div className="bg-white rounded-xl p-6 shadow-xl border border-stone-100">
                    {/* Desktop: File info - hidden on mobile */}
                    <div className="hidden md:flex items-center justify-between mb-4 pb-4 border-b border-stone-100">

                        <div className="flex-1 min-w-0 text-left">
                            <h2 className="text-medium font-black text-stone-800 tracking-tight truncate">{selectedFile}</h2>
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
                                <button 
                                    onClick={() => setRepeatMode(!repeatMode)} 
                                    title={repeatMode ? "取消循环" : "单句循环"}
                                    className={`p-2 rounded-xl transition-all duration-200 ${repeatMode ? "bg-[#7d8d9c] text-white shadow-inner" : "hover:bg-stone-200 text-stone-500"}`}
                                >
                                    <Repeat size={18} className={repeatMode ? "animate-pulse" : ""}/>
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
                                style={{backgroundColor: colors.primary}}
                            >
                                {isPlaying ? <Pause size={18}/> : <Play size={18} className="ml-0.5"/>}
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
                                    handleSpeedChange(SPEEDS[newIdx]);
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
                                    handleSpeedChange(SPEEDS[newIdx]);
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
                    
                    <div ref={scrollContainerRef} onMouseUp={handleTextSelection} className="md:p-4 space-y-2 h-[300px] overflow-y-auto relative scroll-smooth pr-2 custom-scroll hide-scrollbar cursor-text">


                        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300"/></div> :
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
                                        <div className="flex flex-wrap gap-x-1 text-[14px] leading-relaxed" style={{ color: colors.text, fontFamily: "'Noto Sans JP', sans-serif" }}>

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