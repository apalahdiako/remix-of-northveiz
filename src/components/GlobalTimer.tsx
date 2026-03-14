import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimerData {
  id: string;
  title: string;
  timer_type: string;
  target_date: string | null;
  is_active: boolean;
  action_link: string | null;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const GlobalTimer = () => {
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const fetchTimer = async () => {
      const { data, error } = await supabase
        .from("global_timer")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (data && !error) {
        setTimerData(data);
      }
    };

    fetchTimer();

    const channel = supabase
      .channel("global-timer-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "global_timer",
        },
        (payload) => {
          if (payload.new && (payload.new as TimerData).is_active) {
            setTimerData(payload.new as TimerData);
          } else if (payload.eventType === "DELETE" || !(payload.new as TimerData).is_active) {
            setTimerData(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!timerData || !timerData.target_date || timerData.timer_type !== "countdown") {
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(timerData.target_date!).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeRemaining({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [timerData]);

  if (!timerData || !timerData.is_active) {
    return null;
  }

  return (
    <div className="text-center">
      {/* Title */}
      <h2 className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-white mb-3 drop-shadow-lg">
        {timerData.title}
      </h2>

      {/* Timer Display */}
      <div className="flex justify-center items-center gap-3 md:gap-5">
        <TimeUnit value={timeRemaining.days} label="Days" />
        <Separator />
        <TimeUnit value={timeRemaining.hours} label="Hours" />
        <Separator />
        <TimeUnit value={timeRemaining.minutes} label="Minutes" />
        <Separator />
        <TimeUnit value={timeRemaining.seconds} label="Seconds" />
      </div>
    </div>
  );
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="text-3xl md:text-5xl font-bold text-white tabular-nums min-w-[2ch] text-center drop-shadow-lg">
      {value.toString().padStart(2, "0")}
    </div>
    <div className="text-[10px] md:text-xs text-white/80 mt-1 uppercase tracking-widest font-medium">
      {label}
    </div>
  </div>
);

const Separator = () => (
  <div className="text-2xl md:text-4xl font-bold text-white/70 drop-shadow-lg -mt-4">:</div>
);
