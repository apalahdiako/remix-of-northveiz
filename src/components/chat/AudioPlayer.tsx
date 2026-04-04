import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";

interface AudioPlayerProps {
  src: string;
  isAdmin?: boolean;
}

const DOTS_COUNT = 28;

export default function AudioPlayer({ src, isAdmin }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>();

  const formatTime = (s: number) => {
    if (!isFinite(s) || s === 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      if (audioRef.current && playing) {
        setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
        rafRef.current = requestAnimationFrame(update);
      }
    };
    if (playing) rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct);
  };

  // Generate pseudo-random waveform pattern (seeded by src)
  const dots = useRef<number[]>(
    Array.from({ length: DOTS_COUNT }, (_, i) => {
      const seed = (i * 7 + 13) % 17;
      return 0.3 + (seed / 17) * 0.7;
    })
  ).current;

  const activeDot = Math.floor(progress * DOTS_COUNT);

  const bgBtn = isAdmin ? "bg-white/20 hover:bg-white/30" : "bg-gray-200 hover:bg-gray-300";
  const iconColor = isAdmin ? "text-white" : "text-gray-700";
  const dotActive = isAdmin ? "bg-white" : "bg-gray-700";
  const dotInactive = isAdmin ? "bg-white/30" : "bg-gray-300";
  const timeColor = isAdmin ? "text-white/70" : "text-gray-500";

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-1">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause button */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={toggle}
        className={`shrink-0 w-9 h-9 rounded-full ${bgBtn} flex items-center justify-center transition-colors`}
      >
        {playing ? <Pause size={16} className={iconColor} /> : <Play size={16} className={`${iconColor} ml-0.5`} />}
      </motion.button>

      {/* Waveform dots */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="flex items-end gap-[2px] h-5 cursor-pointer"
          onClick={handleSeek}
        >
          {dots.map((height, i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-colors duration-150 ${i <= activeDot ? dotActive : dotInactive}`}
              style={{ height: `${height * 20}px` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono tabular-nums ${timeColor}`}>
            {playing ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
          </span>
          {/* Double check mark */}
          <svg width="16" height="10" viewBox="0 0 16 10" className={timeColor}>
            <path d="M1 5l3 3L9 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 5l3 3L13 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
