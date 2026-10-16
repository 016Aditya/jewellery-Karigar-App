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
import { useGetWagePerGramQuery } from "../../features/api/apiSlice";

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
  return `₹${Number(v).toFixed(2)}`;
}

// ── Color Logic Based on Target ────────────────────────────────────────────
function getBarColor(value, target, theme) {
  if (value == null || target == null) return theme.palette.text.disabled;
  const ratio = value / target;

  // Allowing a 2% buffer to be considered "At Target" (Amber)
  if (ratio > 1.02) return theme.palette.error.main; // Over target (Red)
  if (ratio < 0.98) return theme.palette.success.main; // Below target (Green)
  return theme.palette.warning.main; // At target (Amber)
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, targetWage }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload; // Original DTO

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
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        {label}
      </Typography>

      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption" color="text.secondary">
          Wage/Gram:
        </Typography>
        <Typography variant="caption" fontWeight={700}>
          {fmtINR(data.wagePerGram)}/g
        </Typography>
      </Box>

      {/* Render extra context if backend DTO provides these fields */}
      {data.totalWages !== undefined && (
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">
            Total Paid:
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {fmtINR(data.totalWages)}
          </Typography>
        </Box>
      )}
      {data.totalGrams !== undefined && (
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">
            Processed:
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {Number(data.totalGrams).toFixed(2)}g
          </Typography>
        </Box>
      )}

      <Box
        mt={1}
        pt={1}
        borderTop="1px dashed"
        borderColor="divider"
        display="flex"
        justifyContent="space-between"
      >
        <Typography variant="caption" color="text.secondary">
          Target:
        </Typography>
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          {fmtINR(targetWage)}/g
        </Typography>
      </Box>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function WagePerGramChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const defaults = getLast6Months();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [karigarType, setKarigarType] = useState("ALL");
  const [targetWage, setTargetWage] = useState(35.0);

  // GET /api/charts/wage-per-gram?startDate=...&endDate=...&karigarType=...&targetWage=...
  const {
    data: chartData = [],
    isLoading,
    isError,
    error,
  } = useGetWagePerGramQuery(
    { startDate, endDate, karigarType, targetWage },
    { refetchOnMountOrArgChange: true },
  );

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
        alignItems="flex-start"
        flexWrap="wrap"
        gap={1}
        mb={1.5}
      >
        <Box>
          <Typography
            variant="subtitle2"
            color="primary"
            textTransform="uppercase"
            fontWeight={700}
            letterSpacing={0.5}
          >
            Wage per Gram of Metal Processed
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Unit economics indicator for Karigar making charges.
          </Typography>
        </Box>

        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          {/* Target Wage Input */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Target ₹/g:
            </Typography>
            <input
              type="number"
              value={targetWage}
              step="0.5"
              min="0"
              onChange={(e) => setTargetWage(Number(e.target.value))}
              style={{ ...inputStyle, width: "60px" }}
            />
          </Box>

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

          {/* Date range filters */}
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

      {/* ── Legend hint ────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              bgcolor: theme.palette.success.main,
              borderRadius: "2px",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Below Target
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              bgcolor: theme.palette.warning.main,
              borderRadius: "2px",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            At Target
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              bgcolor: theme.palette.error.main,
              borderRadius: "2px",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Over Target
          </Typography>
        </Box>
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
            {error?.data?.message ?? "Failed to load wage per gram data."}
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
              margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme.palette.divider}
              />

              <XAxis
                dataKey="karigarName"
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
                tickFormatter={(val) => `₹${val}`}
                label={{
                  value: "₹ / gram",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />

              <Tooltip
                cursor={{ fill: theme.palette.action.hover }}
                content={<CustomTooltip targetWage={targetWage} />}
              />

              {/* Target threshold reference line */}
              <ReferenceLine
                y={targetWage}
                stroke={theme.palette.text.primary}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  position: "top",
                  value: `Target: ₹${targetWage}/g`,
                  fill: theme.palette.text.primary,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />

              {/* Colored Bars depending on threshold */}
              <Bar
                dataKey="wagePerGram"
                name="Wage/Gram"
                maxBarSize={60}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.wagePerGram, targetWage, theme)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
