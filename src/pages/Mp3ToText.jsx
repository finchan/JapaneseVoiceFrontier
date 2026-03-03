import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Upload, Loader2, RotateCcw, Gauge, Search, X } from 'lucide-react';

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
    // 修改：莫兰迪荧绿色，透明度调至 80% (0.8)
    morandiNeonGreen: 'rgba(218, 245, 218, 0.8)'
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
    const [, setFileName] = useState("");
    const [audioUrl, setAudioUrl] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isRateOpen, setIsRateOpen] = useState(false);

    // 划词翻译状态
    const [lookup, setLookup] = useState({
        text: '',
        x: 0,
        y: 0,
        data: null,
        loading: false,
        show: false,
        position: 'bottom' // 用于判断向上还是向下弹出
    });

    const lastScrollIndex = useRef(-1);

    // 划词逻辑与碰撞检测
    // 划词逻辑与碰撞检测 - 已优化边界计算
    const handleMouseUp = async (e) => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim().replace(/\s+/g, '');

        if (selectedText && selectedText.length > 0 && selectedText.length < 20) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // 预估弹窗尺寸（当前宽度固定为 580px，高度根据内容预估最大约 350px）
            const estimatedHeight = 350;
            const estimatedWidth = 580;

            // 获取实际可视区域（排除浏览器UI，如地址栏）
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const viewportWidth = window.visualViewport?.width || window.innerWidth;
            // 获取当前滚动条位置
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            // 设置安全边距：避免弹窗贴死浏览器边缘
            const safeTopMargin = 70;    // 顶部预留出地址栏或操作空间
            const safeBottomMargin = 40; // 底部预留出任务栏空间
            const safeSideMargin = 20;   // 左右预留 20px

            // 计算选中文本相对于视口的位置
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            let y = 0;
            let x = rect.left + scrollLeft;
            let position = 'bottom';

            // Y 轴判断：如果下方空间不足以容纳弹窗高度+安全边距
            if (spaceBelow < (estimatedHeight + safeBottomMargin)) {
                // 如果上方空间比下方多，则尝试向上弹出
                if (spaceAbove > spaceBelow) {
                    // 向上弹出：计算 Y 坐标，并确保不超出顶部安全线
                    const targetY = rect.top + scrollTop - 12; // 向上偏移 12px
                    y = Math.max(scrollTop + safeTopMargin + estimatedHeight, targetY);
                    position = 'top';
                } else {
                    // 如果上下都不够，强行向下，但 Y 坐标要上移以保证底部可见
                    y = scrollTop + viewportHeight - estimatedHeight - safeBottomMargin;
                    position = 'bottom';
                }
            } else {
                // 下方空间充足，向下弹出
                y = rect.bottom + scrollTop + 12;
                position = 'bottom';
            }

            // X 轴边界保护：确保不超出右边界
            if (x + estimatedWidth > scrollLeft + viewportWidth - safeSideMargin) {
                x = scrollLeft + viewportWidth - estimatedWidth - safeSideMargin;
            }
            // 确保不超出左边界
            if (x < scrollLeft + safeSideMargin) {
                x = scrollLeft + safeSideMargin;
            }

            setLookup({
                text: selectedText,
                x: x,
                y: y,
                loading: true,
                show: true,
                data: null,
                position: position
            });

            try {
                const response = await fetch(`http://localhost:8000/translate_mazii?keyword=${encodeURIComponent(selectedText)}`);
                const json = await response.json();

                setLookup(prev => ({
                    ...prev,
                    loading: false,
                    data: json.data && json.data.length > 0 ? json.data[0] : null
                }));
            } catch (error) {
                setLookup(prev => ({ ...prev, loading: false }));
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsRateOpen(false);
            }
            if (dictionaryRef.current && !dictionaryRef.current.contains(event.target)) {
                setLookup(prev => ({ ...prev, show: false }));
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ... 省略原有的 Wavesurfer 逻辑 ...
    const scrollToLine = (index, isManual = false) => {
        const container = scrollContainerRef.current;
        if (!container || !transcript) return;
        const activeElement = container.querySelector(`[data-index="${index}"]`);
        if (activeElement && (isManual || (index % 5 === 0 && index !== lastScrollIndex.current))) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            lastScrollIndex.current = index;
        }
    };

    useEffect(() => {
        if (wavesurfer.current) wavesurfer.current.setPlaybackRate(playbackRate);
    }, [playbackRate]);

    useEffect(() => {
        if (transcript) {
            const activeIndex = transcript.findIndex(line => currentTime >= line.start && currentTime <= line.end);
            if (activeIndex !== -1) scrollToLine(activeIndex, false);
        }
    }, [currentTime, transcript]);

    useEffect(() => {
        if (transcript && waveformRef.current && audioUrl && !wavesurfer.current) {
            initWavesurfer(audioUrl);
        }
        return () => wavesurfer.current?.destroy();
    }, [transcript, audioUrl]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setLoading(true);
        setTranscript(null);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const response = await fetch("http://localhost:8000/transcribe", { method: "POST", body: formData });
            const result = await response.json();
            setAudioUrl(URL.createObjectURL(file));
            setTranscript(result.data || result);
        } catch (error) {
            alert("识别失败");
        } finally {
            setLoading(false);
        }
    };

    const initWavesurfer = (url) => {
        wavesurfer.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: colors.waveColor,
            progressColor: colors.progressColor,
            barWidth: 2,
            barGap: 1,
            height: 80,
            normalize: true,
            cursorWidth: 0,
        });
        wavesurfer.current.load(url);
        wavesurfer.current.on('audioprocess', (time) => setCurrentTime(time));
        wavesurfer.current.on('play', () => setIsPlaying(true));
        wavesurfer.current.on('pause', () => setIsPlaying(false));
        wavesurfer.current.on('ready', () => wavesurfer.current.setPlaybackRate(playbackRate));
    };

    const handleWordClick = (startTime) => {
        // 如果有文字被选中（划词），则不触发播放
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 0) {
            return;
        }
        wavesurfer.current?.setTime(startTime);
        wavesurfer.current?.play();
    };

    return (
        <div className="space-y-6 relative">
            {/* 上传区域 */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 bg-white" style={{ borderColor: colors.border }}>
                <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" id="audio-upload" />
                <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center">
                    {loading ? <Loader2 className="animate-spin" style={{ color: colors.primary }} /> : <Upload style={{ color: colors.textLight }} />}
                    <span className="mt-2" style={{ color: colors.text }}>点击上传音频进行日语听力练习</span>
                </label>
            </div>

            {transcript && (
                <div className="rounded-3xl shadow-lg overflow-hidden" style={{ backgroundColor: colors.white }}>
                    {/* 控制面板 */}
                    <div className="p-6 border-b" style={{ backgroundColor: colors.primaryLight, borderColor: colors.border }}>
                        <div ref={waveformRef} className="mb-4" />
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => wavesurfer.current?.playPause()} className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform" style={{ backgroundColor: colors.primary }}>
                                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                            </button>
                            {/* 倍速控制 */}
                            <div className="flex items-center gap-2">
                                <div className="relative" ref={dropdownRef}>
                                    <button onClick={() => setIsRateOpen(!isRateOpen)} className="flex items-center bg-white/60 px-4 py-2 rounded-full border border-stone-200 shadow-sm gap-2 hover:bg-white/80 min-w-[110px] justify-between">
                                        <div className="flex items-center gap-2">
                                            <Gauge size={16} style={{ color: colors.textLight }} />
                                            <span className="text-sm font-semibold" style={{ color: colors.text }}>{playbackRate.toFixed(2)}X</span>
                                        </div>
                                        <span className={`text-[10px] transition-transform ${isRateOpen ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                    {isRateOpen && (
                                        <div className="absolute bottom-full mb-2 left-0 w-full bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                                            {[0.75, 1.0, 1.25].map((rate) => (
                                                <div key={rate} onClick={() => {setPlaybackRate(rate); setIsRateOpen(false);}} className={`px-4 py-2.5 text-sm font-semibold cursor-pointer text-center ${playbackRate === rate ? 'bg-stone-100' : 'hover:bg-stone-50'}`} style={{ color: playbackRate === rate ? colors.primary : colors.text }}>
                                                    {rate.toFixed(2)}X
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setPlaybackRate(1.0)} className="p-2.5 rounded-full border border-stone-200 bg-white/60 text-stone-500 shadow-sm hover:text-stone-700 transition-all"><RotateCcw size={16} /></button>
                            </div>
                        </div>
                    </div>

                    {/* 字幕区域 */}
                    <div
                        ref={scrollContainerRef}
                        onMouseUp={handleMouseUp}
                        className="p-8 overflow-y-auto scroll-smooth cursor-text selection:bg-orange-100"
                        style={{ maxHeight: '500px' }}
                    >
                        {transcript.map((line, idx) => {
                            const isLineActive = currentTime >= line.start && currentTime <= line.end;
                            return (
                                <div key={idx} data-index={idx} className={`p-2 rounded-lg transition-all duration-500 mt-0.5 ${isLineActive ? 'shadow-sm' : ''}`} style={{ backgroundColor: isLineActive ? colors.activeLine : 'transparent' }}>
                                    <div className="flex flex-wrap">
                                        {line.words.map((w, wIdx) => (
                                            <span key={wIdx} onClick={() => handleWordClick(w.start)} className={`cursor-pointer px-1 rounded-sm text-base transition-all japanese-text ${currentTime >= w.start && currentTime <= w.end ? 'font-bold scale-105' : ''}`} style={{ backgroundColor: currentTime >= w.start && currentTime <= w.end ? colors.wordHighlight : 'transparent', color: currentTime >= w.start && currentTime <= w.end ? '#2d4a2d' : (isLineActive ? colors.white : colors.text) }}>
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

            {/* 翻译弹窗：新增碰撞检测逻辑 */}
            {lookup.show && (
                <div
                    ref={dictionaryRef}
                    className="fixed z-[100] w-[580px] border border-stone-200/40 shadow-2xl rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl selection:bg-white/40"
                    style={{
                        left: lookup.x,
                        top: lookup.y,
                        // 如果是向上弹出，则使用 transform 偏移自身高度
                        transform: lookup.position === 'top' ? 'translateY(-100%)' : 'none',
                        backgroundColor: colors.morandiNeonGreen
                    }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 text-stone-600">
                            <Search size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Mazii</span>
                        </div>
                        <button onClick={() => setLookup(prev => ({ ...prev, show: false }))} className="text-stone-500 hover:text-stone-800"><X size={14} /></button>
                    </div>

                    {lookup.loading ? (
                        <div className="py-4 flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin w-5 h-5 text-stone-500" />
                        </div>
                    ) : lookup.data && (
                        <div className="h-[282px] overflow-y-auto pr-1 custom-scrollbar">
                            {/* Word | Level | Pronunciation in one row */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-lg font-bold text-stone-900">
                                    {lookup.data.word || lookup.text}
                                </span>
                                {lookup.data.level && lookup.data.level.length > 0 && (
                                    <span className="text-[10px] bg-stone-200/60 px-1.5 py-0.5 rounded font-bold text-stone-600">
                                        {lookup.data.level[0]}
                                    </span>
                                )}
                                {lookup.data.pronunciation && lookup.data.pronunciation.map((p, i) => (
                                    <span key={i} className="text-[10px] text-stone-500 font-bold">
                                        {p.accent}
                                    </span>
                                ))}
                            </div>

                            {/* Means - Grid layout, 2 columns */}
                            {lookup.data.means && (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3">
                                    {lookup.data.means.map((meanItem, meanIdx) => (
                                        <div key={meanIdx} className="space-y-1 border-r border-stone-200 pr-3 last:border-r-0 min-w-0">
                                            {/* Mean, Kind, Xref, Ant */}
                                            <div className="text-stone-800 text-sm">
                                                <div className="font-medium text-stone-900">{meanItem.mean}</div>
                                                {meanItem.kind && (
                                                    <div className="text-[10px] text-stone-500 italic">{meanItem.kind}</div>
                                                )}
                                                {meanItem.xref && meanItem.xref.length > 0 && (
                                                    <div className="text-[9px] text-stone-500 truncate">
                                                        <span className="font-medium">⇒</span> {meanItem.xref.join(', ')}
                                                    </div>
                                                )}
                                                {meanItem.ant && meanItem.ant.length > 0 && (
                                                    <div className="text-[9px] text-stone-500 truncate">
                                                        <span className="font-medium">⇔</span> {meanItem.ant.join(', ')}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Examples */}
                                            {meanItem.examples && meanItem.examples.length > 0 && (
                                                <>
                                                    <div className="text-[8px] text-stone-300 my-0.5">{'-'.repeat(15)}</div>
                                                    {meanItem.examples.map((ex, exIdx) => (
                                                        <div key={exIdx} className="ml-1 space-y-0.5">
                                                            <div className="text-xs text-stone-700 japanese-text">{ex.content}</div>
                                                            <div className="text-[10px] text-stone-400">{ex.transcription}</div>
                                                            <div className="text-[10px] text-stone-600">{ex.mean}</div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-2 text-[9px] text-stone-500 text-right italic border-t border-stone-300/30 mt-3">
                                Source: Mazii
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}