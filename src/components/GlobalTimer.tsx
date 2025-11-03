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
  action_link: string;
}

export function GlobalTimer() {
  const navigate = useNavigate();
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Fetch initial timer data
    const fetchTimer = async () => {
      const { data } = await supabase
        .from("global_timer")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
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
          } else if (payload.eventType === "UPDATE" && !(payload.new as TimerData).is_active) {
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
    if (!timerData?.target_date) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(timerData.target_date!).getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerData]);

  if (!timerData || !timerData.is_active) {
    return null;
  }

  return (
    <div className="w-full py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-gradient-to-br from-accent/10 via-background to-accent/5 rounded-3xl border-4 border-accent p-8 md:p-12">
          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-accent rounded-tl-3xl opacity-50" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-accent rounded-br-3xl opacity-50" />
          
          <div className="text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground uppercase tracking-wide">
              {timerData.title}
            </h2>
            
            <div className="flex justify-center items-center gap-2 md:gap-4 flex-wrap">
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="text-4xl md:text-6xl font-bold text-accent tabular-nums">
                  {String(timeLeft.days).padStart(2, "0")}
                </div>
                <div className="text-sm md:text-base text-muted-foreground uppercase mt-2">
                  Hari
                </div>
              </div>
              
              <div className="text-3xl md:text-5xl font-bold text-accent">:</div>
              
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="text-4xl md:text-6xl font-bold text-accent tabular-nums">
                  {String(timeLeft.hours).padStart(2, "0")}
                </div>
                <div className="text-sm md:text-base text-muted-foreground uppercase mt-2">
                  Jam
                </div>
              </div>
              
              <div className="text-3xl md:text-5xl font-bold text-accent">:</div>
              
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="text-4xl md:text-6xl font-bold text-accent tabular-nums">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </div>
                <div className="text-sm md:text-base text-muted-foreground uppercase mt-2">
                  Menit
                </div>
              </div>
              
              <div className="text-3xl md:text-5xl font-bold text-accent">:</div>
              
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="text-4xl md:text-6xl font-bold text-accent tabular-nums">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </div>
                <div className="text-sm md:text-base text-muted-foreground uppercase mt-2">
                  Detik
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => navigate(timerData.action_link)}
              size="lg"
              className="mt-6 rounded-full px-8 py-6 text-lg font-bold"
            >
              View More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
