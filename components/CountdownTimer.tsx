"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  deadline: string;
  fallbackLabel: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(deadline: string): TimeLeft | null {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function CountdownTimer({ deadline, fallbackLabel }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null | undefined>(undefined);

  useEffect(() => {
    setTimeLeft(getTimeLeft(deadline));
    const id = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  // undefined = not yet hydrated (avoid SSR mismatch); show static badge until first tick
  if (timeLeft === undefined) {
    return (
      <span className="badge bg-[#b31414] text-white">
        {fallbackLabel}
      </span>
    );
  }

  // null = expired
  if (timeLeft === null) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="badge bg-[#b31414] text-white tabular-nums">
      {timeLeft.days > 0 && <>{timeLeft.days}d </>}
      {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
    </span>
  );
}
