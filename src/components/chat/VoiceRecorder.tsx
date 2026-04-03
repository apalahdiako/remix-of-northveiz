import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, X } from "lucide-react";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startXRef = useRef(0);
  const cancelledRef = useRef(false);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!cancelledRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          onRecorded(blob);
        }
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setDuration(0);
      setSwipeDelta(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Permission denied or not supported
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    setRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    stopRecording();
    setSwipeDelta(0);
  }, [stopRecording]);

  // Touch/mouse handlers for hold-to-record
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    startXRef.current = e.clientX;
    startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!recording) return;
    const delta = e.clientX - startXRef.current;
    setSwipeDelta(delta);
    if (delta < -80) {
      cancelRecording();
    }
  };

  const handlePointerUp = () => {
    if (!recording) return;
    if (swipeDelta < -80) {
      cancelRecording();
    } else {
      stopRecording();
    }
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  if (recording) {
    return (
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Cancel hint */}
        <button onClick={cancelRecording} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full shrink-0">
          <X size={18} />
        </button>
        <span className="text-xs text-gray-400 whitespace-nowrap">← Geser untuk batal</span>
        
        {/* Duration */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-mono text-red-500">{formatDuration(duration)}</span>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        </div>

        {/* Release area */}
        <div
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          className="p-2.5 bg-red-500 text-white rounded-full cursor-pointer animate-pulse touch-none"
        >
          <Mic size={18} />
        </div>
      </div>
    );
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      disabled={disabled}
      className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors touch-none select-none"
      title="Tahan untuk merekam"
    >
      <Mic size={20} />
    </button>
  );
}
