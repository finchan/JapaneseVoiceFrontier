import React, {useState, useEffect, useRef} from "react";
import WaveSurfer from "wavesurfer.js";
import {BookOpen, Layers, FileAudio, Play, Pause, Loader2, RotateCcw, Gauge, Search, X, MousePointer2} from "lucide-react";


const SPECIAL_EXCEPTIONS = {
    '行って': '行く', '行きます': '行く', '行かない': '行く',
    '来て': '来る', '来ます': '来る', '来不': '来る',
    'して': 'する', 'します': 'する', 'しない': 'する',
    'よくない': 'いい', 'よかった': 'いい', 'よければ': 'いい', 'よく': 'いい'
};

const getMoraList = (text) => {
    if (!text) return [];
    const moraRegex = /[\u3041-\u3096\u30A1-\u30FA\u30FC\u30FD\u30FE][ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]*/g;
    return text.match(moraRegex) || [];
};

const parseAccentPattern = (accentStr) => {
    if (!accentStr) return "";
    let content = accentStr.includes('[') ? accentStr.match(/\[(.*?)\]/)?.[1] || "" : accentStr;
    const pattern = content.split('-')[0];
    return pattern.replace(/[^LH]/g, "");
};

const getVerbPrototypes = (word) => {
    if (SPECIAL_EXCEPTIONS[word]) return [SPECIAL_EXCEPTIONS[word]];
    if (word.length < 2) return [word];
    const results = [];
    if (word.endsWith('って')) {
        const base = word.slice(0, -2);
        results.push(base + 'う', base + 'つ', base + 'る');
    } else if (word.endsWith('んで')) {
        const base = word.slice(0, -2);
        results.push(base + 'む', base + 'ぶ', base + 'ぬ');
    } else if (word.endsWith('いた')) {
        results.push(word.slice(0, -2) + 'く');
    } else if (word.endsWith('いだ')) {
        results.push(word.slice(0, -2) + 'ぐ');
    } else if (word.endsWith('ます') || word.endsWith('ない')) {
        results.push(word.slice(0, -2) + 'る');
    } else if (word.endsWith('し')) {
        results.push(word.slice(0, -1) + 'す');
    } else {
        const rules = {'い': 'う', 'き': 'く', 'ぎ': 'ぐ', 'ち': 'つ', 'り': 'る', 'び': 'ぶ', 'み': 'む'};
        const last = word.slice(-1);
        if (rules[last]) results.push(word.slice(0, -1) + rules[last]);
    }
    return results.length > 0 ? Array.from(new Set(results)) : [word];
};

