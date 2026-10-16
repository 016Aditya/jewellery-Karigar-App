import React, { useMemo } from "react";
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { useGetGhataTrendQuery } from "../../features/api/apiSlice";

const GHATA_THRESHOLD = 2;

const LINE_PALETTE = [
  "#C9A84C",
  "#1976d2",
  "#9c27b0",
  "#00897b",
  "#e53935",
  "#f57c00",
  "#5e35b1",
  "#00acc1",
];

// ── Month label: { year:2026, month:4 } → "Apr 2026" ─────────────────────
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toMonthLabel(year, month) {
  return `${MONTH_NAMES[(month ?? 1) - 1]} ${year}`;
}

// Sortable key: "2026-04"
function toMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ── Zone colour ────────────────────────────────────────────────────────────
function zoneColor(value) {
  if (value == null) return "#9e9e9e";
  if (value < 0) return "#2e7d32";
  if (value <= GHATA_THRESHOLD) return "#f57c00";
  return "#d32f2f";
}

// ── Colour-coded dot ───────────────────────────────────────────────────────
function ZoneDot(props) {
  const { cx, cy, value } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={zoneColor(value)}
      stroke="#fff"
      strokeWidth={1.5}
    />
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
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
      <Typography variant="subtitle2" fontWeight={700} mb={0.75}>
        {label}
      </Typography>
      {payload.map((entry) => {
        const v = entry.value;
        const color = zoneColor(v);
        const zone =
          v == null
            ? "No data"
            : v < 0
              ? "Over-returned ✓"
              : v <= GHATA_THRESHOLD
                ? "Within tolerance"
                : "⚠ Excess loss";
        return (
          <Box key={entry.dataKey} mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: entry.stroke,
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {entry.name}:&nbsp;
              </Typography>
              <Typography variant="caption" fontWeight={700} color={color}>
                {v != null ? `${Number(v).toFixed(2)}g` : "—"}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color={color}
              sx={{ pl: 2.5, display: "block" }}
            >
              {zone}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function GhataTrendChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();

  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetGhataTrendQuery({}, { refetchOnMountOrArgChange: true });

  // ── Pivot DTO → Recharts shape ────────────────────────────────────────
  // DTO: [{ karigarName, year, month, totalGhata }, ...]
  // OUT: [{ monthKey, label, "Raju": 1.2, "Suresh": -0.3 }, ...] sorted by monthKey
  const { chartData, karigarNames } = useMemo(() => {
    // monthKey → { monthKey, label, [karigarName]: ghata, ... }
    const monthMap = {};
    const nameSet = new Set();

    rawData.forEach(({ karigarName: name, year, month, totalGhata }) => {
      const key = toMonthKey(year, month);
      const label = toMonthLabel(year, month);

      if (!monthMap[key]) monthMap[key] = { monthKey: key, label };
      monthMap[key][name] = Number((totalGhata ?? 0).toFixed(2));
      nameSet.add(name);
    });

    const sorted = Object.values(monthMap).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    );

    return { chartData: sorted, karigarNames: [...nameSet] };
  }, [rawData]);

  // Karigars with at least one month in red zone
  const chronicCount = useMemo(() => {
    const bad = new Set();
    rawData.forEach(({ karigarName: n, totalGhata }) => {
      if ((totalGhata ?? 0) > GHATA_THRESHOLD) bad.add(n);
    });
    return bad.size;
  }, [rawData]);

  return (
    <Card sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* Title + chronic chip */}
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" mb={1}>
        <Typography
          variant="subtitle2"
          color="primary"
          textTransform="uppercase"
          fontWeight={700}
          letterSpacing={0.5}
        >
          Ghata (Excess Metal Loss) Trend
        </Typography>
        {chronicCount > 0 && (
          <Chip
            label={`${chronicCount} chronic`}
            size="small"
            color="error"
            sx={{ fontWeight: 700, fontSize: 11 }}
          />
        )}
      </Box>

      {/* Zone legend */}
      <Box display="flex" gap={2} mb={1.5} flexWrap="wrap">
        {[
          { color: "#2e7d32", label: "Below 0 — Over-returned (good)" },
          {
            color: "#f57c00",
            label: `0–${GHATA_THRESHOLD}g — Within tolerance`,
          },
          { color: "#d32f2f", label: `>${GHATA_THRESHOLD}g — Excess loss` },
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

      {/* Chart */}
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
            {error?.data?.message ?? "Failed to load ghata trend data."}
          </Alert>
        ) : chartData.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
            color="text.secondary"
          >
            <Typography variant="body2">No data available.</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 24, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme.palette.divider}
              />

              {/* X-axis uses human-readable label */}
              <XAxis
                dataKey="label"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}g`}
                label={{
                  value: "Ghata (g)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: 4 }}
                iconType="circle"
                iconSize={10}
              />

              {/* Zero line */}
              <ReferenceLine
                y={0}
                stroke={theme.palette.text.secondary}
                strokeDasharray="4 2"
                strokeWidth={1}
                label={{
                  value: "Zero",
                  position: "insideTopLeft",
                  style: { fontSize: 10, fill: theme.palette.text.secondary },
                }}
              />

              {/* Threshold line */}
              <ReferenceLine
                y={GHATA_THRESHOLD}
                stroke="#d32f2f"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `Threshold ${GHATA_THRESHOLD}g`,
                  position: "insideTopRight",
                  style: { fontSize: 10, fill: "#d32f2f" },
                }}
              />

              {/* One line per karigar */}
              {karigarNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  stroke={LINE_PALETTE[i % LINE_PALETTE.length]}
                  strokeWidth={2}
                  dot={<ZoneDot />}
                  activeDot={{ r: 7 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
