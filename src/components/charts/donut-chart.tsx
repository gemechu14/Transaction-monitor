"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 168,
}: {
  data: DonutDatum[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="72%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [Number(value).toLocaleString(), String(name)]}
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
              border: "1px solid var(--border)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {centerLabel}
        </span>
        <span className="text-lg font-semibold text-foreground">{centerValue}</span>
      </div>
    </div>
  );
}
