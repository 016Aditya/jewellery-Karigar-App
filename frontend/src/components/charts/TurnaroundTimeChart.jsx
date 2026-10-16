import React, { useState, useMemo } from "react";
import { Card, Typography, Box, CircularProgress, Alert } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { useGetTurnaroundTimeQuery } from "../../features/api/apiSlice";

const DEFAULT_TARGET_TAT = 5; // days

// ── Zone colour ────────────────────────────────────────────────────────────
// avgTat <= target           → green
// avgTat within target + 3   → amber
// avgTat > target + 3        → red
function zoneColor(avgTat, target) {
  if (avgTat == null) return "#9e9e9e";
  if (avgTat <= target) return "#2e7d32";
  if (avgTat <= target + 3) return "#f57c00";
  return "#d32f2f";
}

// ── Default date range: last 6 months ─────────────────────────────────────
function getLast6Months() {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, target }) {
  if (!active || !payload?.length) return null;
  const avg = payload[0]?.value;
  const color = zoneColor(avg, target);
  const status =
    avg == null
      ? "No data"
      : avg <= target
        ? `On time (target: ${target}d)`
        : avg <= target + 3
          ? `1–3 days over target`
          : `3+ days over target`;

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        minWidth: 210,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <Box
          sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }}
        />
        <Typography variant="caption" color="text.secondary">
          Avg TAT:&nbsp;
        </Typography>
        <Typography variant="caption" fontWeight={700} color={color}>
          {avg != null ? `${Number(avg).toFixed(1)} days` : "—"}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color={color}
        sx={{ display: "block", mt: 0.25 }}
      >
        {status}
      </Typography>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function TurnaroundTimeChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const defaults = getLast6Months();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetTurnaroundTimeQuery(
    { startDate, endDate, targetTatDays: DEFAULT_TARGET_TAT },
    { refetchOnMountOrArgChange: true },
  );

  // DTO shape: { karigarName, averageTurnaroundDays, targetTatDays,
  //               completedJobsCount, performanceColorCode }
  const chartData = useMemo(
    () =>
      rawData
        .map((item) => ({
          name: item.karigarName,
          avgTat: Number((item.averageTurnaroundDays ?? 0).toFixed(1)),
          totalJobs: item.completedJobsCount,
          colorCode: (item.performanceColorCode ?? "").toUpperCase(),
          target: item.targetTatDays ?? DEFAULT_TARGET_TAT,
        }))
        .sort((a, b) => b.avgTat - a.avgTat), // worst offenders at top
    [rawData],
  );

  const inputStyle = {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
  };

  const target = chartData[0]?.target ?? DEFAULT_TARGET_TAT;

  return (
    <Card sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* ── Title + date filters ─────────────────────────────────────────── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={1}
      >
        <Typography
          variant="subtitle2"
          color="primary"
          textTransform="uppercase"
          fontWeight={700}
          letterSpacing={0.5}
        >
          Job Turnaround Time
        </Typography>

        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              From
            </Typography>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              To
            </Typography>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </Box>
        </Box>
      </Box>

      {/* ── Zone legend ──────────────────────────────────────────────────── */}
      <Box display="flex" gap={2} mb={1.5} flexWrap="wrap">
        {[
          { color: "#2e7d32", label: `≤ ${target}d — On time` },
          { color: "#f57c00", label: `${target + 1}–${target + 3}d — Amber` },
          { color: "#d32f2f", label: `> ${target + 3}d — Late` },
        ].map(({ color, label }) => (
          <Box key={label} display="flex" alignItems="center" gap={0.5}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: color,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Chart body ───────────────────────────────────────────────────── */}
      <Box flex={1} minHeight={0}>
        {isLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress size={32} />
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error?.data?.message ?? "Failed to load turnaround time data."}
          </Alert>
        ) : chartData.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
            color="text.secondary"
          >
            <Typography variant="body2">
              No data for the selected period.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={theme.palette.divider}
              />

              {/* X-axis = days */}
              <XAxis
                type="number"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}d`}
                domain={[0, "auto"]}
              />

              {/* Y-axis = karigar names */}
              <YAxis
                dataKey="name"
                type="category"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={110}
              />

              <Tooltip
                content={(props) => (
                  <CustomTooltip {...props} target={target} />
                )}
                cursor={{ fill: theme.palette.action.hover }}
              />

              {/* Target TAT reference line */}
              <ReferenceLine
                x={target}
                stroke="#2e7d32"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{
                  value: `Target ${target}d`,
                  position: "insideTopRight",
                  style: { fontSize: 10, fill: "#2e7d32" },
                }}
              />

              {/* +3 day amber/red boundary */}
              <ReferenceLine
                x={target + 3}
                stroke="#d32f2f"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{
                  value: `+3d`,
                  position: "insideTopRight",
                  offset: -30,
                  style: { fontSize: 10, fill: "#d32f2f" },
                }}
              />

              <Bar
                dataKey="avgTat"
                name="Avg TAT (days)"
                radius={[0, 4, 4, 0]}
                maxBarSize={28}
              >
                {chartData.map((entry, i) => {
                  const fill =
                    entry.colorCode === "GREEN"
                      ? "#2e7d32"
                      : entry.colorCode === "AMBER"
                        ? "#f57c00"
                        : entry.colorCode === "RED"
                          ? "#d32f2f"
                          : zoneColor(entry.avgTat, entry.target);
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
