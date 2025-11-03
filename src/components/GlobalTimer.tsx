import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Fetch initial timer data
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

    // Subscribe to realtime updates
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

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [timerData]);

  if (!timerData || !timerData.is_active) {
    return null;
  }

  const handleViewMore = () => {
    if (timerData.action_link) {
      navigate(timerData.action_link);
    }
  };

  return (
    <div className="w-full py-8 px-4 bg-gradient-to-br from-accent/10 to-background">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-background border-2 border-accent rounded-3xl p-8 shadow-lg">
          {/* Title */}
          <h2 className="text-center text-xl md:text-2xl font-bold mb-6 text-foreground">
            {timerData.title}
          </h2>

          {/* Timer Display */}
          <div className="flex justify-center items-center gap-2 md:gap-4 mb-4">
            <TimeUnit value={timeRemaining.days} label="Hari" />
            <Separator />
            <TimeUnit value={timeRemaining.hours} label="Jam" />
            <Separator />
            <TimeUnit value={timeRemaining.minutes} label="Menit" />
            <Separator />
            <TimeUnit value={timeRemaining.seconds} label="Detik" />
          </div>

          {/* View More Button */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleViewMore}
              size="lg"
              className="rounded-full px-8 font-bold"
            >
              View More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="text-3xl md:text-5xl font-bold text-foreground tabular-nums min-w-[3ch] text-center">
      {value.toString().padStart(2, "0")}
    </div>
    <div className="text-xs md:text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

const Separator = () => (
  <div className="text-3xl md:text-5xl font-bold text-muted-foreground">:</div>
);
