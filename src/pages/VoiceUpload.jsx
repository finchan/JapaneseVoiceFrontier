import React, {useEffect, useRef, useState} from 'react';
import WaveSurfer from 'wavesurfer.js';
import {Play, Pause, Upload, Loader2, RotateCcw, Gauge} from 'lucide-react';
import WordLookup, {WordLookupPanel} from '../components/WordLookup';
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

export default function VoiceUpload() {
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

    const {lookup, hideLookup, inflectionMode, toggleMode, fetchDictionaryData, handleTextSelection, getMoraList, parseAccentPattern} = WordLookup();

    const lastScrollIndex = useRef(-1);

    const scrollToLine = (index) => {
        const container = scrollContainerRef.current;
        if (!container || !transcript) return;
        const activeElement = container.querySelector(`[data-index="${index}"]`);
        if (activeElement && index !== lastScrollIndex.current) {
            activeElement.scrollIntoView({behavior: 'smooth', block: 'center'});
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
                        wavesurfer.current.setTime(transcript[nextIndex].start);
                        wavesurfer.current.play();
                    }
                    break;

                case 'ArrowLeft':
                    // 左键：重听本句或跳转到上一句
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

        // Cleanup previous state
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (wavesurfer.current) {
            wavesurfer.current.destroy();
            wavesurfer.current = null;
        }
        setTranscript(null);
        setCurrentTime(0);

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        const currentRole = localStorage.getItem('user_role') || 'guest';
        formData.append("role", currentRole);
        try {
            const response = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.transcribe), {method: "POST", body: formData});
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            const result = await response.json();
            const transcriptData = result.data || result;
            if (!Array.isArray(transcriptData)) {
                throw new Error("Invalid response format");
            }
            setAudioUrl(URL.createObjectURL(file));
            setTranscript(transcriptData);
        } catch (err) {
            console.error("Transcription error:", err);
            alert("识别失败，请重试");
        } finally {
            setLoading(false);
        }
    };


    const initWavesurfer = (url) => {
        if (wavesurfer.current) return; // Guard against double init
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

            <div className="flex items-center justify-center rounded-full p-2 text-sm"
                 style={{padding: '15px', height: '80px', borderColor: colors.border, background: 'radial-gradient(circle at center, #e8e4df 0%, #dce4e8 100%)'}}>
                因为我的Centos服务器的内存只有2GB，运行服务器离线Whisper Medium模型借助硬盘处理，所以处理处理比较慢，同时因为服务器计算种类不支持int16，只可以用int8，识别日语汉字不多（int16可以识别转换更多汉字）。建议在本机安装Whisper Medium模型，这里假设本机安装Whisper Medium模型。可以从这里下载本地处理工具。工具不会固定使用日语限定，可以随意指定处理语言。
            </div>

            <div className="flex items-center justify-center border-2 border-dashed rounded-full p-2 gap-3"
                 style={{borderColor: colors.border, background: 'radial-gradient(circle at center, #e8e4df 0%, #dce4e8 100%)'}}>

                <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" id="audio-upload"/>
                <label htmlFor="audio-upload" className="cursor-pointer flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" style={{color: colors.primary}}/> :
                        <Upload size={16} style={{color: colors.textLight}}/>}
                    <span className="font-bold text-stone-900 text-large">UPLOAD MP3</span>
                </label>
            </div>

            {transcript && (
                <div className="rounded-3xl shadow-lg bg-white">
                    <div className="p-6 border-b"
                         style={{backgroundColor: colors.primaryLight, borderColor: colors.border}}>
                        <div ref={waveformRef} className="mb-4"/>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => wavesurfer.current?.playPause()}
                                    className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform"
                                    style={{backgroundColor: colors.primary}}>
                                {isPlaying ? <Pause size={28}/> : <Play size={28} className="ml-1"/>}
                            </button>
                            <div className="relative" ref={dropdownRef}>
                                <button onClick={() => setIsRateOpen(!isRateOpen)}
                                        className="flex items-center bg-white/60 px-4 py-2 rounded-full border border-stone-200 shadow-sm gap-2 min-w-[100px] justify-between text-sm font-bold">
                                    <Gauge size={16}/> {playbackRate.toFixed(2)}X
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
                                <RotateCcw size={16}/></button>
                        </div>
                    </div>

                    <div ref={scrollContainerRef} onMouseUp={handleTextSelection}
                         className="p-4 overflow-y-auto cursor-text leading-relaxed slim-scroll scroll-smooth"
                         style={{maxHeight: '500px'}}>
                        {transcript.map((line, idx) => {
                            const isLineActive = currentTime >= line.start && currentTime <= line.end;
                            return (
                                <div key={idx} data-index={idx}
                                     className={`p-2 rounded-lg transition-all duration-300 ${isLineActive ? 'shadow-inner' : ''}`}
                                     style={isLineActive ? { backgroundColor: '#e8ddd4' } : {}}>
                                    <div className="flex flex-wrap gap-x-1 text-base leading-relaxed" style={{ color: colors.text, fontFamily: "'Noto Sans JP', sans-serif" }}>
                                        {line.words.map((w, wIdx) => (
                                            <span
                                                key={wIdx}
                                                onClick={() => handleWordClick(w.start)}
                                                className={`px-0 rounded transition-colors text-base cursor-pointer ${currentTime >= w.start && currentTime <= w.end ? 'bg-orange-200 font-bold' : ''}`}
                                                style={{color: colors.text}}
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