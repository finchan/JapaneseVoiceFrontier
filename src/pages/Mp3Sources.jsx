import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { Book, Layers, FileAudio, Play, Pause, Loader2 } from "lucide-react";

const colors = {
  primary: "#9c8c7d",
  text: "#6b5b5b",
  border: "#e6e0d8",
  bgBook: "#ece5e0",
  bgCourse: "#e8ddd4",
  bgFile: "#e0e5ec",
  active: "#7d8d9c",
  morandiBlack: "#3d3d3d",
};

export default function Mp3Sources() {
  const [books, setBooks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const wavesurferRef = useRef(null);
  const waveContainerRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/sources/books")
      .then(res => res.json())
      .then(data => setBooks(data.books || []));
  }, []);

  const handleBookClick = async (book) => {
    setSelectedBook(book);
    setSelectedCourse(null);
    setFiles([]);
    setSegments([]);
    const res = await fetch(`http://localhost:8000/api/sources/courses?book=${encodeURIComponent(book)}`);
    const data = await res.json();
    setCourses(data.courses || []);
  };

  const handleCourseClick = async (course) => {
    setSelectedCourse(course);
    setSelectedFile(null);
    setSegments([]);
    const res = await fetch(`http://localhost:8000/api/sources/files?book=${encodeURIComponent(selectedBook)}&course=${encodeURIComponent(course)}`);
    const data = await res.json();
    setFiles(data.files || []);
  };

  const handleFileClick = async (fileObj) => {
    setSelectedFile(fileObj.name);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/sources/load_content?book=${encodeURIComponent(selectedBook)}&course=${encodeURIComponent(selectedCourse)}&filename=${encodeURIComponent(fileObj.name)}`);
      const data = await res.json();
      setSegments(data.segments || []);
      setTimeout(() => initWaveSurfer(data.mp3_url), 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const initWaveSurfer = (url) => {
    if (!waveContainerRef.current) return;
    if (wavesurferRef.current) wavesurferRef.current.destroy();

    wavesurferRef.current = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: "#c9c0b8",
      progressColor: colors.primary,
      height: 60,
      responsive: true,
    });

    wavesurferRef.current.load(url);
    wavesurferRef.current.on("play", () => setIsPlaying(true));
    wavesurferRef.current.on("pause", () => setIsPlaying(false));
    wavesurferRef.current.on("audioprocess", (time) => setCurrentTime(time));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 p-4">
      <style>{`.custom-scroll::-webkit-scrollbar { width: 4px; } .custom-scroll::-webkit-scrollbar-thumb { background: ${colors.morandiBlack}; border-radius: 10px; }`}</style>

      {/* 三栏联动菜单 */}
      <div className="grid grid-cols-3 h-[300px] rounded-3xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: colors.border }}>
        <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgBook }}>
          <div className="p-4 sticky top-0 bg-inherit font-black text-[10px] text-stone-500 border-b">BOOKS</div>
          {books.map(b => (
            <div key={b} onClick={() => handleBookClick(b)} className={`px-6 py-4 text-sm font-bold cursor-pointer ${selectedBook === b ? "bg-white/60" : "hover:bg-white/30"}`}>{b}</div>
          ))}
        </div>

        <div className="border-r custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgCourse }}>
          <div className="p-4 sticky top-0 bg-inherit font-black text-[10px] text-stone-500 border-b">COURSES</div>
          {courses.map(c => (
            <div key={c} onClick={() => handleCourseClick(c)} className={`px-6 py-4 text-sm font-bold cursor-pointer ${selectedCourse === c ? "bg-white/60" : "hover:bg-white/30"}`}>{c}</div>
          ))}
        </div>

        <div className="custom-scroll overflow-y-auto" style={{ backgroundColor: colors.bgFile }}>
          <div className="p-4 sticky top-0 bg-inherit font-black text-[10px] text-stone-500 border-b">FILES</div>
          {files.map(f => (
            <div key={f.id} onClick={() => handleFileClick(f)} className={`px-6 py-4 cursor-pointer border-b border-white/10 ${selectedFile === f.name ? "bg-white/60 text-[#7d8d9c]" : "hover:bg-white/30 text-stone-600"}`}>
              <div className="text-[13px] font-bold truncate">{f.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 播放器区域 */}
      {selectedFile && (
        <div className="bg-white rounded-3xl p-8 border shadow-sm space-y-6" style={{ borderColor: colors.border }}>
          <div ref={waveContainerRef} className="bg-stone-50 rounded-2xl p-4 min-h-[80px]" />
          <div className="flex justify-center">
            <button onClick={() => wavesurferRef.current?.playPause()} className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: colors.primary }}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
          </div>
          <div className="space-y-4 pt-4 border-t" style={{ borderColor: colors.border }}>
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300" /></div> : 
              segments.map((seg, idx) => {
                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                return (
                  <div key={idx} onClick={() => wavesurferRef.current.setCurrentTime(seg.start)} className={`p-4 rounded-2xl cursor-pointer transition-all ${isActive ? "bg-stone-100 ring-1 ring-stone-200" : "hover:bg-stone-50"}`}>
                    <div className={`text-lg font-medium japanese-text ${isActive ? "text-stone-900" : "text-stone-600"}`}>{seg.text}</div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}