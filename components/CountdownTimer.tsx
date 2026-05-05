"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  deadline: string;
  fallbackLabel: string;
  bare?: boolean;
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

export function CountdownTimer({ deadline, fallbackLabel, bare }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null | undefined>(undefined);

  useEffect(() => {
    setTimeLeft(getTimeLeft(deadline));
    const id = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (timeLeft === undefined) {
    return bare
      ? <span className="tabular-nums text-lg font-bold text-white">{fallbackLabel}</span>
      : <span className="badge bg-[#b31414] text-white">{fallbackLabel}</span>;
  }

  if (timeLeft === null) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const time = (
    <>
      {timeLeft.days > 0 && <>{timeLeft.days}d </>}
      {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
    </>
  );

  if (bare) {
    return <span className="tabular-nums text-[1.35rem] font-bold text-white">{time}</span>;
  }

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-white tabular-nums"
      style={{
        background: "linear-gradient(135deg, #b31414 0%, #7b0c0c 100%)",
        border: "1px solid #5a0b0b",
        boxShadow: "0 0 18px rgba(179,20,20,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      <span className="text-[#f5a0a0] font-semibold tracking-wide uppercase text-[0.62rem]">Window Closes in</span>
      <span>{time}</span>
    </span>
  );
}
