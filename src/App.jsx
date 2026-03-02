import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Upload, Loader2, Music } from 'lucide-react';

function App() {
    const waveformRef = useRef(null);
    const wavesurfer = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [audioUrl, setAudioUrl] = useState(null);

    // 核心修复：使用 useEffect 监听 transcript 和容器状态
    // 只有当 DOM 节点渲染出来后，才初始化 WaveSurfer
    useEffect(() => {
        if (transcript && waveformRef.current && audioUrl && !wavesurfer.current) {
            initWavesurfer(audioUrl);
        }

        // 组件卸载时销毁实例
        return () => {
            if (wavesurfer.current) {
                wavesurfer.current.destroy();
                wavesurfer.current = null;
            }
        };
    }, [transcript, audioUrl]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setLoading(true);
        setTranscript(null);
        setIsPlaying(false);

        // 销毁旧实例以准备新上传
        if (wavesurfer.current) {
            wavesurfer.current.destroy();
            wavesurfer.current = null;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:8000/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorDetail = await response.json();
                throw new Error(errorDetail.error || "服务器响应错误");
            }

            const result = await response.json();

            // 设置音频 URL 和数据，触发 useEffect 初始化波形
            const url = URL.createObjectURL(file);
            setAudioUrl(url);
            setTranscript(result.data || result);

        } catch (error) {
            console.error("上传失败:", error);
            alert(`识别失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const initWavesurfer = (url) => {
        if (!waveformRef.current) return;

        try {
            wavesurfer.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#e2e8f0',
                progressColor: '#3b82f6',
                cursorColor: '#3b82f6',
                barWidth: 2,
                barGap: 3,
                barRadius: 3,
                height: 80,
                normalize: true,
            });

            wavesurfer.current.load(url);

            wavesurfer.current.on('audioprocess', (time) => setCurrentTime(time));
            wavesurfer.current.on('play', () => setIsPlaying(true));
            wavesurfer.current.on('pause', () => setIsPlaying(false));
            wavesurfer.current.on('finish', () => setIsPlaying(false));
        } catch (err) {
            console.error("WaveSurfer 初始化失败:", err);
        }
    };

    const handleWordClick = (startTime) => {
        if (wavesurfer.current) {
            wavesurfer.current.setTime(startTime);
            wavesurfer.current.play();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">日语听力同步助手</h1>
                    <p className="text-slate-500 mt-2">上传音频，AI 自动生成带时间戳的日文高亮文本</p>
                </div>

                <div className={`flex flex-col items-center justify-center border-2 border-dashed transition-colors rounded-2xl p-10 bg-white ${loading ? 'border-blue-400' : 'border-slate-300 hover:border-blue-400'}`}>
                    <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" id="audio-upload" disabled={loading} />
                    <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center w-full">
                        {loading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="animate-spin text-blue-500 w-12 h-12 mb-4" />
                                <p className="text-blue-600 font-semibold text-lg">AI 正在努力听力并分词中...</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-blue-50 p-4 rounded-full mb-4">
                                    <Upload className="text-blue-600 w-8 h-8" />
                                </div>
                                <span className="text-slate-700 font-medium text-lg">点击上传音频文件</span>
                            </>
                        )}
                    </label>
                </div>

                {transcript && (
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-3 mb-4 text-slate-600">
                                <Music className="w-4 h-4" />
                                <span className="text-sm font-medium truncate">{fileName}</span>
                            </div>
                            <div ref={waveformRef} className="mb-6" />
                            <div className="flex justify-center">
                                <button
                                    onClick={() => wavesurfer.current?.playPause()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white w-16 h-16 flex items-center justify-center rounded-full shadow-lg"
                                >
                                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
                                </button>
                            </div>
                        </div>

                        <div className="p-8 max-h-[500px] overflow-y-auto space-y-6">
                            {transcript.map((line, idx) => (
                                <div key={idx} className={`p-4 rounded-xl transition-all ${currentTime >= line.start && currentTime <= line.end ? 'bg-blue-50/80' : ''}`}>
                                    <div className="flex flex-wrap gap-x-1 gap-y-2">
                                        {line.words.map((w, wIdx) => (
                                            <span
                                                key={wIdx}
                                                onClick={() => handleWordClick(w.start)}
                                                className={`cursor-pointer px-1 rounded-md text-xl transition-all ${
                                                    currentTime >= w.start && currentTime <= w.end
                                                        ? 'bg-yellow-300 text-slate-900 font-bold scale-110 shadow-sm'
                                                        : 'text-slate-600 hover:text-blue-600'
                                                }`}
                                            >
                                                {w.word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;