const lemmatizeAdj = (word) => {
    if (SPECIAL_EXCEPTIONS[word]) return [SPECIAL_EXCEPTIONS[word]];
    if (word.length < 2) return [word];
    if (word.endsWith('くない') || word.endsWith('かった') || word.endsWith('ければ')) return [word.slice(0, -3) + 'い'];
    if (word.endsWith('く') || word.endsWith('さ')) return [word.slice(0, -1) + 'い'];
    if (word.endsWith('だ') || word.endsWith('に') || word.endsWith('な')) return [word.slice(0, -1)];
    return [word];
};


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
    const [inflectionMode, setInflectionMode] = useState(null);
    const [lookup, setLookup] = useState({
        rawText: '', text: '', x: 0, y: 0, data: null, loading: false, show: false, position: 'bottom', candidates: []
    });

    const wavesurferRef = useRef(null);
    const waveContainerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const activeLineRef = useRef(null);
    const dictionaryRef = useRef(null);

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
        const handleClickOutside = (e) => {
            if (dictionaryRef.current && !dictionaryRef.current.contains(e.target)) {
                setLookup(p => ({...p, show: false}));
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDictionaryData = async (queryText) => {
        setLookup(prev => ({...prev, loading: true, text: queryText, candidates: []}));
        try {
            const response = await fetch(`http://localhost:8000/translate_mazii?keyword=${encodeURIComponent(queryText)}`);
            const json = await response.json();
            setLookup(prev => ({...prev, loading: false, data: json.data?.[0] || null}));
        } catch {
            setLookup(prev => ({...prev, loading: false, data: null}));
        }
    };

    const performSearchProcess = async (rawText, mode) => {
        if (!mode) { fetchDictionaryData(rawText); return; }
        const candidates = mode === 'verb' ? getVerbPrototypes(rawText) : lemmatizeAdj(rawText);
        if (candidates.length === 1) {
            fetchDictionaryData(candidates[0]);
        } else {
            setLookup(prev => ({...prev, show: true, candidates, data: null, loading: false}));
        }
    };

    const handleMouseUp = async () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim().replace(/\s+/g, '');

        if (selectedText && selectedText.length > 0 && selectedText.length < 20) {
            setInflectionMode(null);
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            const PANEL_WIDTH = 580;
            const EXPECTED_HEIGHT = 420;
            const GAP = 12;
            const SAFETY_MARGIN = 40;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let x = rect.left + window.scrollX;
            let y = rect.bottom + window.scrollY + GAP;
            let position = 'bottom';

            if (x + PANEL_WIDTH > window.scrollX + viewportWidth - 20) {
                x = window.scrollX + viewportWidth - PANEL_WIDTH - 20;
            }
            if (x < window.scrollX + 10) x = window.scrollX + 10;

            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow < EXPECTED_HEIGHT + SAFETY_MARGIN) {
                if (spaceAbove > EXPECTED_HEIGHT + GAP) {
                    y = rect.top + window.scrollY - GAP;
                    position = 'top';
                } else {
                    y = window.scrollY + viewportHeight - EXPECTED_HEIGHT - 20;
                    position = 'bottom';
                }
            }

            setLookup(prev => ({
                ...prev,
                rawText: selectedText,
                x,
                y,
                position: position,
                show: true
            }));
            fetchDictionaryData(selectedText);
        }
    };

    const toggleMode = (mode) => {
        const newMode = inflectionMode === mode ? null : mode;
        setInflectionMode(newMode);
        performSearchProcess(lookup.rawText, newMode);
    };

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
            barWidth: 2,
            barGap: 1,
            height: 80,
            responsive: true,
            normalize: true,
            cursorWidth: 0,
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

    const handleWordClick = (e, startTime) => {
        e.stopPropagation();
        if (window.getSelection().toString().trim().length > 0) return;
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
        <div className="max-w-5xl mx-auto space-y-4 p-4">
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


            {/* 三栏联动菜单 - 高度调整为 165px (约减少20%)，圆角改为 rounded-xl */}
            <div className="grid grid-cols-3 h-[165px] rounded-xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: colors.border }}>

                <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgBook }}>
                    <div className="p-3 sticky top-0 bg-inherit flex items-center gap-2 font-bold text-[13px] text-stone-700 border-b">
                        <BookOpen size={14} /> BOOKS
                    </div>
                    {books.map(b => (
                        <div key={b} onClick={() => handleBookClick(b)} className={`px-6 py-3 text-xs font-normal cursor-pointer ${selectedBook === b ? "bg-white/60" : "hover:bg-white/30"}`}>{b}</div>
                    ))}
                </div>

                <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgCourse }}>
                    <div className="p-3 sticky top-0 bg-inherit flex items-center gap-2 font-bold text-[13px] text-stone-700 border-b">
                        <Layers size={14} /> COURSES
                    </div>
                    {courses.map(c => (
                        <div key={c} onClick={() => handleCourseClick(c)} className={`px-6 py-3 text-xs font-normal cursor-pointer ${selectedCourse === c ? "bg-white/60" : "hover:bg-white/30"}`}>{c}</div>
                    ))}
                </div>

                <div className="custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgFile }}>
                    <div className="p-3 sticky top-0 bg-inherit flex items-center gap-2 font-bold text-[13px] text-stone-700 border-b">
                        <FileAudio size={14} /> FILES
                    </div>
                    {files.map(f => (
                        <div key={f.id} onClick={() => handleFileClick(f)} className={`px-6 py-3 cursor-pointer border-b border-white/10 ${selectedFile === f.name ? "bg-white/60 text-[#7d8d9c]" : "hover:bg-white/30 text-stone-600"}`}>
                            <div className="text-xs font-normal truncate">{f.name}</div>
                        </div>
                    ))}
                </div>
            </div>


            {/* 下方控制栏与字幕区域 */}
            {selectedFile && (
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-stone-100">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-stone-100">

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
                                <button onClick={() => handleSpeedChange(1.0)} className="p-2 hover:bg-stone-200 rounded-xl transition-colors text-stone-500"><RotateCcw size={18}/></button>
                            </div>
                        </div>
                    </div>
                    <div ref={waveContainerRef} className="mb-6 rounded-2xl overflow-hidden bg-stone-50 p-4"/>
                    <div ref={scrollContainerRef} onMouseUp={handleMouseUp} className="p-4 space-y-2 h-[280px] overflow-y-auto relative scroll-smooth pr-2 custom-scroll hide-scrollbar cursor-text">


                        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300"/></div> :
                            segments.map((seg, idx) => {
                                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                                return (
                                    <div key={idx} ref={isActive ? activeLineRef : null} 
                                        onClick={() => {
                                            if (window.getSelection().toString().trim().length > 0) return;
                                            wavesurferRef.current?.setTime(seg.start);
                                            wavesurferRef.current?.play();
                                        }}
                                        className={`p-2 rounded-lg cursor-pointer transition-all duration-300 ${isActive ? "shadow-inner" : ""}`}
                                        style={isActive ? { backgroundColor: '#e8ddd4' } : {}}>
                                        <div className="flex flex-wrap gap-x-1 text-base leading-relaxed" style={{ color: colors.text, fontFamily: "'Noto Sans JP', sans-serif" }}>

                                            {renderWords(seg)}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>

                </div>
            )}

            {lookup.show && (
                <div ref={dictionaryRef}
                     className="fixed z-[100] w-[580px] shadow-2xl rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md"
                     style={{
                         left: lookup.x,
                         top: lookup.y,
                         transform: lookup.position === 'top' ? 'translateY(-100%)' : 'none',
                         backgroundColor: colors.morandiNeonGreen,
                         maxHeight: '420px',
                         display: 'flex',
                         flexDirection: 'column'
                     }}>

                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-stone-600 font-bold text-[10px] uppercase tracking-wider">
                                <Search size={14}/> Mazii
                            </div>
                            <div className="flex gap-2">
                                {['verb', 'adj'].map(m => (
                                    <button key={m} onClick={() => toggleMode(m)}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border border-black/5 ${inflectionMode === m ? 'bg-stone-800 text-white shadow-sm' : 'bg-white/50 text-stone-600 hover:bg-white/80'}`}>
                                        {m === 'verb' ? '动词辞书形' : '形容词辞书形'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setLookup(p => ({...p, show: false}))} className="text-stone-500 hover:text-black"><X size={18}/></button>
                    </div>

                    {lookup.loading ? <div className="py-10 flex justify-center flex-grow"><Loader2 className="animate-spin text-stone-400"/></div> : (
                        <div className="overflow-y-auto pr-2 custom-scroll flex-grow">
                            {lookup.candidates.length > 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 py-6">
                                    <div className="text-stone-600 font-bold text-sm flex items-center gap-2">
                                        <MousePointer2 size={16}/> 发现多个候选，请选择：
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                        {lookup.candidates.map((cand, cIdx) => (
                                            <button key={cIdx} onClick={() => fetchDictionaryData(cand)} className="px-6 py-2.5 bg-white text-stone-800 rounded-xl border border-stone-300 shadow-sm hover:shadow-md transition-all font-bold text-lg">{cand}</button>
                                        ))}
                                    </div>
                                </div>
                            ) : lookup.data && (
                                <>
                                    <div className="flex items-center gap-4 mb-4 flex-wrap flex-shrink-0">
                                        <span className="text-3xl font-black text-stone-900 leading-none">
                                            {lookup.data.word || lookup.text}
                                        </span>
                                        {!lookup.loading && lookup.data?.level && (
                                            <div className="px-3 py-1 rounded-full flex items-center shadow-md text-stone-900 animate-in fade-in zoom-in duration-500" style={{ borderColor: colors.cardBorder, borderWidth: "1px", color: colors.cardBorder }}>
                                                <span className="text-[10px] font-black tracking-widest uppercase">{lookup.data.level}</span>
                                            </div>
                                        )}
                                        <div className="flex gap-3 ml-2">
                                            {lookup.data.pronunciation?.map((p, i) => {
                                                const moras = getMoraList(p.kana);
                                                const pattern = parseAccentPattern(p.accent);
                                                return (
                                                    <div key={i} className="flex items-center border-r last:border-0 pr-3 border-stone-300">
                                                        <div className="flex">
                                                            {moras.map((m, mIdx) => {
                                                                const currentLevel = pattern[mIdx];
                                                                const nextLevel = pattern[mIdx + 1];
                                                                const hasRightBorder = nextLevel && currentLevel !== nextLevel;
                                                                return (
                                                                    <span key={mIdx} className="text-sm px-0.5 relative" style={{
                                                                        borderTop: currentLevel === 'H' ? `2px solid ${colors.morandiRed}` : '2px solid transparent',
                                                                        borderBottom: currentLevel === 'L' ? `2px solid ${colors.morandiRed}` : '2px solid transparent',
                                                                        borderRight: hasRightBorder ? `2px solid ${colors.morandiRed}` : 'none',
                                                                        padding: '2px 0'
                                                                    }}>{m}</span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {lookup.data.short_mean && <div className="text-sm text-stone-800 font-bold mb-4 bg-white/60 p-3 rounded-xl border border-white/40 shadow-sm flex-shrink-0">{lookup.data.short_mean}</div>}

                                    <div className="grid grid-cols-2 gap-4 pb-2">
                                        {lookup.data.means?.map((m, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-stone-700 dot-pattern flex flex-col gap-2 relative shadow-sm" style={{borderWidth: '1px'}}>
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-stone-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center opacity-80">{idx + 1}</div>
                                                <div className="pr-4">
                                                    <div className="text-sm font-black text-stone-900 leading-snug mb-2">{m.mean}</div>
                                                    {m.kind && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {m.kind.split(',').map((tag, tIdx) => (
                                                                <span key={tIdx} className="text-[9px] text-stone-500 font-bold bg-white/50 px-2 py-0.5 rounded-md border border-black/5 shadow-sm uppercase tracking-tight">{tag.trim()}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {m.examples?.slice(0, 2).map((ex, exIdx) => (
                                                    <div key={exIdx} className="mt-2 space-y-1.5 border-t border-stone-800/10 pt-2">
                                                        <div className="text-xs text-stone-800 font-bold leading-relaxed">{ex.content}</div>
                                                        <div className="text-xs text-stone-600 font-medium leading-relaxed">{ex.mean}</div>
                                                        <div className="text-xs text-stone-400 font-bold leading-relaxed">{ex.transcription}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-4 text-[9px] text-stone-500 text-right font-medium opacity-60 flex-shrink-0">Source: Mazii Dictionary</div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}