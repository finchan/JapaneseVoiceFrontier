import React, { useState, useRef, useEffect } from 'react';
import { Languages, Search, Play, Square, ChevronDown, ChevronRight } from 'lucide-react';
import API_CONFIG from '../config';

const colors = {
    background: '#f7f5f0',
    white: '#faf9f6',
    primary: '#9c8c7d',
    accent: '#c4a484',
    text: '#6b5b5b',
    textLight: '#8a7a6a',
    border: '#e6e0d8',
    error: '#b05a5a',
    highlight: '#e8ddd4',
};

// 14 basic forms from Excel
const BASIC_FORMS = [
    { key: '现在式肯定（终止形 / 礼貌形）', label: '现在式肯定（终止形 / 礼貌形）' },
    { key: '现在式否定 1（否定形 1 / 礼貌否定 1）', label: '现在式否定 1（否定形 1 / 礼貌否定 1）' },
    { key: '现在式否定 2（否定形 2 / 礼貌否定 2）', label: '现在式否定 2（否定形 2 / 礼貌否定 2）' },
    { key: '过去式肯定（过去形 / 礼貌过去形）', label: '过去式肯定（过去形 / 礼貌过去形）' },
    { key: '过去式否定 1（过去否定 1 / 礼貌过去否定 1）', label: '过去式否定 1（过去否定 1 / 礼貌过去否定 1）' },
    { key: '过去式否定 2（过去否定 2 / 礼貌过去否定 2）', label: '过去式否定 2（过去否定 2 / 礼貌过去否定 2）' },
    { key: '副词化（连用形）', label: '副词化（连用形）' },
    { key: '名词化 1（程度名词）', label: '名词化 1（程度名词）' },
    { key: '名词化 2（属性名词）', label: '名词化 2（属性名词）' },
    { key: '并列/中顿（て形）', label: '并列/中顿（て形）' },
    { key: '假定形（条件形）', label: '假定形（条件形）' },
    { key: '推量形（推测形 / 礼貌推测）', label: '推量形（推测形 / 礼貌推测）' },
    { key: '样态（样态形 / 礼貌样态）', label: '样态（样态形 / 礼貌样态）' },
    { key: '程度过分（简体复合 / 礼貌复合）', label: '程度过分（简体复合 / 礼貌复合）' },
];

function initBasicSelected() {
    const m = {};
    BASIC_FORMS.forEach(f => { m[f.key] = true; });
    return m;
}

function IndeterminateCheckbox({ checked, indeterminate, onChange }) {
    const cbRef = useRef(null);
    useEffect(() => {
        if (cbRef.current) cbRef.current.indeterminate = indeterminate;
    }, [indeterminate]);
    return (
        <input
            ref={cbRef}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="accent-[#9c8c7d] w-3.5 h-3.5"
        />
    );
}

function PlayBtn({ playing, onPlay, small = false }) {
    return (
        <button
            onClick={onPlay}
            className={`flex items-center justify-center rounded-full transition-all active:scale-95 hover:brightness-110 ${small ? 'w-7 h-7' : 'w-8 h-8'}`}
            style={{ backgroundColor: playing ? colors.accent : colors.primary }}
        >
            {playing
                ? <Square size={small ? 10 : 12} color="#fff" fill="#fff" />
                : <Play   size={small ? 10 : 12} color="#fff" fill="#fff" />}
        </button>
    );
}

