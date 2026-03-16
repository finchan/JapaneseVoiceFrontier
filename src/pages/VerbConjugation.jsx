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

// ── Basic conjugation forms ──────────────────────────────────────────────────
const BASIC_FORMS = [
    { key: '原形', label: '原形' },
    { key: 'ます形', label: 'ます形' },
    { key: 'ない形', label: 'ない形' },
    { key: 'て形', label: 'て形' },
    { key: 'た形', label: 'た形' },
    { key: 'ば形', label: 'ば形' },
    { key: '意向形', label: '意向形' },
    { key: '命令形', label: '命令形' },
    { key: '禁止形', label: '禁止形' },
    { key: '可能形', label: '可能形' },
    { key: '受身形', label: '受身形' },
    { key: '使役形', label: '使役形' },
];

// ── Auxiliary categories (14 groups) ─────────────────────────────────────────
const AUX_CATEGORIES = [
    { key: 'tense_aspect', label: 'テンス・アスペクト', forms: ['ている', 'ていた', 'てある', 'てあった', 'てしまう', 'てしまった'] },
    { key: 'juju', label: '授受補助動詞', forms: ['てあげる', 'てもらう', 'てくれる', 'てあげた', 'てもらった', 'てくれた'] },
    { key: 'desire', label: '願望・欲求', forms: ['たい', 'たくない', 'たかった', 'たがる', 'たがっている'] },
    { key: 'conjecture', label: '推量・確信', forms: ['でしょう', 'だろう', 'はずだ', 'はずがない', 'にちがいない'] },
    { key: 'possibility', label: '可能性・不確実', forms: ['かもしれない', 'かもしれなかった'] },
    { key: 'obligation', label: '義務・当然', forms: ['べきだ', 'べきではない', 'なければならない', 'なくてはいけない'] },
    { key: 'permission', label: '許可・禁止', forms: ['てもいい', 'てはいけない', 'てもかまわない'] },
    { key: 'attempt', label: '試み・継続', forms: ['てみる', 'てみた', 'ておく', 'ておいた'] },
    { key: 'change', label: '変化・状態', forms: ['てくる', 'ていく', 'てきた'] },
    { key: 'negative_polite', label: '否定丁寧', forms: ['ません', 'ませんでした', 'ないでください', 'なくてもいい'] },
    { key: 'conditional', label: '条件・仮定', forms: ['たら', 'なら', 'と'] },
    { key: 'causative_passive', label: '使役・受身複合', forms: ['させられる', 'てもらえる', 'させてもらう'] },
    { key: 'request', label: '依頼・命令', forms: ['てください', 'てほしい', 'てもらいたい'] },
    { key: 'hearsay', label: '様態・伝聞', forms: ['そうだ（様態）', 'そうだ（伝聞）', 'らしい', 'ようだ'] },
];

// ── Init helpers ──────────────────────────────────────────────────────────────
function initBasicSelected() {
    const m = {};
    BASIC_FORMS.forEach(f => { m[f.key] = true; });
    return m;
}

function initAuxSelected() {
    const cats = {};
    const forms = {};
    AUX_CATEGORIES.forEach(cat => {
        cats[cat.key] = true;
        cat.forms.forEach(f => { forms[`${cat.key}__${f}`] = true; });
    });
    return { cats, forms };
}

// ── IndeterminateCheckbox ─────────────────────────────────────────────────────
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

