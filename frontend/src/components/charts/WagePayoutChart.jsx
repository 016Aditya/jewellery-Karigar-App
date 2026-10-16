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
  Line,
  ComposedChart,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { useGetWagePayoutProfitabilityQuery } from "../../features/api/apiSlice";

// ── Shared height tokens ───────────────────────────────────────────────────

// ── Unique colours per karigar slot ───────────────────────────────────────
const STACK_PALETTE = [
  "#C9A84C",
  "#1976d2",
  "#9c27b0",
  "#00897b",
  "#e53935",
  "#f57c00",
  "#5e35b1",
  "#00acc1",
  "#558b2f",
  "#ad1457",
  "#4e342e",
  "#0277bd",
];

const TOTAL_LINE_COLOR = "#7B5A00"; // dark gold for total payout line

// ── Month helpers ──────────────────────────────────────────────────────────
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
function toMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
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

// ── Currency formatter ─────────────────────────────────────────────────────
function fmtINR(v) {
  if (v == null) return "—";
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  // Separate karigar bars from the total line
  const bars = payload.filter(
    (p) => p.type !== "line" && p.dataKey !== "__total",
  );
  const total = payload.find((p) => p.dataKey === "__total");

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        minWidth: 200,
        maxWidth: 260,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={0.75}>
        {label}
      </Typography>

      {bars.map((entry) => (
        <Box
          key={entry.dataKey}
          display="flex"
          alignItems="center"
          gap={1}
          mb={0.25}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 1,
              bgcolor: entry.fill,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flex: 1 }}
            noWrap
          >
            {entry.name}
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {fmtINR(entry.value)}
          </Typography>
        </Box>
      ))}

      {total && (
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          mt={0.75}
          pt={0.75}
          borderTop="1px solid"
          sx={{ borderColor: "divider" }}
        >
          <Box
            sx={{
              width: 10,
              height: 2,
              bgcolor: TOTAL_LINE_COLOR,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            Total Payout
          </Typography>
          <Typography
            variant="caption"
            fontWeight={700}
            color={TOTAL_LINE_COLOR}
          >
            {fmtINR(total.value)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function WagePayoutChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const defaults = getLast6Months();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [karigarType, setKarigarType] = useState("ALL");

  // GET /api/charts/wage-payout-profitability?startDate=...&endDate=...&karigarType=...
  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetWagePayoutProfitabilityQuery(
    { startDate, endDate, karigarType },
    { refetchOnMountOrArgChange: true },
  );

  // ── Pivot ─────────────────────────────────────────────────────────────
  // DTO shape: { karigarName, karigarType, year, month, monthName, wagesPaid }
  // OUT: [{ monthKey, label, "Raju": 5000, "Amit": 3000, __total: 8000 }, ...]
  const { chartData, karigarNames } = useMemo(() => {
    const monthMap = {};
    const nameSet = new Set();

    rawData.forEach(({ karigarName: name, year, month, wagesPaid }) => {
      const key = toMonthKey(year, month);
      const label = toMonthLabel(year, month);
      if (!monthMap[key]) monthMap[key] = { monthKey: key, label, __total: 0 };

      // Mapped wagesPaid based on new DTO
      monthMap[key][name] = Number((wagesPaid ?? 0).toFixed(2));
      monthMap[key].__total += Number((wagesPaid ?? 0).toFixed(2));

      nameSet.add(name);
    });

    // Round totals
    Object.values(monthMap).forEach((row) => {
      row.__total = Number(row.__total.toFixed(2));
    });

    const sorted = Object.values(monthMap).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    );

    return { chartData: sorted, karigarNames: [...nameSet] };
  }, [rawData]);

  const inputStyle = {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
  };

  return (
    <Card sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* ── Title + Filters ─────────────────────────────────────────── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={1.5}
      >
        <Typography
          variant="subtitle2"
          color="primary"
          textTransform="uppercase"
          fontWeight={700}
          letterSpacing={0.5}
        >
          Monthly Karigar Wage Payout
        </Typography>

        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          {/* Karigar Type Filter */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Type
            </Typography>
            <select
              value={karigarType}
              onChange={(e) => setKarigarType(e.target.value)}
              style={inputStyle}
            >
              <option value="ALL">All Karigars</option>
              <option value="IN_HOUSE">In-House</option>
              <option value="OUTSOURCED">Outsourced</option>
            </select>
          </Box>

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

      {/* ── Total line legend hint ────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={0.75} mb={1}>
        <Box
          sx={{
            width: 20,
            height: 2.5,
            bgcolor: TOTAL_LINE_COLOR,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Total payout line (dark gold)
        </Typography>
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
            {error?.data?.message ?? "Failed to load wage payout data."}
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
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme.palette.divider}
              />

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
                tickFormatter={fmtINR}
                label={{
                  value: "Wages (₹)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: 4 }}
                iconType="square"
                iconSize={10}
              />

              {/* Stacked bars — one per karigar */}
              {karigarNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  name={name}
                  stackId="wages"
                  fill={STACK_PALETTE[i % STACK_PALETTE.length]}
                  maxBarSize={50}
                  radius={
                    i === karigarNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                  }
                />
              ))}

              {/* Total payout overlay line */}
              <Line
                type="monotone"
                dataKey="__total"
                name="Total Payout"
                stroke={TOTAL_LINE_COLOR}
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: TOTAL_LINE_COLOR,
                  stroke: "#fff",
                  strokeWidth: 1.5,
                }}
                activeDot={{ r: 6 }}
                legendType="plainline"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
