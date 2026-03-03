# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JapaneseVoiceFrontier is a React web application that provides Japanese listening practice with AI-powered transcription and synchronized audio playback. Users upload audio files, and the app displays word-level timestamps with interactive highlighting synced to audio playback.

## Development Commands

```bash
npm run dev      # Start development server with hot module replacement
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint on the codebase
```

## Architecture

### Tech Stack
- **Build Tool**: Vite 8.0 (beta) with `@vitejs/plugin-react`
- **Framework**: React 19.2 with StrictMode
- **Styling**: Tailwind CSS 4.2 via `@tailwindcss/vite`
- **Audio Visualization**: WaveSurfer.js 7.12
- **Icons**: Lucide React

### Application Flow

1. **Audio Upload** (`App.jsx:31-73`):
   - User selects audio file via hidden input with styled label
   - File is sent to `http://localhost:8000/transcribe` as FormData
   - Backend returns JSON with `data` array containing transcribed segments

2. **Audio Playback** (`App.jsx:75-100`):
   - WaveSurfer instance is created only after transcript data and DOM ref are available
   - Instance is stored in `useRef` to persist across renders
   - Cleanup on unmount and before new file upload prevents memory leaks

3. **Word Synchronization** (`App.jsx:154-174`):
   - Transcript data structure: array of segments with `{start, end, words: [{word, start, end}]}`
   - Current playback time is tracked via `audioprocess` event
   - Words are highlighted when `currentTime` falls within their `[start, end]` range
   - Clicking a word jumps playback to its `start` timestamp

### Key Implementation Details

**WaveSurfer Lifecycle Management**:
- The initialization is deferred until both `transcript` and `audioUrl` are set AND the `waveformRef` DOM element exists
- Uses a guard pattern: `if (!wavesurfer.current)` prevents duplicate initialization
- Cleanup in `useEffect` return and before new file upload prevents zombie instances

**Transcript Data Structure**:
```javascript
[
  {
    start: 0.0,
    end: 2.5,
    words: [
      { word: "こんにちは", start: 0.0, end: 0.8 },
      { word: "世界", start: 0.9, end: 1.5 }
    ]
  }
]
```

**State Management**:
- `isPlaying`: Toggled by play/pause and WaveSurfer events
- `currentTime`: Updated continuously during playback via `audioprocess` event
- `audioUrl`: Created via `URL.createObjectURL(file)` for local audio playback

## Backend Dependency

The app requires a backend service running at `http://localhost:8000/transcribe` that accepts multipart form data with an audio file and returns JSON with timestamped transcription segments.
