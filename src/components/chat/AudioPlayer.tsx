import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  isAdmin?: boolean;
}

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
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct);
  };

  const bgColor = isAdmin ? "bg-green-500/30" : "bg-gray-200";
  const fillColor = isAdmin ? "bg-white/70" : "bg-gray-500";
  const textColor = isAdmin ? "text-green-100" : "text-gray-500";
  const btnColor = isAdmin ? "text-white" : "text-gray-700";

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} className={`shrink-0 ${btnColor}`}>
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div
          className={`h-1.5 rounded-full ${bgColor} cursor-pointer relative overflow-hidden`}
          onClick={handleSeek}
        >
          <div className={`h-full rounded-full ${fillColor} transition-all`} style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={`text-[10px] ${textColor}`}>
          {playing ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
