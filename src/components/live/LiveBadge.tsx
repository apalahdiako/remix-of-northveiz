import { useState } from "react";
import { Radio, Users } from "lucide-react";
import { useActiveLiveStream } from "@/hooks/useLiveStream";
import LiveViewerOverlay from "./LiveViewerOverlay";

const LiveBadge = () => {
  const { stream } = useActiveLiveStream();
  const [open, setOpen] = useState(false);

  if (!stream) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-24 right-4 md:bottom-8 md:right-8 group"
        aria-label="Tonton siaran langsung"
      >
        <div className="relative flex items-center gap-2 bg-accent text-accent-foreground pl-2 pr-3 py-2 rounded-full shadow-2xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="text-xs font-bold tracking-wider uppercase">Live</span>
          <span className="flex items-center gap-1 text-[11px] font-medium opacity-90 border-l border-white/30 pl-2 ml-0.5">
            <Users className="h-3 w-3" />
            {stream.viewer_count}
          </span>
        </div>
      </button>

      {open && <LiveViewerOverlay stream={stream} onClose={() => setOpen(false)} />}
    </>
  );
};

export default LiveBadge;
