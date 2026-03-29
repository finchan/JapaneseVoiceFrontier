import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, Volume2, ChevronDown, ChevronUp, GraduationCap, Play, CheckCircle, Info } from 'lucide-react';
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
    highlight: '#637382',
};

const JLPTList = ({ onStartStudy, initialContext }) => {
    const [view, setView] = useState('LEVELS'); // LEVELS, UNITS, WORDS
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [units, setUnits] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedWord, setExpandedWord] = useState(null);
    const [playingAudio, setPlayingAudio] = useState(null);

    // Fetch initial levels or restore context
    useEffect(() => {
        const init = async () => {
            await fetchLevels();
            if (initialContext && initialContext.level) {
                handleRestoreContext(initialContext.level, initialContext.unit - 1);
            }
        };
        init();
    }, []);

    const handleRestoreContext = async (level, unitIdx) => {
        setLoading(true);
        setSelectedLevel(level);
        try {
            // First fetch units to populate the background
            const encodedLevel = encodeURIComponent(level);
            const unitsRes = await fetch(API_CONFIG.buildURL(`${API_CONFIG.endpoints.jlptUnits}/${encodedLevel}`));
            const unitsData = await unitsRes.json();
            setUnits(unitsData);

            // Then fetch words for the specific unit
            const wordsRes = await fetch(API_CONFIG.buildURL(`${API_CONFIG.endpoints.jlptWords}/${encodedLevel}/${unitIdx}`));
            const wordsData = await wordsRes.json();
            setWords(wordsData);
            setSelectedUnit(unitIdx);
            setView('WORDS');
        } catch (error) {
            console.error('Error restoring context:', error);
            setView('LEVELS');
        } finally {
            setLoading(false);
        }
    };

    const fetchLevels = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.jlptLevels));
            if (!res.ok) throw new Error('Failed to fetch levels');
            const data = await res.json();
            setLevels(data);
        } catch (error) {
            console.error('Error fetching levels:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnits = async (level) => {
        setLoading(true);
        setSelectedLevel(level);
        try {
            const encodedLevel = encodeURIComponent(level);
            const res = await fetch(API_CONFIG.buildURL(`${API_CONFIG.endpoints.jlptUnits}/${encodedLevel}`));
            if (!res.ok) throw new Error('Failed to fetch units');
            const data = await res.json();
            setUnits(data);
            setView('UNITS');
        } catch (error) {
            console.error('Error fetching units:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWords = async (unitIdx) => {
        setLoading(true);
        setSelectedUnit(unitIdx);
        try {
            const encodedLevel = encodeURIComponent(selectedLevel);
            const res = await fetch(API_CONFIG.buildURL(`${API_CONFIG.endpoints.jlptWords}/${encodedLevel}/${unitIdx}`));
            if (!res.ok) throw new Error('Failed to fetch words');
            const data = await res.json();
            setWords(data);
            setView('WORDS');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error fetching words:', error);
        } finally {
            setLoading(false);
        }
    };

    const playAudio = (url, wordId) => {
        if (!url) return;
        if (playingAudio === wordId) return;

        const audio = new Audio(url);
        setPlayingAudio(wordId);
        audio.play().catch(e => console.error('Audio play failed:', e));
        audio.onended = () => setPlayingAudio(null);
        audio.onerror = () => setPlayingAudio(null);
    };

    const toggleExpansion = (wordId) => {
        setExpandedWord(expandedWord === wordId ? null : wordId);
    };

    const formatJLPTSentence = (text) => {
        if (!text) return "";
        // Replace Word[Reading] with <ruby>
        let formatted = text.replace(/([^\[\s<>]+)\[([^\]\s]+)\]/g, (match, word, reading) => {
            return `<ruby>${word}<rt class="text-[10px] opacity-60 font-medium">${reading}</rt></ruby>`;
        });
        return formatted;
    };

    const alignFurigana = (kanji, kana) => {
        if (!kanji || !kana || kanji === kana) return kanji || kana;
        
        let i = 0; // prefix
        while (i < kanji.length && i < kana.length && kanji[i] === kana[i]) i++;
        
        let j = 0; // suffix
        while (j < kanji.length - i && j < kana.length - i && 
               kanji[kanji.length - 1 - j] === kana[kana.length - 1 - j]) j++;
        
        const prefix = kanji.substring(0, i);
        const suffix = kanji.substring(kanji.length - j);
        const kanjiMid = kanji.substring(i, kanji.length - j);
        const kanaMid = kana.substring(i, kana.length - j);
        
        if (!kanjiMid) return kanji;
        
        return `${prefix}<ruby>${kanjiMid}<rt class="text-[11px] opacity-70 font-medium">${kanaMid}</rt></ruby>${suffix}`;
    };

    const updateMastery = async (anki_note_id, currentMastery) => {
        const nextMastery = (currentMastery + 1) % 3;
        try {
            const formData = new FormData();
            formData.append('anki_note_id', anki_note_id);
            formData.append('mastery', nextMastery);
            formData.append('user_id', 0); // Default Admin

            const res = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.jlptProgress), {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                setWords(prev => prev.map(w => w.anki_note_id === anki_note_id ? { ...w, mastery: nextMastery } : w));
            }
        } catch (error) {
            console.error('Error updating mastery:', error);
        }
    };

    // Render Helpers
    if (view === 'LEVELS') {
        return (
            <div className="max-w-6xl mx-auto px-4 py-10 animate-in fade-in duration-500">
                {loading && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
                    </div>
                )}
                
                <div className="mb-12 text-center md:text-left">
                    <h1 className="text-6xl font-black mb-4 tracking-tighter" style={{ color: colors.text }}>JLPT LEXICON</h1>
                    <p className="text-lg max-w-lg font-medium leading-relaxed" style={{ color: colors.textLight }}>
                        Master core vocabulary from N5 to N1. Curated into focused 20-word units for maximum retention.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {levels.map((lvl) => (
                        <div 
                            key={lvl.level}
                            onClick={() => fetchUnits(lvl.level)}
                            className="group relative bg-white/70 backdrop-blur-md rounded-[24px] p-8 border border-white/60 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="absolute top-4 right-4 text-stone-300 group-hover:text-stone-400">
                                <GraduationCap size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-4xl font-black mb-2" style={{ color: colors.text }}>{lvl.level}</h3>
                            <p className="text-sm font-bold uppercase tracking-widest text-stone-400">
                                {lvl.count} WORDS
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.accent }}>
                                Explore Level <Play size={10} fill="currentColor" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'UNITS') {
        return (
            <div className="max-w-6xl mx-auto px-4 py-10 animate-in fade-in slide-in-from-right-8 duration-500">
                {loading && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
                    </div>
                )}

                <button 
                    onClick={() => setView('LEVELS')}
                    className="flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-widest hover:translate-x-1 transition-transform"
                    style={{ color: colors.textLight }}
                >
                    <ChevronLeft size={16} /> Back to Levels
                </button>

                <div className="mb-10">
                    <h2 className="text-5xl font-black mb-2" style={{ color: colors.text }}>{selectedLevel}</h2>
                    <div className="h-1 w-20 rounded-full" style={{ backgroundColor: colors.accent }} />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: units?.total_units || 0 }).map((_, idx) => (
                        <div 
                            key={idx}
                            onClick={() => fetchWords(idx)}
                            className="bg-white/50 backdrop-blur-sm p-5 rounded-[20px] border border-white/60 text-center cursor-pointer hover:bg-white hover:shadow-md transition-all group"
                        >
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-stone-400">
                                Unit
                            </div>
                            <div className="text-2xl font-black mb-3" style={{ color: colors.text }}>
                                {(idx + 1).toString().padStart(2, '0')}
                            </div>
                            <div className="text-[9px] font-bold text-stone-400 group-hover:text-stone-500">
                                {idx * 20 + 1} - {Math.min((idx + 1) * 20, units.total_words)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'WORDS') {
        return (
            <div className="max-w-6xl mx-auto px-4 py-10 animate-in fade-in slide-in-from-right-8 duration-500">
                {loading && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
                    </div>
                )}

                <button 
                    onClick={() => setView('UNITS')}
                    className="flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-widest hover:translate-x-1 transition-transform"
                    style={{ color: colors.textLight }}
                >
                    <ChevronLeft size={16} /> Back to Units
                </button>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <h2 className="text-5xl font-black mb-2" style={{ color: colors.text }}>Unit {(selectedUnit + 1).toString().padStart(2, '0')}</h2>
                        <p className="text-sm font-bold uppercase tracking-widest text-stone-400">
                            {selectedLevel} • WORDS {selectedUnit * 20 + 1}-{Math.min((selectedUnit + 1) * 20, units.total_words)}
                        </p>
                    </div>
                    <button 
                        onClick={() => onStartStudy && onStartStudy(selectedLevel, selectedUnit + 1, words)}
                        className="px-8 py-4 bg-stone-800 text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-lg hover:bg-stone-700 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <Play size={18} fill="currentColor" /> Start Unit Study
                    </button>
                </div>

                <div className="space-y-4 pb-20">
                    {words.map((word) => (
                        <div 
                            key={word.anki_note_id}
                            className="bg-white/60 backdrop-blur-sm rounded-[24px] border border-white/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="p-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <button 
                                        onClick={() => playAudio(word.audio_url, word.anki_note_id)}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${playingAudio === word.anki_note_id ? 'bg-stone-800 text-white scale-110' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                                    >
                                        <Volume2 size={20} />
                                    </button>
                                    
                                    <div className="group flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <h3 
                                                className="text-2xl font-black truncate min-h-[1.5em]" 
                                                style={{ color: colors.text }}
                                                dangerouslySetInnerHTML={{ __html: alignFurigana(word.kanji, word.kana) }}
                                            />
                                        </div>
                                        <p className="text-sm font-medium leading-tight mt-1 line-clamp-1" style={{ color: colors.textLight }}>{word.definition}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                    <button 
                                        onClick={() => updateMastery(word.anki_note_id, word.mastery)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            word.mastery === 2 
                                                ? 'bg-green-100 text-green-700 border-green-200' 
                                                : word.mastery === 1 
                                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                    : 'bg-stone-100 text-stone-400 border-stone-200'
                                        }`}
                                    >
                                        {word.mastery === 2 ? 'Mastered' : word.mastery === 1 ? 'Learning' : 'New'}
                                    </button>
                                    
                                    <button 
                                        onClick={() => toggleExpansion(word.anki_note_id)}
                                        className="p-2 text-stone-300 hover:text-stone-500 transition-colors"
                                    >
                                        {expandedWord === word.anki_note_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>

                            {expandedWord === word.anki_note_id && (
                                <div className="px-6 py-6 bg-stone-50/50 border-t border-stone-100 animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-6">
                                        {word.sentences.length > 0 ? (
                                            word.sentences.map((s, si) => (
                                                <div key={si} className="relative pl-6 border-l-2 border-stone-200">
                                                    <div 
                                                        className="text-lg font-normal mb-1 leading-relaxed tracking-wide" 
                                                        style={{ color: colors.text }}
                                                        dangerouslySetInnerHTML={{ __html: formatJLPTSentence(s.sentence_jp) }}
                                                    />
                                                    <p className="text-sm font-medium leading-relaxed" style={{ color: colors.textLight }}>{s.sentence_cn}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs italic text-stone-400">
                                                <Info size={14} /> No sentences found for this entry.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default JLPTList;
