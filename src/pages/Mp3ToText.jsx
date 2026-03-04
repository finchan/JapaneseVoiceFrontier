import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Upload, Loader2, RotateCcw, Gauge, Search, X, MousePointer2 } from 'lucide-react';

// Morandi color scheme
const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    primaryLight: '#e8ddd4',
    accent: '#c4a484',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    highlight: '#d4c4b8c',
    activeLine: '#7d8d9c',
    wordHighlight: '#e8c89a',
    waveColor: '#c9c0b8',
    progressColor: '#9c8c7d',
    morandiNeonGreen: '#F2EBBF', // 莫兰迪荧黄色
    morandiRed: '#d6a0a0',
    cardBorder: '#4a4a4a'
};

// --- 日语处理逻辑核心辅助函数 ---

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
        const rules = { 'い': 'う', 'き': 'く', 'ぎ': 'ぐ', 'ち': 'つ', 'り': 'る', 'び': 'ぶ', 'み': 'む' };
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

export default function Mp3ToText() {
    const waveformRef = useRef(null);
    const wavesurfer = useRef(null);
    const scrollContainerRef = useRef(null);
    const dropdownRef = useRef(null);
    const dictionaryRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isRateOpen, setIsRateOpen] = useState(false);

    const [inflectionMode, setInflectionMode] = useState(null);
    const [lookup, setLookup] = useState({
        rawText: '', text: '', x: 0, y: 0, data: null, loading: false, show: false, position: 'bottom', candidates: []
    });

    const lastScrollIndex = useRef(-1);

    const scrollToLine = (index) => {
        const container = scrollContainerRef.current;
        if (!container || !transcript) return;
        const activeElement = container.querySelector(`[data-index="${index}"]`);
        if (activeElement && index !== lastScrollIndex.current) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastScrollIndex.current = index;
        }
    };

    useEffect(() => {
        if (wavesurfer.current) wavesurfer.current.setPlaybackRate(playbackRate);
    }, [playbackRate]);

    useEffect(() => {
        if (transcript) {
            const activeIndex = transcript.findIndex(line => currentTime >= line.start && currentTime <= line.end);
            if (activeIndex !== -1) scrollToLine(activeIndex);
        }
    }, [currentTime, transcript]);

    const fetchDictionaryData = async (queryText) => {
        setLookup(prev => ({ ...prev, loading: true, text: queryText, candidates: [] }));
        try {
            const response = await fetch(`http://localhost:8000/translate_mazii?keyword=${encodeURIComponent(queryText)}`);
            const json = await response.json();
            setLookup(prev => ({ ...prev, loading: false, data: json.data?.[0] || null }));
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            setLookup(prev => ({ ...prev, loading: false, data: null }));
        }
    };

    const performSearchProcess = async (rawText, mode) => {
        if (!mode) { fetchDictionaryData(rawText); return; }
        const candidates = mode === 'verb' ? getVerbPrototypes(rawText) : lemmatizeAdj(rawText);
        if (candidates.length === 1) {
            fetchDictionaryData(candidates[0]);
        } else {
            setLookup(prev => ({ ...prev, show: true, candidates, data: null, loading: false }));
        }
    };

    const handleMouseUp = async () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim().replace(/\s+/g, '');

        if (selectedText && selectedText.length > 0 && selectedText.length < 20) {
            setInflectionMode(null);
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // 面板参数
            const PANEL_WIDTH = 580;
            const EXPECTED_HEIGHT = 420; // 我们预设的最大高度
            const GAP = 12; // 距离划词内容的间距
            const SAFETY_MARGIN = 40; // 预留给任务栏或边缘的安全距离

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // 初始计算位置（默认下方）
            let x = rect.left + window.scrollX;
            let y = rect.bottom + window.scrollY + GAP;
            let position = 'bottom';

            // --- 1. 水平边界控制 ---
            if (x + PANEL_WIDTH > window.scrollX + viewportWidth - 20) {
                x = window.scrollX + viewportWidth - PANEL_WIDTH - 20;
            }
            if (x < window.scrollX + 10) x = window.scrollX + 10;

            // --- 2. 垂直边界控制（解决遮挡核心逻辑） ---
            // 检查：当前选区底部 + 面板高度 + 安全边距 是否超过了视口高度
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow < EXPECTED_HEIGHT + SAFETY_MARGIN) {
                // 如果下方空间不足
                if (spaceAbove > EXPECTED_HEIGHT + GAP) {
                    // 如果上方空间足够，则向上弹出
                    y = rect.top + window.scrollY - GAP;
                    position = 'top';
                } else {
                    // 如果上下都不够（极端的窄屏），则强制面板底部贴合在视口底部上方一点
                    y = window.scrollY + viewportHeight - EXPECTED_HEIGHT - 20;
                    position = 'bottom'; // 此时 transform 设为 none
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
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsRateOpen(false);
            if (dictionaryRef.current && !dictionaryRef.current.contains(e.target)) setLookup(p => ({ ...p, show: false }));
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        const currentRole = localStorage.getItem('user_role') || 'guest';
        formData.append("role", currentRole);
        try {
            const response = await fetch("http://localhost:8000/transcribe", { method: "POST", body: formData });
            const result = await response.json();
            setAudioUrl(URL.createObjectURL(file));
            setTranscript(result.data || result);
            // eslint-disable-next-line no-unused-vars
        } catch (e) { alert("识别失败"); } finally { setLoading(false); }
    };

    const initWavesurfer = (url) => {
        wavesurfer.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: colors.waveColor,
            progressColor: colors.progressColor,
            barWidth: 2, barGap: 1, height: 80,
            normalize: true, cursorWidth: 0,
        });
        wavesurfer.current.load(url);
        wavesurfer.current.on('audioprocess', (time) => setCurrentTime(time));
        wavesurfer.current.on('play', () => setIsPlaying(true));
        wavesurfer.current.on('pause', () => setIsPlaying(false));
    };

    useEffect(() => {
        if (transcript && waveformRef.current && audioUrl && !wavesurfer.current) initWavesurfer(audioUrl);
        return () => wavesurfer.current?.destroy();
    }, [transcript, audioUrl]);

    const handleWordClick = (startTime) => {
        if (window.getSelection().toString().trim().length > 0) return;
        if (wavesurfer.current) {
            wavesurfer.current.setTime(startTime);
            wavesurfer.current.play();
        }
    };

    const customStyles = `
        .slim-scroll::-webkit-scrollbar { width: 4px; }
        .slim-scroll::-webkit-scrollbar-track { background: transparent; }
        .slim-scroll::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; }
        .slim-scroll::-webkit-scrollbar-thumb:hover { background: #333; }
        
        .dot-pattern {
            background-color: transparent;
            background-image: radial-gradient(#00000015 0.5px, transparent 0.5px);
            background-size: 4px 4px;
        }
    `;

    return (
        <div className="space-y-6 relative">
            <style>{customStyles}</style>

            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 bg-white" style={{ borderColor: colors.border }}>
                <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" id="audio-upload" />
                <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center">
                    {loading ? <Loader2 className="animate-spin" style={{ color: colors.primary }} /> : <Upload style={{ color: colors.textLight }} />}
                    <span className="mt-2 text-stone-600 font-medium">点击上传音频开始练习</span>
                </label>
            </div>

            {transcript && (
                <div className="rounded-3xl shadow-lg overflow-hidden bg-white">
                    <div className="p-6 border-b" style={{ backgroundColor: colors.primaryLight, borderColor: colors.border }}>
                        <div ref={waveformRef} className="mb-4" />
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => wavesurfer.current?.playPause()} className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform" style={{ backgroundColor: colors.primary }}>
                                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                            </button>
                            <div className="relative" ref={dropdownRef}>
                                <button onClick={() => setIsRateOpen(!isRateOpen)} className="flex items-center bg-white/60 px-4 py-2 rounded-full border border-stone-200 shadow-sm gap-2 min-w-[100px] justify-between text-sm font-bold">
                                    <Gauge size={16} /> {playbackRate.toFixed(2)}X
                                </button>
                                {isRateOpen && (
                                    <div className="absolute bottom-full mb-2 left-0 w-full bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                        {[0.75, 1.0, 1.25].map(r => (
                                            <div key={r} onClick={() => {setPlaybackRate(r); setIsRateOpen(false);}} className="px-4 py-2 text-sm cursor-pointer hover:bg-stone-50 text-center">{r.toFixed(2)}X</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setPlaybackRate(1.0)} className="p-2.5 rounded-full border border-stone-200 bg-white/60 text-stone-500 shadow-sm"><RotateCcw size={16} /></button>
                        </div>
                    </div>

                    <div ref={scrollContainerRef} onMouseUp={handleMouseUp} className="p-8 overflow-y-auto cursor-text leading-relaxed slim-scroll scroll-smooth" style={{ maxHeight: '500px'}}>
                        {transcript.map((line, idx) => {
                            const isLineActive = currentTime >= line.start && currentTime <= line.end;
                            return (
                                <div key={idx} data-index={idx} className={`p-2 rounded-lg transition-all duration-300 ${isLineActive ? 'bg-stone-100 shadow-inner' : ''}`}>
                                    <div className="flex flex-wrap gap-x-1">
                                        {line.words.map((w, wIdx) => (
                                            <span
                                                key={wIdx}
                                                onClick={() => handleWordClick(w.start)}
                                                className={`px-1 rounded transition-colors text-lg cursor-pointer japanese-text ${currentTime >= w.start && currentTime <= w.end ? 'bg-orange-200 font-bold' : ''}`}
                                                style={{ color: colors.text }}
                                            >
                                                {w.word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {lookup.show && (
                <div ref={dictionaryRef} className="fixed z-[100] w-[580px] shadow-2xl rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md"
                     style={{
                         left: lookup.x,
                         top: lookup.y,
                         transform: lookup.position === 'top' ? 'translateY(-100%)' : 'none',
                         backgroundColor: colors.morandiNeonGreen,
                         // 修改：高度根据内容自适应，但最大高度限制在 420px (约能展示两栏释义的第一行内容)
                         maxHeight: '420px',
                         display: 'flex',
                         flexDirection: 'column'
                     }}>

                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-stone-600 font-bold text-[10px] uppercase tracking-wider"><Search size={14} /> Mazii</div>
                            <div className="flex gap-2">
                                {['verb', 'adj'].map(m => (
                                    <button key={m} onClick={() => toggleMode(m)} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border border-black/5 ${inflectionMode === m ? 'bg-stone-800 text-white shadow-sm' : 'bg-white/50 text-stone-600 hover:bg-white/80'}`}>
                                        {m === 'verb' ? '动词活用' : '形容词活用'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setLookup(p => ({ ...p, show: false }))} className="text-stone-500 hover:text-black"><X size={18} /></button>
                    </div>

                    {lookup.loading ? <div className="py-10 flex justify-center flex-grow"><Loader2 className="animate-spin text-stone-400" /></div> : (
                        <div className="overflow-y-auto pr-2 slim-scroll flex-grow">
                            {lookup.candidates.length > 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 py-6">
                                    <div className="text-stone-600 font-bold text-sm flex items-center gap-2"><MousePointer2 size={16} /> 发现多个候选，请选择：</div>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                        {lookup.candidates.map((cand, cIdx) => (
                                            <button key={cIdx} onClick={() => fetchDictionaryData(cand)} className="px-6 py-2.5 bg-white text-stone-800 rounded-xl border border-stone-300 shadow-sm hover:shadow-md transition-all font-bold text-lg japanese-text">{cand}</button>
                                        ))}
                                    </div>
                                </div>
                            ) : lookup.data && (
                                <>
                                    <div className="flex items-baseline gap-4 mb-4 flex-wrap flex-shrink-0">
                                        <span className="text-3xl font-black text-stone-900">{lookup.data.word || lookup.text}</span>
                                        <div className="flex gap-3">
                                            {lookup.data.pronunciation?.map((p, i) => {
                                                const moras = getMoraList(p.kana);
                                                const pattern = parseAccentPattern(p.accent);
                                                return (
                                                    <div key={i} className="flex items-center border-r last:border-0 pr-3 border-stone-300">
                                                        <div className="flex">
                                                            {moras.map((m, mIdx) => {
                                                                // 核心逻辑：判断相邻音拍是否发生变化
                                                                const currentLevel = pattern[mIdx];
                                                                const nextLevel = pattern[mIdx + 1];
                                                                // 规则：只要相邻两个不同 (LH 或 HL)，前者右侧加竖线
                                                                const hasRightBorder = nextLevel && currentLevel !== nextLevel;

                                                                return (
                                                                    <span key={mIdx} className="japanese-text text-lg px-0.5 relative" style={{
                                                                        // 顶部线 (High) 或 底部线 (Low)
                                                                        borderTop: currentLevel === 'H' ? `2px solid ${colors.morandiRed}` : '2px solid transparent',
                                                                        borderBottom: currentLevel === 'L' ? `2px solid ${colors.morandiRed}` : '2px solid transparent',
                                                                        // 侧边竖线：根据相邻变化逻辑判断
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

                                    {/* 两栏显示，高度由内容决定，超出则在该容器内滚动 */}
                                    <div className="grid grid-cols-2 gap-4 pb-2">
                                        {lookup.data.means?.map((m, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-stone-700 dot-pattern flex flex-col gap-2 relative shadow-sm" style={{ borderWidth: '1px' }}>
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-stone-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center opacity-80">{idx + 1}</div>
                                                <div className="pr-4">
                                                    <div className="text-sm font-black text-stone-900 leading-snug mb-2">{m.mean}</div>

                                                    {m.kind && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {m.kind.split(',').map((tag, tIdx) => (
                                                                <span key={tIdx} className="text-[9px] text-stone-500 font-bold bg-white/50 px-2 py-0.5 rounded-md border border-black/5 shadow-sm uppercase tracking-tight">
                                                                    {tag.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {m.examples?.slice(0, 2).map((ex, exIdx) => (
                                                    <div key={exIdx} className="mt-2 space-y-1.5 border-t border-stone-800/10 pt-2">
                                                        <div className="text-xs text-stone-800 font-bold japanese-text leading-relaxed">{ex.content}</div>
                                                        <div className="text-xs text-stone-600 font-medium leading-relaxed">{ex.mean}</div>
                                                        <div className="text-xs text-stone-400 font-bold japanese-text leading-relaxed">{ex.transcription}</div>
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