export default function AdjectiveI() {
    const [query, setQuery] = useState('');
    const [adjIInfo, setAdjIInfo] = useState(null);
    const [conjugations, setConj] = useState(null);
    const [searchStatus, setSearchStatus] = useState(null);

    const [basicSelected, setBasicSelected] = useState(initBasicSelected);

    const [playingKey, setPlayingKey] = useState(null);
    const [playAllBasic, setPlayAllBasic] = useState(false);
    const audioRef = useRef(null);
    const queueRef = useRef([]);

    const handleSearch = async () => {
        const q = query.trim();
        if (!q) return;
        setSearchStatus('loading');
        setAdjIInfo(null);
        setConj(null);
        try {
            const r1 = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.adjectivesISearch), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adj_i: q }),
            });
            const d1 = await r1.json();
            if (!d1.found) { setSearchStatus('notfound'); return; }
            setAdjIInfo(d1.adj_i_info);

            const r2 = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.adjectivesIConjugate), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adj_i: d1.adj_i_info.reading }),
            });
            const d2 = await r2.json();
            setConj(d2.conjugations);
            setSearchStatus(null);
        } catch {
            setSearchStatus('error');
        }
    };

    const stopAll = () => {
        queueRef.current = [];
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        setPlayingKey(null);
        setPlayAllBasic(false);
    };

    const playOnce = async (text, key, onDone) => {
        setPlayingKey(key);
        try {
            const res = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.ttsStream), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = new Audio(url);
            audioRef.current = a;
            a.onended = () => { URL.revokeObjectURL(url); onDone(); };
            a.onerror = () => onDone();
            a.play();
        } catch {
            onDone();
        }
    };

    const playSingle = (text, key) => {
        if (playingKey === key) { stopAll(); return; }
        stopAll();
        playOnce(text, key, () => setPlayingKey(null));
    };

    const runQueue = (items) => {
        stopAll();
        queueRef.current = [...items];
        setPlayAllBasic(true);

        const next = () => {
            if (!queueRef.current.length) {
                setPlayingKey(null);
                setPlayAllBasic(false);
                return;
            }
            const { text, key } = queueRef.current.shift();
            playOnce(text, key, next);
        };
        next();
    };

    const basicQueue = () => {
        if (!conjugations) return [];
        return BASIC_FORMS
            .filter(f => basicSelected[f.key] && conjugations[f.key])
            .map(f => ({ text: conjugations[f.key], key: `basic_${f.key}` }));
    };

    const toggleBasic = k => setBasicSelected(p => ({ ...p, [k]: !p[k] }));

    const toggleAllBasic = () => {
        const all = BASIC_FORMS.every(f => basicSelected[f.key]);
        const next = {};
        BASIC_FORMS.forEach(f => { next[f.key] = !all; });
        setBasicSelected(next);
    };

    const allBasicOn = BASIC_FORMS.every(f => basicSelected[f.key]);

    return (
        <div className="flex flex-col gap-4 japanese-text" style={{ minHeight: 'calc(100vh - 120px)' }}>
            <style>{`
                .vc-scrollbar::-webkit-scrollbar { width: 4px; }
                .vc-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .vc-scrollbar::-webkit-scrollbar-thumb { background: #c4b4a4; border-radius: 10px; }
                .vc-row { background: ${colors.white}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 20px 24px; }
                .vc-tr:hover { background: ${colors.highlight}; }
            `}</style>

            {/* ROW 1: Search */}
            <div className="vc-row flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-3">
                <div className="flex items-center gap-2">
                    <Languages size={18} style={{ color: colors.primary }} />
                    <h2 className="text-sm font-bold tracking-wide" style={{ color: colors.text }}>
                        ADJECTIVE I CONJUGATION
                    </h2>
                </div>

                {/* Search bar row */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="形容词を入力... 例: 高い / たかい"
                        className="flex-1 md:w-64 px-4 py-2 rounded-xl border text-sm outline-none transition-all"
                        style={{ borderColor: colors.border, color: colors.text, backgroundColor: '#fdfdfc' }}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searchStatus === 'loading'}
                        className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-full text-white font-bold text-sm transition-all active:scale-95 hover:brightness-110 disabled:opacity-60"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Search size={14} />
                        <span className="hidden md:inline">{searchStatus === 'loading' ? '検索中...' : 'SEARCH'}</span>
                    </button>
                </div>

                {/* Search results - Desktop inline, Mobile below */}
                {adjIInfo && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border w-full md:w-auto md:ml-auto"
                         style={{ borderColor: colors.border, backgroundColor: colors.highlight }}>
                        <span className="font-bold text-xs" style={{ color: colors.text }}>{adjIInfo.adj_i}</span>
                        <span className="text-xs" style={{ color: colors.textLight }}>【{adjIInfo.reading}】</span>
                        {adjIInfo.meaning && (
                            <span className="text-xs" style={{ color: colors.textLight }}>{adjIInfo.meaning}</span>
                        )}
                    </div>
                )}
                {searchStatus === 'notfound' && (
                    <span className="text-xs font-bold" style={{ color: colors.error }}>形容词が見つかりません</span>
                )}
                {searchStatus === 'error' && (
                    <span className="text-xs font-bold" style={{ color: colors.error }}>接続エラー</span>
                )}
            </div>

            {/* Mobile: Conjugation Section */}
            <div className="vc-row md:hidden flex flex-col gap-4" style={{ minHeight: 400 }}>
                    {/* Selector - collapsible categories */}
                    <div className="overflow-y-auto vc-scrollbar" style={{ maxHeight: 160 }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                                基本活用形
                            </span>
                            <button
                                onClick={toggleAllBasic}
                                className="text-xs px-2 py-0.5 rounded-full border transition-all hover:brightness-105"
                                style={{ borderColor: colors.border, color: colors.textLight }}
                            >
                                {allBasicOn ? '全解除' : '全選'}
                            </button>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {BASIC_FORMS.map((f) => {
                                return (
                                    <div key={f.key}>
                                        <div className="flex items-center gap-1 px-1 py-1 rounded-lg hover:bg-stone-100">
                                            <input type="checkbox"
                                                   checked={!!basicSelected[f.key]}
                                                   onChange={() => toggleBasic(f.key)}
                                                   className="accent-[#9c8c7d] w-3 h-3" />
                                            <span className="text-xs ml-1 cursor-pointer"
                                                  style={{ color: colors.text }}>
                                                {f.label.length > 15 ? f.label.substring(0, 15) + '...' : f.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                                活用表
                            </span>
                            <button
                                onClick={() => playAllBasic ? stopAll() : runQueue(basicQueue())}
                                disabled={!conjugations}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-bold text-xs transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
                                style={{ backgroundColor: playAllBasic ? colors.accent : colors.primary }}
                            >
                                {playAllBasic
                                    ? <><Square size={10} fill="#fff" color="#fff" /> STOP</>
                                    : <><Play   size={10} fill="#fff" color="#fff" /> PLAY ALL</>}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto vc-scrollbar">
                            {!conjugations ? (
                                <div className="h-full flex items-center justify-center">
                                    <span className="text-sm" style={{ color: colors.textLight }}>形容词を検索してください</span>
                                </div>
                            ) : (
                                <table className="w-full border-collapse text-sm">
                                    <tbody>
                                    {BASIC_FORMS.filter(f => basicSelected[f.key]).map(f => {
                                        const form = conjugations[f.key] || '—';
                                        const k = `basic_${f.key}`;
                                        return (
                                            <tr key={f.key} className="vc-tr">
                                                <td className="py-2 px-2 text-xs" style={{ color: colors.textLight }}>{f.label}</td>
                                                <td className="py-2 px-2 font-bold text-xs" style={{ color: colors.text }}>{form}</td>
                                                <td className="py-2 px-2 text-right">
                                                    <PlayBtn playing={playingKey === k} onPlay={() => playSingle(form, k)} small />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

            {/* ROW 2: Conjugation Table (Desktop) */}
            <div className="vc-row hidden md:flex gap-4" style={{ minHeight: 400 }}>
                {/* Selector */}
                <div className="flex flex-col gap-0.5" style={{ width: 340, flexShrink: 0 }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                            基本活用形
                        </span>
                        <button
                            onClick={toggleAllBasic}
                            className="text-xs px-2 py-0.5 rounded-full border transition-all hover:brightness-105"
                            style={{ borderColor: colors.border, color: colors.textLight }}
                        >
                            {allBasicOn ? '全解除' : '全選'}
                        </button>
                    </div>
                    {BASIC_FORMS.map(f => (
                        <label key={f.key}
                               className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-stone-100">
                            <input type="checkbox"
                                   checked={!!basicSelected[f.key]}
                                   onChange={() => toggleBasic(f.key)}
                                   className="accent-[#9c8c7d] w-3 h-3" />
                            <span className="text-xs" style={{ color: colors.text }}>{f.label}</span>
                        </label>
                    ))}
                </div>

                <div style={{ width: 1, backgroundColor: colors.border, flexShrink: 0 }} />

                {/* Table */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                            活用表
                        </span>
                        <button
                            onClick={() => playAllBasic ? stopAll() : runQueue(basicQueue())}
                            disabled={!conjugations}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-bold text-xs transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
                            style={{ backgroundColor: playAllBasic ? colors.accent : colors.primary }}
                        >
                            {playAllBasic
                                ? <><Square size={10} fill="#fff" color="#fff" /> STOP</>
                                : <><Play   size={10} fill="#fff" color="#fff" /> PLAY ALL</>}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto vc-scrollbar">
                        {!conjugations ? (
                            <div className="h-full flex items-center justify-center">
                                <span className="text-sm" style={{ color: colors.textLight }}>形容词を検索してください</span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-sm">
                                <tbody>
                                {BASIC_FORMS.filter(f => basicSelected[f.key]).map(f => {
                                    const form = conjugations[f.key] || '—';
                                    const k = `basic_${f.key}`;
                                    return (
                                        <tr key={f.key} className="vc-tr">
                                            <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ width: 280, color: colors.textLight }}>{f.label}</td>
                                            <td className="py-2 px-3 font-bold text-xs text-left" style={{ color: colors.text }}>{form}</td>
                                            <td className="py-2 px-3 text-right" style={{ width: 52 }}>
                                                <PlayBtn playing={playingKey === k} onPlay={() => playSingle(form, k)} small />
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
