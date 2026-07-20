"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption, EChartsType } from "echarts";

type EChartsClientProps = {
  option: EChartsOption;
  ariaLabel: string;
  className?: string;
  getClickHref?: (params: unknown) => string | undefined;
};

export function EChartsClient({ option, ariaLabel, className, getClickHref }: EChartsClientProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<EChartsType | null>(null);
  const getClickHrefRef = useRef(getClickHref);

  useEffect(() => {
    getClickHrefRef.current = getClickHref;
  }, [getClickHref]);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    instanceRef.current = chart;

    const handleResize = () => {
      chart.resize();
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            handleResize();
          })
        : null;

    resizeObserver?.observe(chartRef.current);
    window.addEventListener("resize", handleResize);

    chart.on("click", (params) => {
      const href = getClickHrefRef.current?.(params);

      if (href) {
        window.location.href = href;
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={chartRef} className={className} role="img" aria-label={ariaLabel} />;
}
