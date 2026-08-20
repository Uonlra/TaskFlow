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

    const syncTheme = () => {
      chart.setOption(buildChartThemeOption(document.documentElement.dataset.theme === "dark"));
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            handleResize();
          })
        : null;

    resizeObserver?.observe(chartRef.current);
    window.addEventListener("resize", handleResize);

    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    chart.on("click", (params) => {
      const href = getClickHrefRef.current?.(params);

      if (href) {
        window.location.href = href;
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      themeObserver.disconnect();
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;

    if (!chart) {
      return;
    }

    chart.setOption(option, true);
    chart.setOption(buildChartThemeOption(document.documentElement.dataset.theme === "dark"));
  }, [option]);

  return <div ref={chartRef} className={className} role="img" aria-label={ariaLabel} />;
}

function buildChartThemeOption(isDark: boolean): EChartsOption {
  const foreground = isDark ? "#d3d8df" : "#111827";
  const muted = isDark ? "#a5adb8" : "#64748b";
  const border = isDark ? "#303640" : "#e5e7eb";
  const surface = isDark ? "#20242b" : "rgba(255,255,255,0.96)";

  return {
    textStyle: { color: muted },
    legend: { textStyle: { color: muted } },
    tooltip: {
      backgroundColor: surface,
      borderColor: border,
      textStyle: { color: foreground },
    },
    xAxis: {
      axisLabel: { color: muted },
      axisLine: { lineStyle: { color: border } },
    },
    yAxis: {
      axisLabel: { color: muted },
      axisLine: { lineStyle: { color: border } },
      splitLine: { lineStyle: { color: border } },
    },
  };
}
