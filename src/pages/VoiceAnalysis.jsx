import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Upload, Info, Loader2, RotateCcw, Gauge, ChevronUp, ChevronDown, SkipBack, SkipForward, Repeat } from 'lucide-react';
import WordLookup, { WordLookupPanel } from '../components/WordLookup';
import API_CONFIG from '../config';

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
    morandiNeonGreen: '#F2EBBF',
    morandiRed: '#d6a0a0',
    cardBorder: '#4a4a4a'
};

export default function VoiceAnalysis() {
    const waveformRef = useRef(null);
    const wavesurfer = useRef(null);
    const scrollContainerRef = useRef(null);
    const dropdownRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isRateOpen, setIsRateOpen] = useState(false);
    const [isTuningOpen, setIsTuningOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState('auto');
    const [cacheAuto, setCacheAuto] = useState({ transcript: null, audioUrl: null, currentTime: 0 });
    const [cacheManual, setCacheManual] = useState({ transcript: null, audioUrl: null, currentTime: 0 });
    const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });
    const [repeatMode, setRepeatMode] = useState(false);

    const repeatModeRef = useRef(false);
    const segmentsRef = useRef([]);

    useEffect(() => {
        const tabsContainer = document.getElementById('analysis-tabs-container');
        const activeButton = tabsContainer?.querySelector(`[data-tab="${uploadMode}"]`);
        if (activeButton) {
            setTabIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth
            });
        }
    }, [uploadMode]);

    const isTestingEnv = API_CONFIG.baseURL.includes('localhost') || API_CONFIG.baseURL.includes('127.0.0.1');

    const [language, setLanguage] = useState('ja');
    const [cpuThreads, setCpuThreads] = useState(isTestingEnv ? 4 : 1);
    const [initialPrompt, setInitialPrompt] = useState('こんにちは。今日は漢字とかなを使って日本語で話します。');
    const [vadFilter, setVadFilter] = useState(false);
    const [vadMs, setVadMs] = useState(3000);
    const [gapVal, setGapVal] = useState(0.7);
    const [noSpeechVal, setNoSpeechVal] = useState(0.6);
    const [beamVal, setBeamVal] = useState(7);

    const handleModeSwitch = (mode) => {
        if (uploadMode === mode) return;

        if (uploadMode === 'auto') setCacheAuto({ transcript, audioUrl, currentTime });
        else setCacheManual({ transcript, audioUrl, currentTime });

        setUploadMode(mode);

        if (wavesurfer.current) {
            wavesurfer.current.destroy();
            wavesurfer.current = null;
        }

        const targetCache = mode === 'auto' ? cacheAuto : cacheManual;
        setTranscript(targetCache.transcript);
        setAudioUrl(targetCache.audioUrl);
        setCurrentTime(targetCache.currentTime);
        setIsPlaying(false);
    };

    const handleLanguageChange = (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        if (lang === 'ja') {
            setInitialPrompt('こんにちは。今日は漢字とかなを使って日本語で話します。');
        } else {
            setInitialPrompt('');
        }
    };

    const { lookup, hideLookup, inflectionMode, toggleMode, fetchDictionaryData, handleTextSelection, getMoraList, parseAccentPattern } = WordLookup();

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

    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { segmentsRef.current = transcript; }, [transcript]);

    useEffect(() => {
        if (transcript) {
            const activeIndex = transcript.findIndex(line => currentTime >= line.start && currentTime <= line.end);
            if (activeIndex !== -1) scrollToLine(activeIndex);
        }
    }, [currentTime, transcript]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsRateOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- 新增：键盘控制逻辑 ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 1. 输入保护：如果用户正在输入，不触发快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!wavesurfer.current || !transcript) return;

            // 2. 获取当前播放索引，用于左右键跳转
            const currentIndex = transcript.findIndex(
                line => currentTime >= line.start && currentTime <= line.end
            );

            // 3. 定义倍速档位
            const rateLevels = [0.5, 0.75, 1.0, 1.25, 1.5];

            switch (e.key) {
                case ' ':
                    // 空格键：播放/暂停。使用 preventDefault 防止页面滚动
                    e.preventDefault();
                    wavesurfer.current.playPause();
                    break;

                case 'ArrowUp':
                    // 上键：切换到更慢的一档
                    e.preventDefault();
                    setPlaybackRate(prev => {
                        const currentIdx = rateLevels.indexOf(prev);
                        // 如果当前倍速是第一档或不在数组内，保持第一档，否则减小索引
                        const newIdx = currentIdx > 0 ? currentIdx - 1 : 0;
                        return rateLevels[newIdx];
                    });
                    break;

                case 'ArrowDown':
                    // 下键：切换到更快的一档
                    e.preventDefault();
                    setPlaybackRate(prev => {
                        const currentIdx = rateLevels.indexOf(prev);
                        // 如果已经是最后一档，保持不变，否则增大索引
                        const newIdx = (currentIdx < rateLevels.length - 1 && currentIdx !== -1)
                            ? currentIdx + 1
                            : rateLevels.length - 1;
                        return rateLevels[newIdx];
                    });
                    break;

                case 'ArrowRight':
                    // 右键：跳转到下一句开头
                    const nextIndex = currentIndex + 1;
                    if (nextIndex < transcript.length) {
                        setRepeatMode(false);
                        wavesurfer.current.setTime(transcript[nextIndex].start);
                        wavesurfer.current.play();
                    }
                    break;

                case 'ArrowLeft':
                    // 左键：重听本句或跳转到上一句
                    setRepeatMode(false);
                    const currentLineStart = transcript[currentIndex]?.start || 0;
                    if (currentTime - currentLineStart > 1.5) {
                        wavesurfer.current.setTime(currentLineStart);
                    } else {
                        const prevIndex = Math.max(0, currentIndex - 1);
                        wavesurfer.current.setTime(transcript[prevIndex].start);
                    }
                    wavesurfer.current.play();
                    break;

                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, transcript]); // 监听当前时间和字幕数据以确保逻辑准确


    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Cleanup active state only, without terminating blob references used in background caches
        if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
        }
        if (wavesurfer.current) {
            wavesurfer.current.destroy();
            wavesurfer.current = null;
        }
        setTranscript(null);
        setCurrentTime(0);
        setIsPlaying(false);

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        const currentRole = localStorage.getItem('user_role') || 'guest';
        formData.append("role", currentRole);

        try {
            if (uploadMode === 'auto') {
                formData.append("language", language);
                formData.append("initial_prompt", initialPrompt);
                formData.append("vad_filter", vadFilter);
                formData.append("vad_ms", vadMs);
                formData.append("gap_val", gapVal);
                formData.append("no_speech_val", noSpeechVal);
                formData.append("beam_val", beamVal);
                formData.append("cpu_threads", cpuThreads);

                const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.transcribe), { method: "POST", body: formData });
                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                const result = await response.json();

                const transcriptData = result.data || result;
                if (!Array.isArray(transcriptData)) throw new Error("Invalid response format");

                setAudioUrl(URL.createObjectURL(file));
                setTranscript(transcriptData);
            } else {
                const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.uploadManual), { method: "POST", body: formData });
                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                const result = await response.json();

                if (result.status === "pending") {
                    alert(result.message); // Displays "等待对应的 json 文件" / "等待对应的 mp3 文件"
                } else if (result.status === "ready") {
                    const transcriptData = result.data || result;
                    if (!Array.isArray(transcriptData)) throw new Error("Invalid response format");

                    // Fetch the audio as a blob to cache locally and avoid re-downloads during mode switching
                    const audioResponse = await fetch(result.audio_url);
                    if (!audioResponse.ok) throw new Error("Failed to fetch audio stream");
                    const audioBlob = await audioResponse.blob();
                    const localBlobUrl = URL.createObjectURL(audioBlob);

                    setAudioUrl(localBlobUrl);
                    setTranscript(transcriptData);
                } else {
                    throw new Error(result.error || "Unknown error occurred");
                }
            }
        } catch (err) {
            console.error("Upload/Transcription error:", err);
            alert("操作失败，请重试");
        } finally {
            setLoading(false);
            e.target.value = null; // Ensure same file can be uploaded back-to-back if intended
        }
    };


    const initWavesurfer = (url) => {
        if (wavesurfer.current) return;
        const isMobile = window.innerWidth < 768;
        wavesurfer.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: colors.waveColor,
            progressColor: colors.progressColor,
            barWidth: isMobile ? 1 : 2,
            barGap: isMobile ? 5 : 1,
            height: isMobile ? 40 : 80,
            normalize: true, cursorWidth: 0,
            responsive: true,
        });
        wavesurfer.current.load(url);
        wavesurfer.current.on('audioprocess', (time) => {
            setCurrentTime(time);

            // Repeat mode logic
            const mode = repeatModeRef.current;
            const segs = segmentsRef.current;
            if (mode && segs.length > 0) {
                const currentSeg = segs.find(s => time >= s.start && time <= s.end);
                if (currentSeg && time >= currentSeg.end - 0.1) {
                    wavesurfer.current.setTime(currentSeg.start);
                }
            }
        });
        wavesurfer.current.on('seeking', (time) => setCurrentTime(time));
        wavesurfer.current.on('interaction', (time) => setCurrentTime(time));
        wavesurfer.current.on('play', () => setIsPlaying(true));
        wavesurfer.current.on('pause', () => setIsPlaying(false));

        // Restore progress if returning to a cached session
        wavesurfer.current.once('ready', () => {
            if (currentTime > 0) {
                wavesurfer.current.setTime(currentTime);
            }
        });
    };

    useEffect(() => {
        if (transcript && waveformRef.current && audioUrl) {
            initWavesurfer(audioUrl);
        }
        return () => {
            if (wavesurfer.current) {
                wavesurfer.current.destroy();
                wavesurfer.current = null;
            }
        };
    }, [transcript, audioUrl]);

    useEffect(() => {
        // Only revoke on unmount to preserve caching during mode-switches
        return () => {
            if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
            if (cacheAuto.audioUrl && cacheAuto.audioUrl.startsWith('blob:')) URL.revokeObjectURL(cacheAuto.audioUrl);
            if (cacheManual.audioUrl && cacheManual.audioUrl.startsWith('blob:')) URL.revokeObjectURL(cacheManual.audioUrl);
        };
    }, []);


    const handleWordClick = (startTime) => {
        if (window.getSelection().toString().trim().length > 0) return;
        if (wavesurfer.current) {
            setRepeatMode(false);
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
        <div className="h-[calc(100svh-80px)] md:h-[calc(100vh-105px)] flex flex-col p-2 pb-8 space-y-4 overflow-hidden relative">
            <style>{customStyles}</style>

            {/* Tab Navigation (Migrated from VoiceManagement style) */}
            <div id="analysis-tabs-container" className="relative mb-6 border-b" style={{ borderColor: colors.border }}>
                <div className="flex">
                    {[
                        { key: 'auto', label: 'ANALYSE MP3' },
                        { key: 'manual', label: 'UPLOAD STUFF' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            data-tab={tab.key}
                            onClick={() => handleModeSwitch(tab.key)}
                            className="flex-1 py-3 px-4 text-[15px] font-black tracking-wider transition-colors"
                            style={{
                                color: uploadMode === tab.key ? colors.primary : colors.textLight
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

            {/* Settings Panel */}
            {uploadMode === 'auto' && (
                <div className="rounded-xl p-4 md:p-6 shadow-sm bg-white border mb-4" style={{ borderColor: colors.border }}>
                    <div
                        onClick={() => setIsTuningOpen(!isTuningOpen)}
                        className="flex items-center justify-between text-sm font-bold pb-2 border-b select-none cursor-pointer group hover:bg-stone-50/50 transition-colors"
                        style={{ color: colors.primary, borderColor: colors.border }}
                    >
                        <div className="flex items-center gap-2">
                            <span>Deep Tuning Profile</span>
                            <ChevronDown
                                size={16}
                                className={`text-stone-400 group-hover:text-stone-600 transition-transform duration-200 ${isTuningOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                        <div
                            className="relative flex items-center outline-none"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsInfoOpen(!isInfoOpen);
                            }}
                        >
                            <Info size={16} className={`text-red-500 font-bold active:scale-90 transition-transform ${isInfoOpen ? 'scale-110' : 'hover:scale-110'}`} />
                            <div className={`absolute right-0 top-full mt-2 w-72 p-3 bg-white border border-stone-200 shadow-xl rounded-lg text-xs leading-relaxed text-stone-600 transition-all duration-200 z-50 ${isInfoOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                                <span className="text-red-500 font-bold block mb-1">注意:</span>
                                服务器的内存只有2GB，离线运行faster-whisper-large-v3-turbo-ct2模型，没有GPU，双核CPU借助硬盘处理。<br />
                                配置低，所以运行速度极其缓慢，请耐心等待。或者通过其他工具TRANSCRIBE MP3. THANK YOU!
                            </div>
                        </div>
                    </div>

                    <div className={`space-y-4 md:space-y-5 mt-4 md:mt-5 ${isTuningOpen ? 'block' : 'hidden'}`}>
                        {/* Row 1: Language & CPU */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <label className="font-bold whitespace-nowrap" style={{ color: colors.text }}>语言语种:</label>
                                <select
                                    value={language}
                                    onChange={handleLanguageChange}
                                    className="bg-transparent border-none outline-none text-stone-700 w-full"
                                >
                                    <option value="ja">Japense (default)</option>
                                    <option value="auto">Auto</option>
                                    <option value="en">English</option>
                                    <option value="ms">Malay</option>
                                    <option value="id">Indonesian</option>
                                    <option value="vi">Vietnamese</option>
                                    <option value="ru">Russian</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <label className="font-bold whitespace-nowrap" style={{ color: colors.text }}>CPU 核数:</label>
                                <input
                                    type="number"
                                    value={cpuThreads}
                                    onChange={(e) => setCpuThreads(e.target.value)}
                                    disabled={!isTestingEnv}
                                    title={!isTestingEnv ? "生产环境已锁定为1个CPU" : ""}
                                    className={`bg-transparent border-none outline-none w-full ${!isTestingEnv ? 'text-stone-400 cursor-not-allowed' : 'text-stone-700'}`}
                                />
                            </div>
                        </div>

                        {/* Row 2: VAD & Gap */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={vadFilter}
                                    onChange={(e) => setVadFilter(e.target.checked)}
                                    className="accent-[#9c8c7d]"
                                    id="vad-filter-cb"
                                />
                                <label htmlFor="vad-filter-cb" className="font-bold cursor-pointer" style={{ color: colors.text }}>无声音频(VAD)</label>
                            </div>

                            <div className="flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <label className="font-bold whitespace-nowrap flex-shrink-0" title="VAD静音切片阈值" style={{ color: colors.text }}>静音(ms):</label>
                                <input
                                    type="number"
                                    value={vadMs}
                                    onChange={(e) => setVadMs(e.target.value)}
                                    disabled={!vadFilter}
                                    className="bg-transparent border-none outline-none text-stone-700 w-full disabled:opacity-50"
                                />
                            </div>

                            <div className="flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <label className="font-bold whitespace-nowrap flex-shrink-0" style={{ color: colors.text }}>断句间隙(Gap):</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={gapVal}
                                    onChange={(e) => setGapVal(e.target.value)}
                                    className="bg-transparent border-none outline-none text-stone-700 w-full"
                                />
                            </div>
                        </div>

                        {/* Row 3: Prompts & Deep Params */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-8 flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <label className="font-bold whitespace-nowrap flex-shrink-0" style={{ color: colors.text }}>词垫(Prompt):</label>
                                <input
                                    type="text"
                                    value={initialPrompt}
                                    onChange={(e) => setInitialPrompt(e.target.value)}
                                    placeholder="留空即默认"
                                    className="bg-transparent border-none outline-none text-stone-700 w-full"
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <label className="font-bold whitespace-nowrap flex-shrink-0" style={{ color: colors.text }}>Beam:</label>
                                <input
                                    type="number"
                                    value={beamVal}
                                    onChange={(e) => setBeamVal(e.target.value)}
                                    className="bg-transparent border-none outline-none text-stone-700 w-full"
                                />
                            </div>
                            <div className="md:col-span-2 flex items-center gap-2 text-sm bg-stone-50 p-2 rounded-lg">
                                <label className="font-bold whitespace-nowrap flex-shrink-0" title="No Speech Threshold" style={{ color: colors.text }}>静默(NS):</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={noSpeechVal}
                                    onChange={(e) => setNoSpeechVal(e.target.value)}
                                    className="bg-transparent border-none outline-none text-stone-700 w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons (Styled like TextSubmit.jsx Convert button) */}
            <div className="flex justify-center gap-4 mt-2">
                {uploadMode === 'auto' ? (
                    <div className="flex flex-col items-center">
                        <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" id="auto-upload" />
                        <label
                            htmlFor="auto-upload"
                            className="flex justify-center items-center px-6 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer group min-w-[180px]"
                            style={{
                                backgroundColor: colors.primary,
                                opacity: loading ? 0.6 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading && <Loader2 className="animate-spin mr-2" size={16} />}
                            <span className="tracking-widest uppercase text-sm">
                                {loading ? 'Analyzing...' : 'MP3 ANALYSIS'}
                            </span>
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-4">
                        <input type="file" accept=".mp3" onChange={handleFileChange} className="hidden" id="manual-mp3-upload" />
                        <label
                            htmlFor="manual-mp3-upload"
                            className="flex justify-center items-center px-6 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer group min-w-[160px]"
                            style={{
                                backgroundColor: colors.primary,
                                opacity: loading ? 0.6 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <span className="tracking-widest uppercase text-sm">Upload MP3</span>
                        </label>

                        <input type="file" accept=".json" onChange={handleFileChange} className="hidden" id="manual-json-upload" />
                        <label
                            htmlFor="manual-json-upload"
                            className="flex justify-center items-center px-6 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer group min-w-[160px]"
                            style={{
                                backgroundColor: colors.accent,
                                opacity: loading ? 0.6 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <span className="tracking-widest uppercase text-sm">Upload JSON</span>
                        </label>
                    </div>
                )}
            </div>

            {transcript && (
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl p-4 md:p-6 shadow-xl border border-stone-100 overflow-hidden">
                    <div className="md:px-6 md:pb-6 md:pt-0 border-b"
                        style={{ borderColor: colors.border }}>

                        {/* Desktop: Controls - hidden on mobile */}
                        <div className="hidden md:flex items-center justify-center gap-4 mb-4">
                            <button onClick={() => wavesurfer.current?.playPause()}
                                className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform"
                                style={{ backgroundColor: colors.primary }}>
                                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                            </button>
                            <div className="relative" ref={dropdownRef}>
                                <button onClick={() => setIsRateOpen(!isRateOpen)}
                                    className="flex items-center bg-white/60 px-4 py-2 rounded-full border border-stone-200 shadow-sm gap-2 min-w-[100px] justify-between text-sm font-bold">
                                    <Gauge size={16} /> {playbackRate.toFixed(2)}X
                                </button>
                                {isRateOpen && (
                                    <div
                                        className="absolute bottom-full mb-2 left-0 w-full bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                        {[0.5, 0.75, 1.0, 1.25, 1.5].map(r => (
                                            <div key={r} onClick={() => {
                                                setPlaybackRate(r);
                                                setIsRateOpen(false);
                                            }}
                                                className="px-4 py-2 text-sm cursor-pointer hover:bg-stone-50 text-center">{r.toFixed(2)}X</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setPlaybackRate(1.0)}
                                className="p-2.5 rounded-full border border-stone-200 bg-white/60 text-stone-500 shadow-sm">
                                <RotateCcw size={16} /></button>
                            <button
                                onClick={() => setRepeatMode(!repeatMode)}
                                title={repeatMode ? "取消循环" : "单句循环"}
                                className={`p-2.5 rounded-full border transition-all duration-200 ${repeatMode ? "bg-[#7d8d9c] text-white border-[#7d8d9c] shadow-inner" : "bg-white/60 border-stone-200 text-stone-500 shadow-sm"}`}
                            >
                                <Repeat size={16} className={repeatMode ? "animate-pulse" : ""} />
                            </button>
                        </div>

                        {/* Mobile: 5-button controls */}
                        <div className="md:hidden mb-3">
                            <div className="flex items-center justify-between gap-1">
                                <button
                                    onClick={() => {
                                        if (!wavesurfer.current) return;
                                        const currentIndex = transcript.findIndex(line => currentTime >= line.start && currentTime <= line.end);
                                        const currentLineStart = transcript[currentIndex]?.start || 0;
                                        if (currentTime - currentLineStart > 1.5) {
                                            wavesurfer.current.setTime(currentLineStart);
                                        } else {
                                            const prevIndex = Math.max(0, currentIndex - 1);
                                            wavesurfer.current.setTime(transcript[prevIndex].start);
                                        }
                                        wavesurfer.current.play();
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                                >
                                    <SkipBack size={16} />
                                </button>

                                <button
                                    onClick={() => wavesurfer.current?.playPause()}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                                </button>

                                <button
                                    onClick={() => {
                                        if (!wavesurfer.current) return;
                                        const nextIndex = transcript.findIndex(line => line.start > currentTime);
                                        if (nextIndex !== -1) {
                                            wavesurfer.current.setTime(transcript[nextIndex].start);
                                            wavesurfer.current.play();
                                        }
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                                >
                                    <SkipForward size={16} />
                                </button>

                                <div className="w-px h-8 bg-stone-300"></div>

                                <button
                                    onClick={() => {
                                        const currentIdx = [0.5, 0.75, 1.0, 1.25, 1.5].indexOf(playbackRate);
                                        const newIdx = currentIdx > 0 ? currentIdx - 1 : 0;
                                        setPlaybackRate([0.5, 0.75, 1.0, 1.25, 1.5][newIdx]);
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                                >
                                    <ChevronUp size={18} />
                                </button>

                                <div
                                    onClick={() => setRepeatMode(!repeatMode)}
                                    className={`text-xs font-bold transition-all px-2 py-1 rounded-lg flex items-center justify-center min-w-[40px] ${repeatMode ? "bg-[#7d8d9c] text-white shadow-inner" : "text-stone-600 bg-stone-50"}`}
                                >
                                    {playbackRate.toFixed(2)}
                                </div>

                                <button
                                    onClick={() => {
                                        const currentIdx = [0.5, 0.75, 1.0, 1.25, 1.5].indexOf(playbackRate);
                                        const newIdx = currentIdx < 4 ? currentIdx + 1 : 4;
                                        setPlaybackRate([0.5, 0.75, 1.0, 1.25, 1.5][newIdx]);
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shadow active:scale-90 transition-all"
                                >
                                    <ChevronDown size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Wave */}
                        <div
                            ref={waveformRef}
                            onClick={(e) => {
                                if (!wavesurfer.current) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const percent = x / rect.width;
                                const duration = wavesurfer.current.getDuration();
                                wavesurfer.current.setTime(percent * duration);
                            }}
                            className="mb-4 md:mb-4 rounded-xl md:rounded-2xl overflow-hidden bg-stone-50 p-2 md:p-4"
                        />
                    </div>

                    <div ref={scrollContainerRef} onMouseUp={handleTextSelection}
                        className="flex-1 min-h-0 md:p-4 p-0 overflow-y-auto cursor-text leading-relaxed slim-scroll scroll-smooth"
                    >
                        {transcript.map((line, idx) => {
                            const isLineActive = currentTime >= line.start && currentTime <= line.end;
                            return (
                                <div key={idx} data-index={idx}
                                    onClick={() => {
                                        if (window.getSelection().toString().trim().length > 0) return;
                                        setRepeatMode(false);
                                        wavesurfer.current?.setTime(line.start);
                                        wavesurfer.current?.play();
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-300 cursor-pointer ${isLineActive ? 'shadow-inner' : ''}`}
                                    style={isLineActive ? { backgroundColor: '#e8ddd4' } : {}}>
                                    <div className="flex flex-wrap gap-x-1 text-[15px] leading-relaxed" style={{ color: colors.text, fontFamily: "'Noto Sans JP', sans-serif" }}>
                                        {line.words.map((w, wIdx) => (
                                            <span
                                                key={wIdx}
                                                onClick={() => handleWordClick(w.start)}
                                                className={`px-0 rounded transition-colors text-[15px] cursor-pointer ${currentTime >= w.start && currentTime <= w.end ? 'bg-orange-200 font-bold' : ''}`}
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