// ── PlayBtn ───────────────────────────────────────────────────────────────────
function PlayBtn({ playing, onPlay, small = false }) {
    return (
        <button
            onClick={onPlay}
            className={`flex items-center justify-center rounded-full transition-all active:scale-95 hover:brightness-110 ${small ? 'w-7 h-7' : 'w-8 h-8'}`}
            style={{ backgroundColor: playing ? colors.accent : colors.primary }}
        >
            {playing
                ? <Square size={small ? 10 : 12} color="#fff" fill="#fff" />
                : <Play size={small ? 10 : 12} color="#fff" fill="#fff" />}
        </button>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VerbConjugation() {
    const [query, setQuery] = useState('');
    const [verbInfo, setVerbInfo] = useState(null);
    const [conjugations, setConj] = useState(null);
    const [searchStatus, setSearchStatus] = useState(null); // null|'loading'|'error'|'notfound'

    const [basicSelected, setBasicSelected] = useState(initBasicSelected);
    const [auxSelected, setAuxSelected] = useState(initAuxSelected);
    const [collapsedCats, setCollapsedCats] = useState({});
    const [mobileConjTab, setMobileConjTab] = useState('BASIC');
    const [mobileAuxPanelOpen, setMobileAuxPanelOpen] = useState(false);
    const [mobileBasicPanelOpen, setMobileBasicPanelOpen] = useState(false);

    // TTS
    const [playingKey, setPlayingKey] = useState(null);
    const [playAllBasic, setPlayAllBasic] = useState(false);
    const [playAllAux, setPlayAllAux] = useState(false);
    const audioRef = useRef(null);
    const queueRef = useRef([]);
    const sectionRef = useRef(null); // 'basic' | 'aux'

    // ── Search ────────────────────────────────────────────────────────────
    const handleSearch = async () => {
        const q = query.trim();
        if (!q) return;
        setSearchStatus('loading');
        setVerbInfo(null);
        setConj(null);
        try {
            const r1 = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.verbsSearch), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verb: q }),
            });
            const d1 = await r1.json();
            if (!d1.found) { setSearchStatus('notfound'); return; }
            setVerbInfo(d1.verb_info);

            const r2 = await fetch(API_CONFIG.buildURL(API_CONFIG.endpoints.verbsConjugate), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verb: d1.verb_info.reading, type: d1.verb_info.type }),
            });
            const d2 = await r2.json();
            setConj(d2.conjugations);
            setSearchStatus(null);
        } catch {
            setSearchStatus('error');
        }
    };

    // ── TTS core ──────────────────────────────────────────────────────────
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

    const runQueue = (items, section) => {
        stopAll();
        queueRef.current = [...items];
        sectionRef.current = section;
        if (section === 'basic') setPlayAllBasic(true);
        else setPlayAllAux(true);

        const next = () => {
            if (!queueRef.current.length || sectionRef.current !== section) {
                setPlayingKey(null);
                if (section === 'basic') setPlayAllBasic(false);
                else setPlayAllAux(false);
                return;
            }
            const { text, key } = queueRef.current.shift();
            playOnce(text, key, next);
        };
        next();
    };

    // ── Queue builders ────────────────────────────────────────────────────
    const basicQueue = () => {
        if (!conjugations) return [];
        return BASIC_FORMS
            .filter(f => basicSelected[f.key] && conjugations[f.key])
            .map(f => ({ text: conjugations[f.key], key: `basic_${f.key}` }));
    };

    const auxQueue = () => {
        if (!conjugations) return [];
        const items = [];
        AUX_CATEGORIES.forEach(cat =>
            cat.forms.forEach(form => {
                const fkey = `${cat.key}__${form}`;
                if (auxSelected.forms[fkey] && conjugations[`aux_${fkey}`])
                    items.push({ text: conjugations[`aux_${fkey}`], key: `aux_${fkey}` });
            })
        );
        return items;
    };

    // ── Selector toggles ──────────────────────────────────────────────────
    const toggleBasic = k => setBasicSelected(p => ({ ...p, [k]: !p[k] }));
    const toggleAllBasic = () => {
        const all = BASIC_FORMS.every(f => basicSelected[f.key]);
        const next = {};
        BASIC_FORMS.forEach(f => { next[f.key] = !all; });
        setBasicSelected(next);
    };
    const toggleAllAux = () => {
        const allOn = AUX_CATEGORIES.every(cat =>
            cat.forms.every(f => auxSelected.forms[`${cat.key}__${f}`])
        );
        setAuxSelected(() => {
            const cats = {};
            const forms = {};
            AUX_CATEGORIES.forEach(cat => {
                cats[cat.key] = !allOn;
                cat.forms.forEach(f => { forms[`${cat.key}__${f}`] = !allOn; });
            });
            return { cats, forms };
        });
    };
    const toggleAuxCat = catKey => {
        const cat = AUX_CATEGORIES.find(c => c.key === catKey);
        const allOn = cat.forms.every(f => auxSelected.forms[`${catKey}__${f}`]);
        setAuxSelected(prev => {
            const forms = { ...prev.forms };
            cat.forms.forEach(f => { forms[`${catKey}__${f}`] = !allOn; });
            return { cats: { ...prev.cats, [catKey]: !allOn }, forms };
        });
    };
    const toggleAuxForm = (catKey, form) => {
        const fkey = `${catKey}__${form}`;
        setAuxSelected(prev => {
            const forms = { ...prev.forms, [fkey]: !prev.forms[fkey] };
            const cat = AUX_CATEGORIES.find(c => c.key === catKey);
            const catOn = cat.forms.every(f => forms[`${catKey}__${f}`]);
            return { cats: { ...prev.cats, [catKey]: catOn }, forms };
        });
    };
    const toggleCollapse = catKey => setCollapsedCats(p => ({ ...p, [catKey]: !p[catKey] }));

    const allBasicOn = BASIC_FORMS.every(f => basicSelected[f.key]);

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-4 japanese-text" style={{ minHeight: 'calc(100vh - 120px)' }}>
            <style>{`
                .vc-scrollbar::-webkit-scrollbar { width: 4px; }
                .vc-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .vc-scrollbar::-webkit-scrollbar-thumb { background: #c4b4a4; border-radius: 10px; }
                .vc-row { background: ${colors.white}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 20px 24px; }
                .vc-tr:hover { background: ${colors.highlight}; }
            `}</style>

            {/* ── ROW 1: Search ──────────────────────────────────────────── */}
            <div className="vc-row flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-3">
                <div className="flex items-center gap-2">
                    <Languages size={18} style={{ color: colors.primary }} />
                    <h2 className="text-sm font-bold tracking-wide" style={{ color: colors.text }}>
                        VERB CONJUGATION
                    </h2>
                </div>

                {/* Search bar row */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="動詞... 例: 食べる / はってん"
                        className="flex-1 md:w-72 w-32 px-4 py-2 rounded-xl border text-base md:text-sm outline-none transition-all flex-shrink-0"
                        style={{ borderColor: colors.border, color: colors.text, backgroundColor: '#fdfdfc' }}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searchStatus === 'loading'}
                        className="flex items-center gap-2 px-3 md:px-5 py-2 rounded-full text-white font-bold text-sm transition-all active:scale-95 hover:brightness-110 disabled:opacity-60 shrink-0"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Search size={14} />
                        <span className="hidden md:inline">{searchStatus === 'loading' ? '...' : 'SEARCH'}</span>
                    </button>
                </div>

                {/* Search results - Desktop inline, Mobile below */}
                {verbInfo && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl w-full md:w-auto md:ml-auto">
                        <span className="font-bold text-xs" style={{ color: colors.text }}>{verbInfo.verb}</span>
                        <span className="text-xs" style={{ color: colors.textLight }}>【{verbInfo.reading}】</span>
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: colors.primary, color: '#fff' }}>{
                                verbInfo.type === 'godan' ? '❺' :
                                    verbInfo.type === 'ichidan' ? '❶' :
                                        verbInfo.type === 'suru' ? 'サ' :
                                            verbInfo.type === 'kuru' ? 'カ' : verbInfo.type
                            }</span>
                        {verbInfo.meaning && (
                            <span className="text-xs" style={{ color: colors.textLight }}>{verbInfo.meaning}</span>
                        )}
                    </div>
                )}
                {searchStatus === 'notfound' && (
                    <span className="text-xs font-bold" style={{ color: colors.error }}>動詞が見つかりません</span>
                )}
                {searchStatus === 'error' && (
                    <span className="text-xs font-bold" style={{ color: colors.error }}>接続エラー</span>
                )}
            </div>

            {/* Mobile: Tab Navigation */}
            <div className="vc-row md:hidden flex p-0 overflow-hidden mb-1" style={{ padding: 0, backgroundColor: 'transparent', border: 'none' }}>
                <button
                    onClick={() => setMobileConjTab('BASIC')}
                    className="flex-1 py-3 text-xs font-bold transition-all"
                    style={{
                        backgroundColor: 'transparent',
                        color: mobileConjTab === 'BASIC' ? colors.primary : colors.textLight,
                        borderBottom: `2px solid ${mobileConjTab === 'BASIC' ? colors.primary : 'transparent'}`
                    }}
                >
                    基本活用形
                </button>
                <button
                    onClick={() => setMobileConjTab('AUX')}
                    className="flex-1 py-3 text-xs font-bold transition-all"
                    style={{
                        backgroundColor: 'transparent',
                        color: mobileConjTab === 'AUX' ? colors.primary : colors.textLight,
                        borderBottom: `2px solid ${mobileConjTab === 'AUX' ? colors.primary : 'transparent'}`
                    }}
                >
                    助動詞活用形
                </button>
            </div>


            {/* ── ROW 2: Basic Conjugations (Desktop) ───────────────────────────────── */}
            <div className="vc-row hidden md:flex gap-4" style={{ minHeight: 280 }}>
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
                    {BASIC_FORMS.map(f => {
                        if (f.key === '命令形_せよ' && verbInfo?.type !== 'suru') return null;
                        return (
                            <label key={f.key}
                                className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-stone-100">
                                <input type="checkbox"
                                    checked={!!basicSelected[f.key]}
                                    onChange={() => toggleBasic(f.key)}
                                    className="accent-[#9c8c7d] w-3 h-3" />
                                <span className="text-xs" style={{ color: colors.text }}>{f.label}</span>
                            </label>
                        );
                    })}
                </div>

                <div style={{ width: 1, backgroundColor: colors.border, flexShrink: 0 }} />

                {/* Table */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                            活用表
                        </span>
                        <button
                            onClick={() => playAllBasic ? stopAll() : runQueue(basicQueue(), 'basic')}
                            disabled={!conjugations}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-bold text-xs transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
                            style={{ backgroundColor: playAllBasic ? colors.accent : colors.primary }}
                        >
                            {playAllBasic
                                ? <><Square size={10} fill="#fff" color="#fff" /> STOP</>
                                : <><Play size={10} fill="#fff" color="#fff" /> PLAY ALL</>}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto vc-scrollbar">
                        {!conjugations ? (
                            <div className="h-full flex items-center justify-center">
                                <span className="text-sm" style={{ color: colors.textLight }}>動詞を検索してください</span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-sm">
                                <tbody>
                                    {BASIC_FORMS.filter(f => {
                                        if (f.key === '命令形_せよ' && verbInfo?.type !== 'suru') return false;
                                        return basicSelected[f.key];
                                    }).map(f => {
                                        const form = conjugations[f.key] || '—';
                                        const k = `basic_${f.key}`;
                                        return (
                                            <tr key={f.key} className="vc-tr">
                                                <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ width: 138, color: colors.textLight }}>{f.label}</td>
                                                <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ width: 126 }}></td>
                                                <td className="py-2 px-3 font-bold text-xs text-left" style={{ width: 284, color: colors.text }}>{form}</td>
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

            {/* ── ROW 3: Auxiliaries (Desktop) ─────────────────────────────────────── */}
            <div className="vc-row hidden md:flex gap-4" style={{ minHeight: 320 }}>
                {/* Left: 2-col category selector */}
                <div className="overflow-y-auto vc-scrollbar" style={{ width: 340, flexShrink: 0 }}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                            助動詞・補助動詞
                        </span>
                        <button
                            onClick={toggleAllAux}
                            className="text-xs px-2 py-0.5 rounded-full border transition-all hover:brightness-105"
                            style={{ borderColor: colors.border, color: colors.textLight }}
                        >
                            {AUX_CATEGORIES.every(cat =>
                                cat.forms.every(f => auxSelected.forms[`${cat.key}__${f}`])
                            ) ? '全解除' : '全選'}
                        </button>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        {AUX_CATEGORIES.map(cat => {
                            const allOn = cat.forms.every(f => auxSelected.forms[`${cat.key}__${f}`]);
                            const anyOn = cat.forms.some(f => auxSelected.forms[`${cat.key}__${f}`]);
                            const partial = anyOn && !allOn;
                            const collapsed = collapsedCats[cat.key];
                            return (
                                <div key={cat.key}>
                                    <div className="flex items-center gap-1 px-1 py-1 rounded-lg hover:bg-stone-100">
                                        <button onClick={() => toggleCollapse(cat.key)}
                                            className="flex items-center" style={{ color: colors.textLight }}>
                                            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                        <IndeterminateCheckbox
                                            checked={allOn}
                                            indeterminate={partial}
                                            onChange={() => toggleAuxCat(cat.key)}
                                        />
                                        <span className="text-xs font-bold ml-1 cursor-pointer"
                                            style={{ color: colors.text }}
                                            onClick={() => toggleCollapse(cat.key)}>
                                            {cat.label}
                                        </span>
                                    </div>
                                    {!collapsed && (
                                        <div className="grid grid-cols-2 gap-x-2 ml-6 mb-1">
                                            {cat.forms.map(form => (
                                                <label key={form}
                                                    className="flex items-center gap-1.5 px-1 py-0.5 rounded cursor-pointer hover:bg-stone-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!auxSelected.forms[`${cat.key}__${form}`]}
                                                        onChange={() => toggleAuxForm(cat.key, form)}
                                                        className="accent-[#9c8c7d] w-3 h-3"
                                                    />
                                                    <span className="text-xs" style={{ color: colors.textLight }}>{form}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ width: 1, backgroundColor: colors.border, flexShrink: 0 }} />

                {/* Right: aux table */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                            助動詞活用表
                        </span>
                        <button
                            onClick={() => playAllAux ? stopAll() : runQueue(auxQueue(), 'aux')}
                            disabled={!conjugations}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-bold text-xs transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
                            style={{ backgroundColor: playAllAux ? colors.accent : colors.primary }}
                        >
                            {playAllAux
                                ? <><Square size={10} fill="#fff" color="#fff" /> STOP</>
                                : <><Play size={10} fill="#fff" color="#fff" /> PLAY ALL</>}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto vc-scrollbar">
                        {!conjugations ? (
                            <div className="h-full flex items-center justify-center">
                                <span className="text-sm" style={{ color: colors.textLight }}>動詞を検索してください</span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-sm">
                                <tbody>
                                    {AUX_CATEGORIES.flatMap(cat =>
                                        cat.forms
                                            .filter(form => auxSelected.forms[`${cat.key}__${form}`])
                                            .map(form => {
                                                const fkey = `${cat.key}__${form}`;
                                                const full = conjugations[`aux_${fkey}`] || '—';
                                                const k = `aux_${fkey}`;
                                                return (
                                                    <tr key={fkey} className="vc-tr">
                                                        <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ width: 138, color: colors.textLight }}>{cat.label}</td>
                                                        <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ width: 126, color: colors.textLight }}>{form}</td>
                                                        <td className="py-2 px-3 font-bold text-xs text-left" style={{ width: 284, color: colors.text }}>{full}</td>
                                                        <td className="py-2 px-3 text-right" style={{ width: 52 }}>
                                                            <PlayBtn playing={playingKey === k} onPlay={() => playSingle(full, k)} small />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile: Selection Accordion (Directly placed, no outer panel) */}
            <div className="md:hidden">
                {mobileConjTab === 'BASIC' ? (
                    <div className="flex flex-col bg-stone-50/50 rounded-xl border overflow-hidden" style={{ borderColor: colors.border }}>
                        <div
                            onClick={() => setMobileBasicPanelOpen(!mobileBasicPanelOpen)}
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-stone-100/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.text }}>
                                    基本活用形 カテゴリ
                                </span>
                                {BASIC_FORMS.some(f => basicSelected[f.key]) && (
                                    <span className="w-2 h-2 rounded-full bg-[#9c8c7d]" />
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleAllBasic(); }}
                                    className="text-[10px] px-2 py-0.5 rounded-full border bg-white transition-all hover:brightness-105"
                                    style={{ borderColor: colors.border, color: colors.textLight }}
                                >
                                    {allBasicOn ? '全解除' : '全選'}
                                </button>
                                {mobileBasicPanelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        </div>

                        {mobileBasicPanelOpen && (
                            <div className="p-3 border-t grid grid-cols-4 gap-x-2 gap-y-1" style={{ borderColor: colors.border }}>
                                {BASIC_FORMS.map(f => {
                                    if (f.key === '命令形_せよ' && verbInfo?.type !== 'suru') return null;
                                    return (
                                        <label key={f.key}
                                            className="flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer hover:bg-white/50">
                                            <input type="checkbox"
                                                checked={!!basicSelected[f.key]}
                                                onChange={() => toggleBasic(f.key)}
                                                className="accent-[#9c8c7d] w-3 h-3" />
                                            <span className="text-xs" style={{ color: colors.text }}>{f.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col bg-stone-50/50 rounded-xl border overflow-hidden" style={{ borderColor: colors.border }}>
                        <div
                            onClick={() => setMobileAuxPanelOpen(!mobileAuxPanelOpen)}
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-stone-100/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.text }}>
                                    助動詞・補助動詞 カテゴリ
                                </span>
                                {AUX_CATEGORIES.some(cat => cat.forms.some(f => auxSelected.forms[`${cat.key}__${f}`])) && (
                                    <span className="w-2 h-2 rounded-full bg-[#9c8c7d]" />
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleAllAux(); }}
                                    className="text-[10px] px-2 py-0.5 rounded-full border bg-white transition-all hover:brightness-105"
                                    style={{ borderColor: colors.border, color: colors.textLight }}
                                >
                                    {AUX_CATEGORIES.every(cat => cat.forms.every(f => auxSelected.forms[`${cat.key}__${f}`])) ? '全解除' : '全選'}
                                </button>
                                {mobileAuxPanelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        </div>

                        {mobileAuxPanelOpen && (
                            <div className="p-3 border-t flex flex-col gap-0.5" style={{ borderColor: colors.border }}>
                                {AUX_CATEGORIES.map(cat => {
                                    const allOn = cat.forms.every(f => auxSelected.forms[`${cat.key}__${f}`]);
                                    const anyOn = cat.forms.some(f => auxSelected.forms[`${cat.key}__${f}`]);
                                    const partial = anyOn && !allOn;
                                    const collapsed = collapsedCats[cat.key];
                                    return (
                                        <div key={cat.key}>
                                            <div className="flex items-center gap-1 px-1 py-1 rounded-lg hover:bg-white/50">
                                                <button onClick={() => toggleCollapse(cat.key)}
                                                    className="flex items-center" style={{ color: colors.textLight }}>
                                                    {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                                </button>
                                                <IndeterminateCheckbox
                                                    checked={allOn}
                                                    indeterminate={partial}
                                                    onChange={() => toggleAuxCat(cat.key)}
                                                />
                                                <span className="text-xs font-bold ml-1 cursor-pointer"
                                                    style={{ color: colors.text }}
                                                    onClick={() => toggleCollapse(cat.key)}>
                                                    {cat.label}
                                                </span>
                                            </div>
                                            {!collapsed && (
                                                <div className="grid grid-cols-2 gap-x-2 ml-6 mb-1">
                                                    {cat.forms.map(form => (
                                                        <label key={form}
                                                            className="flex items-center gap-1.5 px-1 py-0.5 rounded cursor-pointer hover:bg-white/50">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!auxSelected.forms[`${cat.key}__${form}`]}
                                                                onChange={() => toggleAuxForm(cat.key, form)}
                                                                className="accent-[#9c8c7d] w-3 h-3"
                                                            />
                                                            <span className="text-xs" style={{ color: colors.textLight }}>{form}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile: Results Panel */}
            <div className="vc-row md:hidden flex-1 flex flex-col gap-4 min-h-[280px]">
                {mobileConjTab === 'BASIC' ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                                活用表
                            </span>
                            <button
                                onClick={() => playAllBasic ? stopAll() : runQueue(basicQueue(), 'basic')}
                                disabled={!conjugations}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-bold text-xs transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
                                style={{ backgroundColor: playAllBasic ? colors.accent : colors.primary }}
                            >
                                {playAllBasic
                                    ? <><Square size={10} fill="#fff" color="#fff" /> STOP</>
                                    : <><Play size={10} fill="#fff" color="#fff" /> PLAY ALL</>}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto vc-scrollbar">
                            {!conjugations ? (
                                <div className="h-full flex items-center justify-center">
                                    <span className="text-sm" style={{ color: colors.textLight }}>動詞を検索してください</span>
                                </div>
                            ) : (
                                <table className="w-full border-collapse text-sm">
                                    <tbody>
                                        {BASIC_FORMS.filter(f => {
                                            if (f.key === '命令形_せよ' && verbInfo?.type !== 'suru') return false;
                                            return basicSelected[f.key];
                                        }).map(f => {
                                            const form = conjugations[f.key] || '—';
                                            const k = `basic_${f.key}`;
                                            return (
                                                <tr key={f.key} className="vc-tr">
                                                    <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ color: colors.textLight }}>{f.label}</td>
                                                    <td className="py-2 px-3 font-bold text-xs text-left" style={{ color: colors.text }}>{form}</td>
                                                    <td className="py-2 px-3 text-right">
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
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>
                                助動詞活用表
                            </span>
                            <button
                                onClick={() => playAllAux ? stopAll() : runQueue(auxQueue(), 'aux')}
                                disabled={!conjugations}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-bold text-xs transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
                                style={{ backgroundColor: playAllAux ? colors.accent : colors.primary }}
                            >
                                {playAllAux
                                    ? <><Square size={10} fill="#fff" color="#fff" /> STOP</>
                                    : <><Play size={10} fill="#fff" color="#fff" /> PLAY ALL</>}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto vc-scrollbar">
                            {!conjugations ? (
                                <div className="h-full flex items-center justify-center">
                                    <span className="text-sm" style={{ color: colors.textLight }}>動詞を検索してください</span>
                                </div>
                            ) : (
                                <table className="w-full border-collapse text-sm">
                                    <tbody>
                                        {AUX_CATEGORIES.flatMap(cat =>
                                            cat.forms
                                                .filter(form => auxSelected.forms[`${cat.key}__${form}`])
                                                .map(form => {
                                                    const fkey = `${cat.key}__${form}`;
                                                    const full = conjugations[`aux_${fkey}`] || '—';
                                                    const k = `aux_${fkey}`;
                                                    return (
                                                        <tr key={fkey} className="vc-tr">
                                                            <td className="py-2 px-2 text-xs" style={{ color: colors.textLight }}>{cat.label}</td>
                                                            <td className="py-2 px-2 text-xs" style={{ color: colors.textLight }}>{form}</td>
                                                            <td className="py-2 px-2 font-bold text-xs" style={{ color: colors.text }}>{full}</td>
                                                            <td className="py-2 px-2 text-right">
                                                                <PlayBtn playing={playingKey === k} onPlay={() => playSingle(full, k)} small />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
