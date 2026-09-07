"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type PageToolbarTemporalContextProps = {
  rangeLabel?: string;
  statusLabel?: string;
  trailing?: ReactNode;
};

export function PageToolbarTemporalContext({ rangeLabel, statusLabel, trailing }: PageToolbarTemporalContextProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    const interval = window.setInterval(updateNow, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const dateTime = now.toISOString();
  const fullDateLabel = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);
  const compactDateLabel = `${now.getMonth() + 1}月${now.getDate()}日`;
  const timeLabel = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <div className="page-toolbar__temporal-context">
      <span className="page-toolbar__clock" aria-label={`当前时间 ${fullDateLabel} ${timeLabel}`}>
        <time className="page-toolbar__clock-date" dateTime={dateTime} suppressHydrationWarning>
          <span className="page-toolbar__clock-date--full">{fullDateLabel}</span>
          <span className="page-toolbar__clock-date--compact">{compactDateLabel}</span>
        </time>
        <time className="page-toolbar__clock-time" dateTime={dateTime} suppressHydrationWarning>
          {timeLabel}
        </time>
      </span>
      {rangeLabel ? <span className="page-toolbar__range-context">{rangeLabel}</span> : null}
      {trailing}
      {statusLabel ? (
        <span className="page-toolbar__status" role="status">
          {statusLabel}
        </span>
      ) : null}
    </div>
  );
}
