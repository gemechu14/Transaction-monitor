"use client";

import ReactECharts from "echarts-for-react";

import { BRAND_COLOR, BRAND_TINT, NEUTRAL_TEXT } from "@/config/colors";
import type { PeakLoadPoint } from "@/types/api";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// PeakLoadPoint.day is 0=Sun..6=Sat; reorder to a Monday-first row axis.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function PeakLoadHeatmap({ data }: { data: PeakLoadPoint[] }) {
  const seriesData = data.map((point) => [
    point.hour,
    DAY_ORDER.indexOf(point.day),
    point.value,
  ]);
  const max = Math.max(...data.map((point) => point.value), 1);

  const option = {
    animationDuration: 700,
    animationEasing: "cubicOut" as const,
    animationDelay: (index: number) => Math.min(index * 2, 400),
    animationDurationUpdate: 400,
    animationEasingUpdate: "cubicOut" as const,
    tooltip: {
      position: "top",
      formatter: (params: { data: [number, number, number] }) => {
        const [hour, rowIndex, value] = params.data;
        return `${DAY_LABELS[rowIndex]} ${String(hour).padStart(2, "0")}:00 — load ${value}`;
      },
    },
    grid: { left: 44, right: 12, top: 8, bottom: 24 },
    xAxis: {
      type: "category",
      data: Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")),
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: NEUTRAL_TEXT, fontSize: 10, interval: 1 },
    },
    yAxis: {
      type: "category",
      data: DAY_LABELS,
      inverse: true,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: NEUTRAL_TEXT, fontSize: 11 },
    },
    visualMap: {
      show: false,
      min: 0,
      max,
      inRange: { color: [BRAND_TINT, BRAND_COLOR] },
    },
    series: [
      {
        type: "heatmap",
        data: seriesData,
        itemStyle: { borderRadius: 3, borderWidth: 3, borderColor: "transparent" },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.15)" } },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 260, width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}
