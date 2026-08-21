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
  const optionRef = useRef(option);
  const getClickHrefRef = useRef(getClickHref);

  useEffect(() => {
    getClickHrefRef.current = getClickHref;
  }, [getClickHref]);

  useEffect(() => {
    const container = chartRef.current;

    if (!container) {
      return;
    }

    let chart: EChartsType | null = null;
    let disposed = false;

    const syncTheme = () => {
      chart?.setOption(buildChartThemeOption(document.documentElement.dataset.theme === "dark", optionRef.current));
    };

    const initialize = () => {
      if (disposed || chart || container.clientWidth === 0 || container.clientHeight === 0) {
        return;
      }

      chart = echarts.init(container, undefined, { renderer: "canvas" });
      instanceRef.current = chart;
      chart.setOption(optionRef.current, true);
      syncTheme();
      chart.on("click", (params) => {
        const href = getClickHrefRef.current?.(params);

        if (href) {
          window.location.href = href;
        }
      });
    };

    const handleResize = () => {
      if (!chart) {
        initialize();
        return;
      }

      if (container.clientWidth > 0 && container.clientHeight > 0) {
        chart.resize();
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            handleResize();
          })
        : null;

    resizeObserver?.observe(container);
    window.addEventListener("resize", handleResize);

    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    initialize();

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      themeObserver.disconnect();
      chart?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    optionRef.current = option;
    const chart = instanceRef.current;

    if (!chart) {
      return;
    }

    chart.setOption(option, true);
    chart.setOption(buildChartThemeOption(document.documentElement.dataset.theme === "dark", option));
  }, [option]);

  return <div ref={chartRef} className={className} role="img" aria-label={ariaLabel} />;
}

function buildChartThemeOption(isDark: boolean, option?: EChartsOption): EChartsOption {
  const foreground = isDark ? "#d3d8df" : "#111827";
  const muted = isDark ? "#a5adb8" : "#64748b";
  const border = isDark ? "#303640" : "#e5e7eb";
  const surface = isDark ? "#20242b" : "rgba(255,255,255,0.96)";

  return {
    textStyle: { color: muted },
    ...(option && "legend" in option ? { legend: { textStyle: { color: muted } } } : {}),
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
