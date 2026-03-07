import React, {useEffect, useRef, useState} from 'react';
import {Loader2, Search, X, MousePointer2} from 'lucide-react';

const colors = {
    morandiNeonGreen: '#F2EBBF',
    morandiRed: '#d6a0a0',
    cardBorder: '#4a4a4a'
};

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

export default function WordLookup() {
    const dictionaryRef = useRef(null);
    const [inflectionMode, setInflectionMode] = useState(null);
    const [lookup, setLookup] = useState({
        rawText: '', text: '', x: 0, y: 0, data: null, loading: false, show: false, position: 'bottom', candidates: []
    });

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
        if (!mode) {
            fetchDictionaryData(rawText);
            return;
        }
        const candidates = mode === 'verb' ? getVerbPrototypes(rawText) : lemmatizeAdj(rawText);
        if (candidates.length === 1) {
            fetchDictionaryData(candidates[0]);
        } else {
            setLookup(prev => ({...prev, show: true, candidates, data: null, loading: false}));
        }
    };

    const toggleMode = (mode) => {
        const newMode = inflectionMode === mode ? null : mode;
        setInflectionMode(newMode);
        performSearchProcess(lookup.rawText, newMode);
    };

    const hideLookup = () => setLookup(p => ({...p, show: false}));

    const handleTextSelection = () => {
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

    return {
        dictionaryRef,
        lookup,
        hideLookup,
        inflectionMode,
        toggleMode,
        fetchDictionaryData,
        handleTextSelection,
        getMoraList,
        parseAccentPattern
    };
}

export function WordLookupPanel({lookup, inflectionMode, toggleMode, hideLookup, fetchDictionaryData, getMoraList, parseAccentPattern}) {
    return lookup.show && (
        <div className="fixed z-[100] w-[580px] shadow-2xl rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md"
             style={{
                 left: lookup.x,
                 top: lookup.y,
                 transform: lookup.position === 'top' ? 'translateY(-100%)' : 'none',
                 backgroundColor: colors.morandiNeonGreen,
                 maxHeight: '420px',
                 display: 'flex',
                 flexDirection: 'column'
             }}>
            <style>{`
                .dot-pattern {
                    background-color: transparent;
                    background-image: radial-gradient(#00000015 0.5px, transparent 0.5px);
                    background-size: 4px 4px;
                }
                .slim-scroll::-webkit-scrollbar { width: 4px; }
                .slim-scroll::-webkit-scrollbar-track { background: transparent; }
                .slim-scroll::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; }
            `}</style>

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
                <button onClick={hideLookup} className="text-stone-500 hover:text-black"><X size={18}/></button>
            </div>

            {lookup.loading ? <div className="py-10 flex justify-center flex-grow"><Loader2 className="animate-spin text-stone-400"/></div> : (
                <div className="overflow-y-auto pr-2 slim-scroll flex-grow">
                    {lookup.candidates.length > 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 py-6">
                            <div className="text-stone-600 font-bold text-sm flex items-center gap-2">
                                <MousePointer2 size={16}/> 发现多个候选，请选择：
                            </div>
                            <div className="flex flex-wrap gap-3 justify-center">
                                {lookup.candidates.map((cand, cIdx) => (
                                    <button key={cIdx} onClick={() => fetchDictionaryData(cand)}
                                            className="px-6 py-2.5 bg-white text-stone-800 rounded-xl border border-stone-300 shadow-sm hover:shadow-md transition-all font-bold text-lg">{cand}</button>
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
    );
}
