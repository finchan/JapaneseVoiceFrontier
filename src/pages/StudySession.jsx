import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BookOpen, ChevronLeft, Volume2, RotateCcw, CheckCircle, HelpCircle, Eye, EyeOff, Languages, Layout, Edit3, X, Save, Trash2, Settings } from 'lucide-react';
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
    // ga, da, ba, za rows (voiced)
    const voicedRegex = /[がぎぐげごガギグゲゴだぢづでどダヂヅデドばびぶべぼバビブベボざじずぜぞザジズゼゾ]/g;
    // ka, ta, pa, sa rows (unvoiced/half-voiced)
    const ktpRegex = /[かきくけこカキクケコたちつてとタチツテトぱぴぷぺぽパピプペポさしすせそサシスセソ]/g;

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
            parts.push(<span key={match.index} style={{ color: '#d97706' }}>{char}</span>);
        } else if (ktpRegex.test(char)) {
            // K/T/P: Gray
            parts.push(<span key={match.index} className="text-stone-400">{char}</span>);
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

const SRSButton = ({ label, icon: Icon, color, tooltip, onClick, quality }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isTouchPressing, setIsTouchPressing] = useState(false);
    const lastTouchTimeRef = useRef(0);
    const timerRef = useRef(null);

    // Mobile: Hold to confirm (2s)
    const handleTouchStart = (e) => {
        lastTouchTimeRef.current = Date.now();
        setIsTouchPressing(true);
        setIsHovered(false);
        // Start the 2s timer
        timerRef.current = setTimeout(() => {
            setIsTouchPressing(false);
            onClick(quality);
        }, 2000);
    };

    const handleTouchEnd = (e) => {
        lastTouchTimeRef.current = Date.now();
        setIsTouchPressing(false);
        setIsHovered(false);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleMouseClick = (e) => {
        // Suppress clicks that happen too close to a touch event (Ghost Clicks)
        const now = Date.now();
        if (now - lastTouchTimeRef.current < 500) {
            return;
        }
        onClick(quality);
    };

    // Color mapping utilities
    const colorMap = {
        red: { bg: 'bg-red-500', text: 'text-red-500', label: 'text-red-600' },
        amber: { bg: 'bg-amber-500', text: 'text-amber-600', label: 'text-amber-700' },
        green: { bg: 'bg-green-500', text: 'text-green-600', label: 'text-green-700' }
    };
    const c = colorMap[color] || colorMap.red;

    const isActive = isHovered || isTouchPressing;

    return (
        <div className="relative group">
            <button
                // Desktop: Hover triggers quick fill, click triggers action
                onMouseEnter={() => {
                    if (Date.now() - lastTouchTimeRef.current > 500) setIsHovered(true);
                }}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleMouseClick}

                // Mobile: Hold to trigger action automatically
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}

                className="relative w-16 h-16 rounded-full overflow-hidden bg-white border border-stone-100 shadow-sm flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-110 active:scale-95 touch-none"
            >
                {/* Liquid Fill Effect - Selective duration */}
                <div
                    className={`absolute bottom-0 left-0 w-full ${c.bg} transition-all ease-linear`}
                    style={{
                        height: isActive ? '100%' : '0%',
                        transitionDuration: isTouchPressing ? '2000ms' : '200ms'
                    }}
                />

                {/* Content - Icons/Text with color transition */}
                <Icon size={18} className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-white' : c.text}`} />
                <span className={`relative z-10 font-black text-[9px] tracking-widest transition-colors duration-300 mt-0.5 ${isActive ? 'text-white' : c.label}`}>
                    {label}
                </span>
            </button>

            {/* Tooltip - Floating Above (Shows on isActive) */}
            <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-300 bg-stone-800 text-white text-[10px] px-2.5 py-1 rounded-md shadow-xl pointer-events-none whitespace-nowrap z-[60] 
                ${isActive ? 'opacity-100 -top-12' : 'opacity-0 -top-8'}`}>
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
            </div>
        </div>
    );
};

const PitchAccent = ({ kana, pitch }) => {
    // If pitch is null or not provided, hide the accent entirely
    if (pitch === null || pitch === undefined || pitch === '' || !kana) return null;

    // Remove non-kana characters (like 〜) before processing moras
    const cleanKana = kana.replace(/[^\u3040-\u309F\u30A0-\u30FF]/g, '');
    const moras = splitIntoMoras(cleanKana);

    const parsePitchPattern = (patternStr) => {
        const parts = patternStr.split('+').map(p => p.trim());
        const segments = [];

        for (const part of parts) {
            const match = part.match(/^(\d+)\[(\d+)\]$/);
            if (match) {
                segments.push({
                    pitchValue: parseInt(match[1]),
                    moraCount: parseInt(match[2])
                });
            }
        }

        if (segments.length === 0) {
            const pVal = parseInt(patternStr);
            if (!isNaN(pVal)) {
                return [{ pitchValue: pVal, moraCount: moras.length }];
            }
            return null;
        }

        return segments;
    };

    const computeLevels = (segments) => {
        const levels = [];
        let moraIndex = 0;

        for (const seg of segments) {
            const { pitchValue, moraCount } = seg;

            for (let i = 0; i < moraCount && moraIndex < moras.length; i++) {
                const localIdx = i;
                let isHigh;

                if (pitchValue === 0) {
                    isHigh = localIdx > 0;
                } else if (pitchValue === 1) {
                    isHigh = localIdx === 0;
                } else {
                    isHigh = localIdx > 0 && localIdx < pitchValue;
                }

                levels.push(isHigh);
                moraIndex++;
            }
        }

        while (levels.length < moras.length) {
            const lastSeg = segments[segments.length - 1];
            if (lastSeg && lastSeg.pitchValue === 0) {
                levels.push(true);
            } else {
                levels.push(false);
            }
        }

        return levels;
    };

    const patterns = pitch.toString().split('/').map(p => p.trim());
    const parsedPatterns = patterns.map(parsePitchPattern).filter(Boolean);

    const renderPattern = (segments, pIdx) => {
        const levels = computeLevels(segments);

        return (
            <div key={pIdx} className="flex items-center gap-0 relative h-8 px-1">
                {moras.map((m, i) => {
                    const isHigh = levels[i];
                    const nextHigh = i < moras.length - 1 ? levels[i + 1] : isHigh;
                    const moraWidth = m.length > 1 ? 'w-10' : 'w-6';

                    return (
                        <div key={i} className={`relative flex items-center justify-center h-full ${moraWidth}`}>
                            <div
                                className="w-full h-[1px] absolute z-20"
                                style={{
                                    backgroundColor: '#d8b4b4',
                                    top: isHigh ? '2px' : '26px'
                                }}
                            />

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

                            <span className="text-[13px] z-10 leading-none font-medium" style={{ color: colors.text }}>
                                {highlightKana(m)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-8 w-full">
            {parsedPatterns.map((segments, i) => renderPattern(segments, i))}
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
            // It's a symbol or space (like 〜, ・, !, ( ))
            result.push({ type: 'text', text: char });
            // If the kana also has this identical symbol at the current position, advance kanaIdx
            if (kanaIdx < kana.length && kana[kanaIdx] === char) {
                kanaIdx++;
            }
            i++;
        }
    }

    return result;
};

const Furigana = ({ kanji, kana }) => {
    const text = kanji || kana || '';
    const charCount = text.length;

    // Dynamic Font Sizing for revealed view (back side)
    let sizeClass = 'text-4xl';
    if (charCount > 10) {
        sizeClass = 'text-2xl sm:text-4xl';
    } else if (charCount > 8) {
        sizeClass = 'text-3xl sm:text-4xl';
    }

    if (!kanji || kanji === kana) {
        return <span className={`${sizeClass} font-bold whitespace-nowrap`} style={{ color: colors.text }}>{highlightKana(kana)}</span>;
    }

    const parts = buildFurigana(kanji, kana);

    return (
        <span className={`${sizeClass} font-bold whitespace-nowrap inline-flex items-end justify-center text-center`} style={{ color: colors.text }}>
            {parts.map((part, i) => {
                if (part.type === 'text') {
                    return <span key={i} className="leading-none">{highlightKana(part.text)}</span>;
                }
                return (
                    <ruby key={i} className="leading-none">
                        <span style={{ color: colors.text }}>{part.kanji}</span>
                        <rt className="text-[12px] sm:text-base font-bold tracking-wider mb-1" style={{ color: colors.textLight, fontWeight: 700 }}>
                            {highlightKana(part.furigana)}
                        </rt>
                    </ruby>
                );
            })}
        </span>
    );
};

const AutoFitText = ({ children, className = "", style = {} }) => {
    const containerRef = useRef(null);
    const textRef = useRef(null);
    const [fontSize, setFontSize] = useState(72);

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    React.useLayoutEffect(() => {
        if (!isDesktop || !containerRef.current || !textRef.current) return;

        // Reset to exactly 72px baseline
        const baseSize = 72;
        setFontSize(baseSize);
        textRef.current.style.fontSize = `${baseSize}px`;

        const text = typeof children === 'string' ? children : '';
        const charCount = text.length;

        // HARD PROTECTION: If word length is within our "gold boundary" (9 chars),
        // we force 72px and skip all measurement/scaling logic.
        if (charCount > 0 && charCount <= 9) {
            setFontSize(baseSize);
            return;
        }

        const adjust = () => {
            const containerWidth = containerRef.current.clientWidth - 4; // Minimal safety margin
            const textWidth = textRef.current.scrollWidth;

            // Only scale down if it is CLEARLY overflowing
            if (textWidth > containerWidth && textWidth > 0) {
                const ratio = containerWidth / textWidth;
                const newSize = Math.floor(baseSize * ratio);
                setFontSize(Math.max(20, newSize));
            } else {
                setFontSize(baseSize);
            }
        };

        // Use requestAnimationFrame to ensure we measure AFTER the browser layout is stable
        const rafid = requestAnimationFrame(adjust);
        return () => cancelAnimationFrame(rafid);
    }, [children, isDesktop]);

    // Mobile stepping logic (Enlarged)
    const charCount = (typeof children === 'string' ? children : '').length;
    let responsiveClass = 'text-6xl sm:text-7xl';
    if (!isDesktop) {
        if (charCount > 10) responsiveClass = 'text-3xl';
        else if (charCount > 8) responsiveClass = 'text-4xl';
        else if (charCount > 6) responsiveClass = 'text-5xl';
        else if (charCount > 4) responsiveClass = 'text-6xl';
        else responsiveClass = 'text-7xl'; // 1-4 chars get maximum impact
    }

    return (
        <div
            ref={containerRef}
            className={`w-full h-full flex items-center justify-center overflow-hidden py-1 ${className}`}
            style={style}
        >
            <div
                ref={textRef}
                className={`font-black tracking-tighter whitespace-nowrap leading-none ${!isDesktop ? responsiveClass : ''}`}
                style={{ 
                    fontSize: isDesktop ? `${fontSize}px` : undefined,
                    color: colors.text
                }}
            >
                {typeof children === 'string' ? highlightKana(children) : children}
            </div>
        </div>
    );
};

const ExampleSentenceCard = ({ ex, idx, onEdit, onDelete }) => {
    const [showControls, setShowControls] = useState(false);
    const cardRef = useRef(null);

    // Click outside to close mobile controls
    useEffect(() => {
        if (!showControls) return;

        const handleClickOutside = (event) => {
            if (cardRef.current && !cardRef.current.contains(event.target)) {
                setShowControls(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showControls]);

    return (
        <div ref={cardRef} className="w-full bg-white/50 border border-stone-100/50 rounded-2xl p-4 sm:p-5 space-y-4 hover:bg-white/80 transition-all group/sentence shadow-sm overflow-hidden relative">
            {/* Management Icons - Top Right (Circular & Isolated Hover) */}
            <div className={`absolute top-4 right-4 flex gap-2 transition-all duration-300 z-10 
                ${showControls ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'} 
                sm:opacity-0 group-hover/sentence:opacity-100 sm:translate-y-0 sm:scale-100 sm:pointer-events-auto`}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(ex, idx); }}
                    className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-all shadow-sm flex items-center justify-center border border-stone-100/50"
                    title="Edit Sentence"
                >
                    <Edit3 size={12} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(ex, idx); }}
                    className="w-8 h-8 rounded-full bg-red-50/80 backdrop-blur-sm text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center border border-red-100/50"
                    title="Delete Sentence"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Mobile Toggle Button - Bottom Right */}
            <div className="absolute bottom-1 right-1 sm:hidden z-10 opacity-40 active:opacity-100 transition-opacity mb-0">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowControls(!showControls); }}
                    className={`p-1.5 rounded-full transition-all shadow-sm flex items-center justify-center ${showControls ? 'bg-stone-700 text-white rotate-90 opacity-100' : 'bg-stone-100 text-stone-400'}`}
                >
                    <Settings size={11} />
                </button>
            </div>

            {ex.image && (
                <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-stone-100 shadow-sm bg-stone-50">
                    <img
                        src={API_CONFIG.buildURL(`/${ex.image}`)}
                        alt="Context"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => e.target.parentNode.style.display = 'none'}
                    />
                </div>
            )}
            <div className="w-full space-y-3">
                <div className="flex items-start justify-between gap-4 mb-0">
                    <div
                        className={`text-[14px] font-medium leading-[1.8] tracking-wide flex-1 ${ex.audio ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                        style={{ color: colors.text }}
                        onClick={(e) => {
                            if (ex.audio) {
                                e.stopPropagation();
                                const a = new Audio(API_CONFIG.buildURL(`/${ex.audio}`));
                                a.play();
                            }
                        }}
                    >
                        {renderFurigana(ex.ja)}
                    </div>
                </div>
                <p className="text-[12px] font-normal leading-relaxed opacity-60 border-t border-stone-100/50 pt-1 mt-0" style={{ color: colors.textLight }}>
                    {ex.en}
                </p>
            </div>
        </div>
    );
};

const JLPTExampleCard = ({ ex }) => {
    return (
        <div className="w-full bg-white/30 border border-stone-100/30 rounded-2xl p-4 sm:p-5 space-y-4 hover:bg-white/60 transition-all group shadow-sm overflow-hidden relative">
            <div className="w-full space-y-3">
                <div className="flex items-start justify-between gap-4 mb-0">
                    <div className="text-[14px] font-medium leading-[1.8] tracking-wide flex-1" style={{ color: colors.text }} dangerouslySetInnerHTML={{ __html: formatJLPTSentence(ex.ja) }}>
                    </div>
                </div>
                <p className="text-[12px] font-normal leading-relaxed opacity-60 border-t border-stone-100/50 pt-1 mt-0" style={{ color: colors.textLight }}>
                    {ex.en}
                </p>
            </div>
        </div>
    );
};

const formatJLPTSentence = (text) => {
    if (!text) return "";

    // Replace Word[Reading] with <ruby>
    // Note: We exclude < and > from the word part to avoid capturing tags like <b>
    // which leads to broken HTML when the tag surrounds the Word[Reading] pattern.
    let formatted = text.replace(/([^\[\s<>]+)\[([^\]\s]+)\]/g, (match, word, reading) => {
        return `<ruby>${word}<rt class="text-[10px] opacity-60 font-medium">${reading}</rt></ruby>`;
    });

    return formatted;
};

const ExampleSentencesSection = ({ examples, onEdit, onDelete }) => {
    if (!examples || !examples.length) return null;

    return (
        <div className="w-full mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-700">
            <div className="space-y-4">
                {examples.map((ex, idx) => (
                    <ExampleSentenceCard key={idx} ex={ex} idx={idx} onEdit={onEdit} onDelete={onDelete} />
                ))}
            </div>
        </div>
    );
};

const JLPTExampleSection = ({ examples }) => {
    if (!examples || !examples.length) return null;

    return (
        <div className="w-full mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-700">
            <div className="space-y-4">
                {examples.map((ex, idx) => (
                    <JLPTExampleCard key={`jlpt-${idx}`} ex={ex} />
                ))}
            </div>
        </div>
    );
};

const renderFurigana = (text) => {
    if (!text) return null;

    // Pattern: Text[Furigana]
    // We split by this pattern: (.*?\[.*?\])
    const parts = text.split(/(\S+?\[.+?\])/g);

    return parts.map((part, i) => {
        const match = part.match(/^(\S+?)\[(.+?)\]$/);
        if (match) {
            return (
                <ruby key={i}>
                    {match[1]}
                    <rt className="text-[10px] opacity-60 font-medium">{match[2]}</rt>
                </ruby>
            );
        }
        return <span key={i}>{part}</span>;
    });
};

// ── Components ──────────────────────────────────────────────────────────────

export default function StudySession({ jlptStudyParams = null, onClearJLPT = null }) {
    const [lessons, setLessons] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [vocabulary, setVocabulary] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [frontMode, setFrontMode] = useState('kanji'); // 'kanji' or 'kana'
    const [loading, setLoading] = useState(false);
    const [editingAudio, setEditingAudio] = useState(null);
    const [editingSentence, setEditingSentence] = useState(null); // { sentence, index }
    const [slideDirection, setSlideDirection] = useState('right');
    const isDragging = useRef(false);

    const audioRef = useRef(null);
    const audioCache = useRef(new Map()); // Map<id, { objectUrl, updatedAt }>

    // Handle JLPT Study Initialization
    useEffect(() => {
        if (jlptStudyParams && jlptStudyParams.words) {
            // Transform JLPT words to SRS format
            const transformed = jlptStudyParams.words.map(w => ({
                id: `jlpt-${w.anki_note_id}`,
                kanji: w.kanji,
                kana: w.kana,
                definitions: [{ meaning: w.definition, pos: w.pos || 'N' }],
                // Include direct URL for JLPT audio
                audio: w.audio_url ? [{ id: `jlpt-${w.anki_note_id}`, url: w.audio_url }] : [],
                // Match the field names expected by JLPTExampleCard
                jlpt_sentences: (w.sentences || []).map(s => ({ ja: s.sentence_jp, en: s.sentence_cn })),
                examples: [],
                pitch: w.pitch_accent
            }));
            
            setVocabulary(transformed);
            setCurrentIndex(0);
            setIsRevealed(false);
            setSelectedLesson(null); // Clear selected lesson
        }
    }, [jlptStudyParams]);

    // Fetch lessons on mount (only if not doing JLPT study)
    useEffect(() => {
        if (!jlptStudyParams) {
            fetchLessons();
        }
    }, [jlptStudyParams]);

    // Lock body scroll when modals are open
    useEffect(() => {
        if (editingAudio || editingSentence) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [editingAudio, editingSentence]);

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
                    await playAudio(currentWord.audio[0]);
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

    const playAudio = async (audioManifest) => {
        if (!audioManifest) return;
        const { id, updated_at, url } = audioManifest;

        return new Promise(async (resolve) => {
            try {
                let playUrl;

                if (url) {
                    // Direct URL (JLPT)
                    playUrl = url;
                } else {
                    // Standard relative path with cache logic (Lessons)
                    let cached = audioCache.current.get(id);
                    if (cached && cached.updatedAt !== updated_at) {
                        URL.revokeObjectURL(cached.objectUrl);
                        cached = null;
                    }

                    if (!cached) {
                        const fetchUrl = API_CONFIG.buildURL(`/api/vocab/audio/stream/${id}?v=${encodeURIComponent(updated_at || '')}`);
                        const response = await fetch(fetchUrl);
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);

                        audioCache.current.set(id, { objectUrl, updatedAt: updated_at });
                        playUrl = objectUrl;
                    } else {
                        playUrl = cached.objectUrl;
                    }
                }

                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.onended = null;
                    audioRef.current.onerror = null;
                }

                const audio = new Audio(playUrl);
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
            if (editingAudio || editingSentence) return;
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
    }, [selectedLesson, vocabulary.length, currentIndex, isRevealed, editingAudio, editingSentence]);

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

    if (!selectedLesson && !jlptStudyParams) {
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
    if (vocabulary.length === 0) return <div className="text-center py-20">No words found.</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={() => {
                        if (jlptStudyParams) {
                            onClearJLPT && onClearJLPT();
                        } else {
                            setSelectedLesson(null);
                        }
                    }}
                    className="flex shrink-0 items-center gap-1 text-sm font-bold opacity-70 hover:opacity-100 transition-opacity"
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

            {/* SRS Controls (Always visible above the card) */}
            {(() => {
                const reps = currentWord.reps || 0;
                const interval = currentWord.interval || 0;
                const ease = currentWord.ease || 2.5;

                const getNext = (q) => {
                    if (q === 1) return "1m";
                    if (q === 2) return (reps === 0 ? 1 : Math.max(1, Math.floor(interval * 1.2))) + "d";
                    if (q === 3) {
                        if (reps === 0) return "1d";
                        if (reps === 1) return "4d";
                        return Math.floor(interval * ease) + "d";
                    }
                    return "-";
                };

                return (
                    <div className="flex items-center justify-between mb-3 px-2">
                        <SRSButton
                            key={`again-${currentWord.id}`}
                            label="AGAIN"
                            icon={RotateCcw}
                            color="red"
                            tooltip={`Review Again (${getNext(1)})`}
                            onClick={handleSRS}
                            quality={1}
                        />
                        <SRSButton
                            key={`hard-${currentWord.id}`}
                            label="HARD"
                            icon={HelpCircle}
                            color="amber"
                            tooltip={`Review in ${getNext(2)}`}
                            onClick={handleSRS}
                            quality={2}
                        />
                        <SRSButton
                            key={`good-${currentWord.id}`}
                            label="GOOD"
                            icon={CheckCircle}
                            color="green"
                            tooltip={`Review in ${getNext(3)}`}
                            onClick={handleSRS}
                            quality={3}
                        />
                    </div>
                );
            })()}



            {/* Flashcard Deck (Phantom Layers for Depth) */}
            <div className="relative w-full max-w-2xl mx-auto group">
                {/* Phantom Card 2 (Deepest) */}
                <div
                    className="absolute inset-x-4 -bottom-4 h-24 bg-stone-200/40 rounded-[20px] blur-[2px] transition-transform duration-700 group-hover:translate-y-2"
                    style={{ zIndex: 0 }}
                />
                {/* Phantom Card 1 (Middle) */}
                <div
                    className="absolute inset-x-2 -bottom-2 h-24 bg-stone-100/60 rounded-[20px] border border-stone-200/30 transition-transform duration-500 group-hover:translate-y-1"
                    style={{ zIndex: 1 }}
                />

                {/* Main Card */}
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
                    className={`w-full min-h-[380px] rounded-[24px] flex flex-col items-center justify-center px-[10px] py-10 transition-all duration-500 cursor-pointer relative z-10 
                                animate-in fade-in ${slideDirection === 'right' ? 'slide-in-from-right-16' : 'slide-in-from-left-16'}`}
                    style={{
                        backgroundColor: !isRevealed ? 'rgba(255, 255, 255, 0.7)' : colors.white,
                        backdropFilter: !isRevealed ? 'blur(20px)' : 'none',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                        boxShadow: !isRevealed
                            ? '0 30px 60px -12px rgba(156, 140, 125, 0.25), 0 18px 36px -18px rgba(156, 140, 125, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.3)'
                            : '0 10px 30px -10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
                    }}
                >
                    {/* Subtle Background Inner Glow (Front only) */}
                    {!isRevealed && (
                        <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none">
                            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-[#c4a484]/10 blur-[80px] animate-pulse duration-[4000ms]" />
                            <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#9c8c7d]/10 blur-[80px] animate-pulse duration-[6000ms]" />
                        </div>
                    )}

                    {!isRevealed ? (
                        <div className="text-center relative z-20">
                            <AutoFitText className="font-black tracking-tight" style={{
                                color: colors.text,
                                textShadow: '0 2px 10px rgba(156, 140, 125, 0.15)'
                            }}>
                                {frontMode === 'kanji' ? (currentWord.kanji || currentWord.kana) : currentWord.kana}
                            </AutoFitText>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-between space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-20">
                            {/* Kana & Kanji (Click to Play) */}
                            <div
                                onClick={(e) => { e.stopPropagation(); if (currentWord.audio?.length) playAudio(currentWord.audio[0]); }}
                                className="w-full flex flex-col items-center justify-center cursor-pointer group/audio hover:opacity-80 transition-all select-none"
                            >
                                <div className="flex items-center justify-center gap-4 mb-3">
                                    <Furigana kanji={currentWord.kanji} kana={currentWord.kana} />
                                </div>
                                <div className="w-full flex flex-col items-center -mb-4">
                                    <PitchAccent kana={currentWord.kana} pitch={currentWord.pitch} />
                                </div>
                            </div>

                            {/* Meaning */}
                            <div className="w-full bg-stone-50/40 backdrop-blur-sm rounded-3xl py-8 px-6 border border-stone-100/50">
                                <div className="space-y-4">
                                    {currentWord.definitions?.map((d, i) => {
                                        const posTags = (d.pos || 'N').split(/[,;；/ ・]+/).filter(Boolean);
                                        return (
                                            <div key={i} className="flex gap-4 items-baseline">
                                                <div className="flex flex-wrap gap-1.5 shrink-0">
                                                    {posTags.map((tag, j) => (
                                                        <span key={j} className="text-[10px] px-2.5 py-0.5 rounded-full bg-stone-200/70 font-bold whitespace-nowrap" style={{ color: colors.text }}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-[14px] font-bold leading-relaxed" style={{ color: colors.text }}>
                                                    {d.meaning}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* JLPT Example Sentences */}
                                <JLPTExampleSection examples={currentWord.jlpt_sentences} />

                                {/* Example Sentences */}
                                <ExampleSentencesSection
                                    examples={currentWord.examples}
                                    onEdit={(ex, idx) => setEditingSentence({ ...ex, localIndex: idx })}
                                    onDelete={async (ex, idx) => {
                                        if (!window.confirm("确定要删除这个例句吗？\n相关音频和图片也将从服务器永久删除。")) return;
                                        try {
                                            const res = await fetch(API_CONFIG.buildURL(`/api/vocab/example-sentence/${ex.id}`), { method: 'DELETE' });
                                            if (res.ok) {
                                                const newVocab = [...vocabulary];
                                                newVocab[currentIndex].examples.splice(idx, 1);
                                                setVocabulary(newVocab);
                                            }
                                        } catch (err) {
                                            console.error("Failed to delete sentence", err);
                                            alert("删除失败: " + err.message);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Management Icons */}
                    {!isRevealed && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setFrontMode(frontMode === 'kanji' ? 'kana' : 'kanji'); }}
                            className="absolute top-6 right-6 w-9 h-9 rounded-full transition-all z-50 shadow-md flex items-center justify-center hover:scale-110 active:scale-95 border border-white/20 opacity-30 hover:opacity-100"
                            style={{ backgroundColor: '#8DA1B9', color: 'white' }}
                            title={frontMode === 'kanji' ? "Show Kana" : "Show Kanji"}
                        >
                            {frontMode === 'kanji' ? <Eye size={16} strokeWidth={2.5} /> : <EyeOff size={16} strokeWidth={2.5} />}
                        </button>
                    )}
                    {isRevealed && (
                        <>
                            {currentWord.level && (
                                <div className="absolute top-6 left-6 flex gap-2 z-50 items-baseline">
                                    {currentWord.level.split(/[,，、]+/).map((lvl, idx) => (
                                        <span key={idx} className="w-9 h-9 rounded-full bg-green-50/80 backdrop-blur-sm text-green-600 font-black text-[10px] shadow-sm flex items-center justify-center border border-green-100/50 leading-none">
                                            {lvl.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {currentWord.audio?.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const audio = currentWord.audio[0];
                                        const cached = audioCache.current.get(audio.id);
                                        if (cached) {
                                            URL.revokeObjectURL(cached.objectUrl);
                                            audioCache.current.delete(audio.id);
                                        }
                                        setEditingAudio(audio);
                                    }}
                                    className="absolute top-6 right-6 w-9 h-9 rounded-full bg-red-50/80 backdrop-blur-sm text-red-500 hover:bg-red-100 transition-all z-50 shadow-sm border border-red-100/50 flex items-center justify-center"
                                    title="Edit Audio Timestamps"
                                >
                                    <Edit3 size={16} strokeWidth={2.5} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>



            {/* Audio Editor Modal */}
            {editingAudio && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-4" onClick={(e) => { e.stopPropagation(); setEditingAudio(null); }}>
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-stone-700">EDIT AUDIO SLICE</h3>
                            <button onClick={() => setEditingAudio(null)} className="text-stone-400 hover:text-stone-600 p-1"><X size={20} /></button>
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
                                            if (res.ok) {
                                                // Invalidate cache for this audio
                                                const cached = audioCache.current.get(editingAudio.id);
                                                if (cached) {
                                                    URL.revokeObjectURL(cached.objectUrl);
                                                    audioCache.current.delete(editingAudio.id);
                                                }
                                                // Update local state WITH NEW TIMESTAMP to force cache bust in next play
                                                editingAudio.start = newStart;
                                                editingAudio.end = newEnd;
                                                editingAudio.updated_at = new Date().toISOString();
                                                setEditingAudio(null);
                                            }
                                        } catch (err) {
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
            {/* Sentence Editor Modal */}
            {editingSentence && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-4" onClick={(e) => { e.stopPropagation(); setEditingSentence(null); }}>
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-stone-700 uppercase tracking-widest">Edit Example Sentence</h3>
                            <button onClick={() => setEditingSentence(null)} className="text-stone-400 hover:text-stone-600 p-1"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5">Japanese (Support Furigana[reading])</label>
                                <textarea
                                    id="edit-sentence-ja"
                                    defaultValue={editingSentence.ja}
                                    rows={3}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 font-medium text-stone-700 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all leading-relaxed text-[15px]"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5">English Translation</label>
                                <textarea
                                    id="edit-sentence-en"
                                    defaultValue={editingSentence.en}
                                    rows={3}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-600 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all text-[14px] leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end mt-8 gap-3">
                            <button onClick={() => setEditingSentence(null)} className="px-6 py-2.5 rounded-full font-bold text-stone-400 hover:bg-stone-50 transition-colors text-xs tracking-widest">CANCEL</button>
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const newJa = document.getElementById('edit-sentence-ja').value.trim();
                                    const newEn = document.getElementById('edit-sentence-en').value.trim();

                                    try {
                                        const fd = new FormData();
                                        fd.append('ja', newJa);
                                        fd.append('en', newEn);

                                        const res = await fetch(API_CONFIG.buildURL(`/api/vocab/example-sentence/${editingSentence.id}`), {
                                            method: 'PUT',
                                            body: fd
                                        });
                                        if (res.ok) {
                                            // Update local state
                                            const newVocab = [...vocabulary];
                                            const ex = newVocab[currentIndex].examples[editingSentence.localIndex];
                                            ex.ja = newJa;
                                            ex.en = newEn;
                                            setVocabulary(newVocab);
                                            setEditingSentence(null);
                                        }
                                    } catch (err) {
                                        console.error("Failed to update sentence", err);
                                        alert("更新失败: " + err.message);
                                    }
                                }}
                                className="px-6 py-2.5 rounded-full font-black bg-stone-700 text-white hover:bg-stone-800 transition-all text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-stone-200"
                            >
                                <Save size={14} /> SAVE CHANGES
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
