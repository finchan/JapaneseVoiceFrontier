import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, ChevronLeft, Volume2, RotateCcw, CheckCircle, HelpCircle, Eye, EyeOff, Languages, Layout, Edit3, X, Save } from 'lucide-react';
import API_CONFIG from '../config';

const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    accent: '#c4a484',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    success: '#829c7d',
    warning: '#d4c5a4',
    error: '#b05a5a',
    highlight: '#637382',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const splitIntoMoras = (kana) => {
    if (!kana) return [];
    const moras = [];
    
    const iDanHiragana = 'きしちにひみりぎじびぴぢ';
    const iDanKatakana = 'キシチニヒミリギジビピヂ';
    const smallY = /[ゃゅょ]/;
    const smallYKata = /[ャュョ]/;
    const smallVowels = /[ぁぃぅぇぉ]/;
    const smallVowelsKata = /[ァィゥェォ]/;
    
    for (let i = 0; i < kana.length; i++) {
        const char = kana[i];
        
        if (iDanHiragana.includes(char) && i + 1 < kana.length && smallY.test(kana[i + 1])) {
            moras.push(char + kana[i + 1]);
            i++;
        } else if (iDanKatakana.includes(char) && i + 1 < kana.length && smallYKata.test(kana[i + 1])) {
            moras.push(char + kana[i + 1]);
            i++;
        } else if (char === 'ふ' && i + 1 < kana.length && smallVowels.test(kana[i + 1])) {
            moras.push(char + kana[i + 1]);
            i++;
        } else if (char === 'フ' && i + 1 < kana.length && smallVowelsKata.test(kana[i + 1])) {
            moras.push(char + kana[i + 1]);
            i++;
        } else if ((char === 'て' || char === 'で') && i + 1 < kana.length && kana[i + 1] === 'ぃ') {
            moras.push(char + kana[i + 1]);
            i++;
        } else if ((char === 'テ' || char === 'デ') && i + 1 < kana.length && kana[i + 1] === 'ィ') {
            moras.push(char + kana[i + 1]);
            i++;
        } else if ((char === 'う' || char === 'ウ') && i + 1 < kana.length && (smallVowels.test(kana[i + 1]) || smallVowelsKata.test(kana[i + 1]))) {
            moras.push(char + kana[i + 1]);
            i++;
        } else {
            moras.push(char);
        }
    }
    
    return moras;
};

const highlightKana = (text) => {
    if (!text) return text;
    // ga, da, ba rows (voiced)
    const voicedRegex = /[がぎぐげごガギグゲゴだぢづでどダヂヅデドばびぶべぼバビブベボ]/g;
    // ka, ta, pa rows (unvoiced/half-voiced)
    const ktpRegex = /[かきくけこカキクケコたちつてとタチツテトぱぴぷぺぽパピプペポ]/g;

    const parts = [];
    let lastIndex = 0;
    const combinedRegex = new RegExp(`${voicedRegex.source}|${ktpRegex.source}`, 'g');
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
        // Add preceding text
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const char = match[0];
        if (voicedRegex.test(char)) {
            // Voiced: Complementary color (using a subtle orange-brown as complement to primary muted tones)
            parts.push(<span key={match.index} className="font-bold" style={{ color: '#d97706' }}>{char}</span>);
        } else if (ktpRegex.test(char)) {
            // K/T/P: Gray
            parts.push(<span key={match.index} className="font-bold text-stone-400">{char}</span>);
        }
        voicedRegex.lastIndex = 0; // Reset for reuse
        ktpRegex.lastIndex = 0;
        lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
};

