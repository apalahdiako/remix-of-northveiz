import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, durationSec: number) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const cancelledRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const getSupportedMimeType = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", ""];
    for (const type of types) {
      if (!type || MediaRecorder.isTypeSupported(type)) return type || undefined;
    }
    return undefined;
  };

  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const normalized = Math.min(1, rms * 3);
    setAmplitudes((prev) => {
      const next = [...prev, normalized];
      return next.length > 30 ? next.slice(-30) : next;
    });
    rafRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || recording) return;
    try {
      cancelledRef.current = false;
      setAmplitudes([]);
      console.log("[VoiceRecorder] Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API for amplitude
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = getSupportedMimeType();
      console.log("[VoiceRecorder] mimeType:", mimeType);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        console.log("[VoiceRecorder] stopped, cancelled:", cancelledRef.current, "chunks:", chunksRef.current.length);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        analyserRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        if (!cancelledRef.current && chunksRef.current.length > 0) {
          const finalMime = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: finalMime });
          console.log("[VoiceRecorder] blob size:", blob.size, "type:", finalMime);
          onRecorded(blob, duration);
        }
      };

      recorder.onerror = (e) => console.error("[VoiceRecorder] error:", e);

      recorder.start(250);
      mediaRef.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      rafRef.current = requestAnimationFrame(updateAmplitude);
      console.log("[VoiceRecorder] Recording started");
    } catch (err: any) {
      console.error("[VoiceRecorder] Failed:", err);
      if (err.name === "NotAllowedError") {
        alert("Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan browser Anda.");
      }
    }
  }, [onRecorded, disabled, recording, duration, updateAmplitude]);

  const stopRecording = useCallback(() => {
    console.log("[VoiceRecorder] stopRecording");
    clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    setRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    console.log("[VoiceRecorder] cancel");
    cancelledRef.current = true;
    stopRecording();
    setAmplitudes([]);
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  // Store duration in a ref so onstop callback gets latest value
  const durationRef = useRef(duration);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Patch onRecorded call to use ref
  useEffect(() => {
    if (!mediaRef.current) return;
    const recorder = mediaRef.current;
    recorder.onstop = () => {
      const stream = streamRef.current;
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (!cancelledRef.current && chunksRef.current.length > 0) {
        const finalMime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        onRecorded(blob, durationRef.current);
      }
    };
  }, [onRecorded]);

  if (recording) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {/* Cancel */}
          <button
            onTouchEnd={(e) => { e.preventDefault(); cancelRecording(); }}
            onClick={cancelRecording}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-full shrink-0 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Waveform bars - real amplitude */}
          <div className="flex items-center gap-[2px] h-8 flex-1 min-w-0 overflow-hidden">
            {amplitudes.map((amp, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                className="w-[3px] bg-red-500 rounded-full origin-center"
                style={{ height: `${8 + amp * 24}px` }}
              />
            ))}
          </div>

          {/* Timer + indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-mono text-red-500 tabular-nums">{formatDuration(duration)}</span>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2.5 h-2.5 rounded-full bg-red-500"
            />
          </div>

          {/* Send */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            onClick={stopRecording}
            className="p-2.5 bg-red-500 text-white rounded-full shrink-0 shadow-lg"
          >
            <Send size={16} />
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
      onMouseDown={(e) => { e.preventDefault(); startRecording(); }}
      disabled={disabled}
      className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors select-none"
      title="Tap untuk merekam"
    >
      <Mic size={20} />
    </motion.button>
  );
}
