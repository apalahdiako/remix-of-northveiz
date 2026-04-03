import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, X } from "lucide-react";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const cancelledRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "",
    ];
    for (const type of types) {
      if (!type || MediaRecorder.isTypeSupported(type)) return type || undefined;
    }
    return undefined;
  };

  const startRecording = useCallback(async () => {
    if (disabled || recording) return;
    try {
      cancelledRef.current = false;
      console.log("[VoiceRecorder] Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log("[VoiceRecorder] Microphone granted, tracks:", stream.getAudioTracks().length);

      const mimeType = getSupportedMimeType();
      console.log("[VoiceRecorder] Using mimeType:", mimeType);

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        console.log("[VoiceRecorder] Data chunk:", e.data.size);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        console.log("[VoiceRecorder] Recorder stopped, cancelled:", cancelledRef.current, "chunks:", chunksRef.current.length);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (!cancelledRef.current && chunksRef.current.length > 0) {
          const finalMime = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: finalMime });
          console.log("[VoiceRecorder] Sending blob, size:", blob.size, "type:", finalMime);
          onRecorded(blob);
        }
      };

      recorder.onerror = (e) => {
        console.error("[VoiceRecorder] Recorder error:", e);
      };

      recorder.start(250); // collect data every 250ms for reliability
      mediaRef.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      console.log("[VoiceRecorder] Recording started, state:", recorder.state);
    } catch (err) {
      console.error("[VoiceRecorder] Failed to start:", err);
    }
  }, [onRecorded, disabled, recording]);

  const stopRecording = useCallback(() => {
    console.log("[VoiceRecorder] stopRecording called, recorder state:", mediaRef.current?.state);
    clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    setRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    console.log("[VoiceRecorder] cancelRecording called");
    cancelledRef.current = true;
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (recording) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onTouchEnd={(e) => { e.preventDefault(); cancelRecording(); }}
          onClick={cancelRecording}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded-full shrink-0"
        >
          <X size={18} />
        </button>

        {/* Waveform animation */}
        <div className="flex items-center gap-[3px] h-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-[3px] bg-red-500 rounded-full animate-pulse"
              style={{
                height: `${12 + Math.random() * 12}px`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: "0.6s",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-mono text-red-500">{formatDuration(duration)}</span>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        </div>

        {/* Stop & send button */}
        <button
          onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
          onClick={stopRecording}
          className="p-2.5 bg-red-500 text-white rounded-full animate-pulse"
        >
          <Mic size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
      onMouseDown={(e) => { e.preventDefault(); startRecording(); }}
      disabled={disabled}
      className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors select-none"
      title="Tap untuk merekam"
    >
      <Mic size={20} />
    </button>
  );
}
