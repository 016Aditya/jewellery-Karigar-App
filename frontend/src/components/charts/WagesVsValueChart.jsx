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
  Cell,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { useGetWagesVsValueQuery } from "../../features/api/apiSlice";

// ── Theme colors mapping ───────────────────────────────────────────────────
const JOB_VALUE_COLOR = "#C9A84C"; // Gold

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
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Number(v).toFixed(0)}`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  // Use the pre-calculated netProfit from the backend DTO
  const isLoss = data.netProfit < 0;

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        minWidth: 220,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        {label}
      </Typography>

      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              bgcolor: JOB_VALUE_COLOR,
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Job Value:
          </Typography>
        </Box>
        <Typography variant="caption" fontWeight={600}>
          {fmtINR(data.totalJobValue)}
        </Typography>
      </Box>

      <Box display="flex" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              bgcolor: isLoss
                ? theme.palette.error.main
                : theme.palette.warning.main,
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Wages Paid:
          </Typography>
        </Box>
        <Typography variant="caption" fontWeight={600}>
          {fmtINR(data.totalWagesPaid)}
        </Typography>
      </Box>

      <Box
        pt={1}
        borderTop="1px dashed"
        borderColor="divider"
        display="flex"
        justifyContent="space-between"
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Net {isLoss ? "Loss" : "Profit"}:
        </Typography>
        <Typography
          variant="caption"
          fontWeight={700}
          color={isLoss ? theme.palette.error.main : theme.palette.success.main}
        >
          {isLoss ? "-" : "+"}
          {fmtINR(Math.abs(data.netProfit))}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function WagesVsValueChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const defaults = getLast6Months();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [karigarType, setKarigarType] = useState("ALL");

  // GET /api/charts/wages-vs-value?startDate=...&endDate=...&karigarType=...
  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetWagesVsValueQuery(
    { startDate, endDate, karigarType },
    { refetchOnMountOrArgChange: true },
  );

  // Map the new DTO keys safely
  const chartData = useMemo(() => {
    return rawData.map((d) => ({
      karigarName: d.karigarName || "Unknown",
      totalWagesPaid: Number(d.totalWagesPaid || 0),
      totalJobValue: Number(d.totalJobValue || 0),
      netProfit: Number(d.netProfit || 0),
      // We can map the exact color string from the backend if needed,
      // but comparing the numeric values below provides seamless MUI theme integration.
    }));
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
            Wages Paid vs. Job Value Produced
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Profitability check: Are karigars generating more making charge
            value than their wages?
          </Typography>
        </Box>

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

      {/* ── Custom Legend hint ────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={2} mb={1}>
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
            Wages Paid (Profitable)
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
            Wages Paid (Running at Loss)
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              bgcolor: JOB_VALUE_COLOR,
              borderRadius: "2px",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Job Value Produced
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
            {error?.data?.message ?? "Failed to load profitability data."}
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
                tickFormatter={fmtINR}
                label={{
                  value: "Amount (₹)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />

              <Tooltip
                cursor={{ fill: theme.palette.action.hover }}
                content={<CustomTooltip theme={theme} />}
              />

              {/* Bar 1: Job Value Produced */}
              <Bar
                dataKey="totalJobValue"
                name="Job Value Produced"
                fill={JOB_VALUE_COLOR}
                maxBarSize={40}
                radius={[4, 4, 0, 0]}
              />

              {/* Bar 2: Wages Paid (Dynamic Color based on Net Profit) */}
              <Bar
                dataKey="totalWagesPaid"
                name="Wages Paid"
                maxBarSize={40}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.netProfit < 0
                        ? theme.palette.error.main // Loss = Red
                        : theme.palette.warning.main // Profit = Amber
                    }
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