const PitchAccent = ({ kana, pitch }) => {
    if (!pitch || !kana) return <div className="text-sm py-1 font-bold">{kana}</div>;

    const patterns = pitch.toString().split(/[/\+]/).map(p => p.trim());
    const moras = splitIntoMoras(kana);

    const renderPattern = (pValStr, pIdx) => {
        const pVal = parseInt(pValStr);
        const levels = moras.map((_, i) => {
            if (pVal === 0) return i > 0;
            if (pVal === 1) return i === 0;
            return i > 0 && i < pVal;
        });

        return (
            <div key={pIdx} className="flex items-center gap-0 relative h-8 px-1">
                {moras.map((m, i) => {
                    const isHigh = levels[i];
                    const nextHigh = i < moras.length - 1 ? levels[i + 1] : isHigh;
                    const moraWidth = m.length > 1 ? 'w-10' : 'w-6';

                    return (
                        <div key={i} className={`relative flex items-center justify-center h-full ${moraWidth}`}>
                            {/* Horizontal Line Segment */}
                            <div
                                className="w-full h-[1px] absolute z-20"
                                style={{
                                    backgroundColor: '#d8b4b4',
                                    top: isHigh ? '2px' : '26px'
                                }}
                            />

                            {/* Vertical Connector */}
                            {i < moras.length - 1 && isHigh !== nextHigh && (
                                <div
                                    className="absolute z-20"
                                    style={{
                                        right: '0px',
                                        width: '1px',
                                        top: '2px',
                                        height: '24px',
                                        backgroundColor: '#d8b4b4'
                                    }}
                                />
                            )}

                            {/* Kana Character */}
                            <span className="text-[14px] z-10 leading-none font-medium" style={{ color: colors.text }}>
                                {highlightKana(m)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-8 mt-4 w-full">
            {patterns.map((p, i) => renderPattern(p, i))}
        </div>
    );
};

const isKanji = (char) => {
    const code = char.charCodeAt(0);
    return code >= 0x4e00 && code <= 0x9faf;
};

const isHiragana = (char) => {
    const code = char.charCodeAt(0);
    return code >= 0x3040 && code <= 0x309f;
};

const isKatakana = (char) => {
    const code = char.charCodeAt(0);
    return code >= 0x30a0 && code <= 0x30ff;
};

const isKana = (char) => isHiragana(char) || isKatakana(char);

const buildFurigana = (kanji, kana) => {
    if (!kanji || kanji === kana) {
        return [{ type: 'text', text: kana }];
    }

    const result = [];
    let kanaIdx = 0;

    let i = 0;
    while (i < kanji.length) {
        const char = kanji[i];

        if (isKanji(char)) {
            let kanjiEnd = i;
            while (kanjiEnd < kanji.length && isKanji(kanji[kanjiEnd])) {
                kanjiEnd++;
            }
            const kanjiBlock = kanji.slice(i, kanjiEnd);

            let okuriganaEnd = kanjiEnd;
            while (okuriganaEnd < kanji.length && isKana(kanji[okuriganaEnd])) {
                okuriganaEnd++;
            }
            const okurigana = kanji.slice(kanjiEnd, okuriganaEnd);

            let furiganaEnd = kana.length;
            if (okurigana.length > 0) {
                for (let j = kanaIdx; j <= kana.length - okurigana.length; j++) {
                    if (kana.slice(j, j + okurigana.length) === okurigana) {
                        furiganaEnd = j;
                        break;
                    }
                }
            }

            const furigana = kana.slice(kanaIdx, furiganaEnd);
            result.push({ type: 'ruby', kanji: kanjiBlock, furigana });
            kanaIdx = furiganaEnd;

            if (okurigana.length > 0) {
                result.push({ type: 'text', text: okurigana });
                kanaIdx += okurigana.length;
            }

            i = okuriganaEnd;
        } else if (isKana(char)) {
            let kanaEnd = i;
            while (kanaEnd < kanji.length && isKana(kanji[kanaEnd])) {
                kanaEnd++;
            }
            const kanaBlock = kanji.slice(i, kanaEnd);
            result.push({ type: 'text', text: kanaBlock });
            kanaIdx += kanaBlock.length;
            i = kanaEnd;
        } else {
            result.push({ type: 'text', text: char });
            i++;
        }
    }

    return result;
};

const Furigana = ({ kanji, kana }) => {
    if (!kanji || kanji === kana) {
        return <span className="text-4xl font-bold" style={{ color: colors.text }}>{kana}</span>;
    }

    const parts = buildFurigana(kanji, kana);

    return (
        <span className="text-4xl font-bold" style={{ color: colors.text }}>
            {parts.map((part, i) => {
                if (part.type === 'text') {
                    return <span key={i}>{part.text}</span>;
                }
                return (
                    <ruby key={i}>
                        <span style={{ color: colors.text }}>{part.kanji}</span>
                        <rt className="text-base font-normal tracking-wider mb-1" style={{ color: colors.textLight }}>
                            {part.furigana}
                        </rt>
                    </ruby>
                );
            })}
        </span>
    );
};

const AutoFitText = ({ children }) => {
    const text = typeof children === 'string' ? children : '';
    const charCount = text.length;
    
    let sizeClass = 'text-7xl';
    if (charCount > 12) {
        sizeClass = 'text-2xl md:text-7xl';
    } else if (charCount > 10) {
        sizeClass = 'text-3xl md:text-7xl';
    } else if (charCount > 8) {
        sizeClass = 'text-4xl md:text-7xl';
    } else if (charCount > 6) {
        sizeClass = 'text-5xl md:text-7xl';
    } else if (charCount > 4) {
        sizeClass = 'text-6xl md:text-7xl';
    }

    return (
        <div 
            className={`font-black tracking-tighter whitespace-nowrap ${sizeClass}`}
            style={{ color: colors.text }}
        >
            {children}
        </div>
    );
};

// ── Components ──────────────────────────────────────────────────────────────

export default function StudySession() {
    const [lessons, setLessons] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [vocabulary, setVocabulary] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [frontMode, setFrontMode] = useState('kanji'); // 'kanji' or 'kana'
    const [loading, setLoading] = useState(false);
    const [editingAudio, setEditingAudio] = useState(null);
    const [slideDirection, setSlideDirection] = useState('right');
    const isDragging = useRef(false);

    const audioRef = useRef(null);

    // Fetch lessons on mount
    useEffect(() => {
        fetchLessons();
    }, []);

    const fetchLessons = async () => {
        try {
            const res = await fetch(API_CONFIG.buildURL('/api/vocab/lessons'));
            const data = await res.json();
            setLessons(data.lessons || []);
        } catch (err) {
            console.error("Failed to fetch lessons", err);
        }
    };

    const fetchVocabulary = async (lessonId) => {
        setLoading(true);
        try {
            const res = await fetch(API_CONFIG.buildURL(`/api/vocab/lessons/${lessonId}/vocabulary`));
            const data = await res.json();
            setVocabulary(data.vocabulary || []);
            setCurrentIndex(0);
            setIsRevealed(false);
        } catch (err) {
            console.error("Failed to fetch vocabulary", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLessonSelect = (id) => {
        setSelectedLesson(id);
        fetchVocabulary(id);
    };

    const currentWord = vocabulary[currentIndex];

    // Auto-play audio on reveal
    useEffect(() => {
        let active = true;
        if (isRevealed && currentWord && currentWord.audio?.length > 0) {
            const playRepeatedly = async () => {
                const manifestId = currentWord.audio[0].id;
                for (let i = 0; i < 3; i++) {
                    if (!active) break;
                    await playAudio(manifestId);
                    if (i < 2 && active) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            };
            playRepeatedly();
        }
        return () => {
            active = false;
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.onended = null;
            }
        };
    }, [isRevealed, currentIndex, currentWord]);

    const playAudio = (manifestId) => {
        return new Promise((resolve) => {
            try {
                const url = API_CONFIG.buildURL(`/api/vocab/audio/stream/${manifestId}?t=${Date.now()}`);
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.onended = null;
                    audioRef.current.onerror = null;
                }
                const audio = new Audio(url);
                audioRef.current = audio;
                
                audio.onended = () => resolve(true);
                audio.onerror = (e) => {
                    console.error("Audio element error", e);
                    resolve(false);
                };
                
                audio.play().catch(err => {
                    console.warn("Audio play interrupted or failed", err);
                    resolve(false);
                });
            } catch (err) {
                console.error("Audio playback error", err);
                resolve(false);
            }
        });
    };

    const touchStart = useRef(null);

    const handleSwipe = (direction) => {
        if (direction === 'left' && currentIndex < vocabulary.length - 1) {
            setSlideDirection('right');
            setCurrentIndex(currentIndex + 1);
            setIsRevealed(false);
        } else if (direction === 'right' && currentIndex > 0) {
            setSlideDirection('left');
            setCurrentIndex(currentIndex - 1);
            setIsRevealed(false);
        }
    };

    const onTouchStart = (e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDragging.current = false;
    };

    const onTouchEnd = (e) => {
        if (!touchStart.current) return;
        const x = e.changedTouches[0].clientX;
        const y = e.changedTouches[0].clientY;
        const deltaX = x - touchStart.current.x;
        const deltaY = y - touchStart.current.y;

        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            isDragging.current = true;
        }

        if (Math.abs(deltaX) > 70) {
            handleSwipe(deltaX > 0 ? 'right' : 'left');
        }
        touchStart.current = null;
    };

    const onMouseDown = (e) => {
        touchStart.current = { x: e.clientX, y: e.clientY };
        isDragging.current = false;
    };

    const onMouseUp = (e) => {
        if (!touchStart.current) return;
        const x = e.clientX;
        const y = e.clientY;
        const deltaX = x - touchStart.current.x;
        const deltaY = y - touchStart.current.y;

        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            isDragging.current = true;
        }

        if (Math.abs(deltaX) > 70) {
            handleSwipe(deltaX > 0 ? 'right' : 'left');
        }
        touchStart.current = null;
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editingAudio) return;
            if (!selectedLesson || vocabulary.length === 0) return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (!isRevealed) setIsRevealed(true);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                if (currentIndex > 0) {
                    setSlideDirection('left');
                    setCurrentIndex(currentIndex - 1);
                    setIsRevealed(false);
                }
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                if (currentIndex < vocabulary.length - 1) {
                    setSlideDirection('right');
                    setCurrentIndex(currentIndex + 1);
                    setIsRevealed(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedLesson, vocabulary.length, currentIndex, isRevealed, editingAudio]);

    const handleSRS = async (quality) => {
        if (!currentWord) return;

        try {
            // Persist progress
            const formData = new FormData();
            formData.append('word_id', currentWord.id);
            formData.append('quality', quality);

            await fetch(API_CONFIG.buildURL('/api/study/record'), {
                method: 'POST',
                body: formData
            });

            // Move to next word
            if (currentIndex < vocabulary.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setIsRevealed(false);
            } else {
                // Session finished
                alert("Session Complete!");
                setSelectedLesson(null);
                setVocabulary([]);
            }
        } catch (err) {
            console.error("SRS update error", err);
        }
    };

    if (!selectedLesson) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen size={24} style={{ color: colors.primary }} />
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: colors.text }}>
                        SELECT A LESSON TO START
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lessons.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => handleLessonSelect(l.id)}
                            className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-400 transition-all text-left flex flex-col gap-2 group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.primary }}>
                                {l.book}
                            </span>
                            <span className="text-lg font-bold group-hover:translate-x-1 transition-transform" style={{ color: colors.text }}>
                                {l.lesson}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (loading) return <div className="text-center py-20">Loading words...</div>;
    if (vocabulary.length === 0) return <div className="text-center py-20">No words found in this lesson.</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setSelectedLesson(null)}
                    className="flex items-center gap-1 text-sm font-bold opacity-70 hover:opacity-100 transition-opacity"
                    style={{ color: colors.text }}
                >
                    <ChevronLeft size={16} /> BACK
                </button>
                <div className="flex-1 mx-6 h-6 bg-stone-100 rounded-full overflow-hidden relative border border-stone-200">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${vocabulary.length > 0 ? ((currentIndex + 1) / vocabulary.length) * 100 : 0}%`,
                            backgroundColor: colors.primary
                        }}
                    />
                    <span
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-wider"
                        style={{ color: colors.text }}
                    >
                        {currentIndex + 1} / {vocabulary.length}
                    </span>
                </div>
            </div>

            {/* Flashcard */}
            <div
                key={currentIndex}
                onClick={() => {
                    if (isDragging.current) return;
                    if (!isRevealed) setIsRevealed(true);
                }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                className={`w-full min-h-[350px] bg-white rounded-[32px] border-2 shadow-xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer ${!isRevealed ? 'border-stone-200' : 'border-stone-100'} animate-in fade-in ${slideDirection === 'right' ? 'slide-in-from-right-16' : 'slide-in-from-left-16'} duration-300`}
                style={{ backgroundColor: colors.white }}
            >
                {!isRevealed ? (
                    <div className="text-center space-y-8">
                        <AutoFitText>
                            {frontMode === 'kanji' ? (currentWord.kanji || currentWord.kana) : currentWord.kana}
                        </AutoFitText>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-between space-y-6 animate-in fade-in duration-300 relative">
                        {/* Audio Edit Icon */}
                        {currentWord.audio?.length > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setEditingAudio(currentWord.audio[0]); }}
                                className="absolute -top-5 -right-5 p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors z-10 shadow-sm"
                                title="Edit Audio Timestamps"
                            >
                                <Edit3 size={12} strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Kana & Kanji */}
                        <div className="text-center space-y-2">
                            <Furigana kanji={currentWord.kanji} kana={currentWord.kana} />
                        </div>

                        {/* Pitch Accent Section */}
                        <div className="w-full flex flex-col items-center">
                            <PitchAccent kana={currentWord.kana} pitch={currentWord.pitch} />
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">
                                Pitch Accent: {currentWord.pitch}
                            </div>
                        </div>

                        {/* Meaning */}
                        <div className="w-full bg-stone-50/50 rounded-2xl p-6 border border-stone-100">
                            <div className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-50" style={{ color: colors.primary }}>
                                MEANING & DEFINITIONS
                            </div>
                            <div className="space-y-3">
                                {currentWord.definitions?.map((d, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 font-bold mt-1" style={{ color: colors.text }}>
                                            {d.pos || 'N'}
                                        </span>
                                        <p className="text-lg font-bold leading-relaxed" style={{ color: colors.text }}>
                                            {d.meaning}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Audio Trigger */}
                        <button
                            onClick={(e) => { e.stopPropagation(); playAudio(currentWord.audio[0]?.id); }}
                            className="p-4 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors group"
                        >
                            <Volume2 size={24} style={{ color: colors.primary }} className="group-active:scale-90 transition-transform" />
                        </button>
                    </div>
                )}
            </div>

            {/* SRS Controls */}
            {isRevealed && (
                <div className="grid grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                    <button
                        onClick={() => handleSRS(1)}
                        className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white border-b-4 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all group"
                    >
                        <RotateCcw size={20} className="text-red-500 group-hover:rotate-[-45deg] transition-transform" />
                        <span className="font-black text-xs tracking-widest text-red-600">AGAIN</span>
                    </button>
                    <button
                        onClick={() => handleSRS(2)}
                        className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white border-b-4 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all group"
                    >
                        <HelpCircle size={20} className="text-yellow-600 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-xs tracking-widest text-yellow-700">HARD</span>
                    </button>
                    <button
                        onClick={() => handleSRS(3)}
                        className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white border-b-4 border-green-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                    >
                        <CheckCircle size={20} className="text-green-600 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-xs tracking-widest text-green-700">GOOD</span>
                    </button>
                </div>
            )}

            {/* Bottom Toggle */}
            <div className="flex justify-center">
                <button
                    onClick={() => setFrontMode(frontMode === 'kanji' ? 'kana' : 'kanji')}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/50 border border-stone-200 hover:bg-white hover:shadow-sm transition-all text-[10px] font-black uppercase tracking-widest"
                    style={{ color: colors.primary }}
                >
                    {frontMode === 'kanji' ? <Eye size={14} /> : <EyeOff size={14} />}
                    FRONT: {frontMode}
                </button>
            </div>

            {/* Audio Editor Modal */}
            {editingAudio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-4" onClick={(e) => { e.stopPropagation(); setEditingAudio(null); }}>
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-stone-700">EDIT AUDIO SLICE</h3>
                            <button onClick={() => setEditingAudio(null)} className="text-stone-400 hover:text-stone-600 p-1"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">START (ms)</label>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const input = document.getElementById('edit-start');
                                            input.value = Math.max(0, parseInt(input.value || 0) - 100);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-lg transition-colors flex items-center justify-center"
                                    >−</button>
                                    <input 
                                        id="edit-start"
                                        type="number" 
                                        defaultValue={editingAudio.start} 
                                        className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 font-mono text-stone-700 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all text-center"
                                    />
                                    <button 
                                        onClick={() => {
                                            const input = document.getElementById('edit-start');
                                            const endInput = document.getElementById('edit-end');
                                            const maxVal = parseInt(endInput.value || editingAudio.end);
                                            input.value = Math.min(maxVal - 100, parseInt(input.value || 0) + 100);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-lg transition-colors flex items-center justify-center"
                                    >+</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">END (ms)</label>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const input = document.getElementById('edit-end');
                                            const startInput = document.getElementById('edit-start');
                                            const minVal = parseInt(startInput.value || editingAudio.start);
                                            input.value = Math.max(minVal + 100, parseInt(input.value || 0) - 100);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-lg transition-colors flex items-center justify-center"
                                    >−</button>
                                    <input 
                                        id="edit-end"
                                        type="number" 
                                        defaultValue={editingAudio.end} 
                                        className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 font-mono text-stone-700 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all text-center"
                                    />
                                    <button 
                                        onClick={() => {
                                            const input = document.getElementById('edit-end');
                                            input.value = parseInt(input.value || 0) + 100;
                                        }}
                                        className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-lg transition-colors flex items-center justify-center"
                                    >+</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-8 gap-3">
                            <button onClick={() => setEditingAudio(null)} className="px-5 py-2 rounded-full font-bold text-stone-500 hover:bg-stone-100 transition-colors text-sm">CANCEL</button>
                            <button 
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const newStart = parseInt(document.getElementById('edit-start').value);
                                    const newEnd = parseInt(document.getElementById('edit-end').value);
                                    if (newStart >= 0 && newEnd > newStart) {
                                        try {
                                            const fd = new FormData();
                                            fd.append('start_ms', newStart.toString());
                                            fd.append('end_ms', newEnd.toString());
                                            
                                            const res = await fetch(API_CONFIG.buildURL(`/api/vocab/audio/${editingAudio.id}`), {
                                                method: 'PUT',
                                                body: fd
                                            });
                                            if(res.ok) {
                                                // Mutate local state so next play immediately uses new slice
                                                editingAudio.start = newStart;
                                                editingAudio.end = newEnd;
                                                setEditingAudio(null);
                                            }
                                        } catch(err) {
                                            console.error("Failed to update audio timestamps", err);
                                        }
                                    }
                                }}
                                className="px-5 py-2 rounded-full font-bold bg-red-500 text-white hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                            >
                                <Save size={16} /> SAVE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
