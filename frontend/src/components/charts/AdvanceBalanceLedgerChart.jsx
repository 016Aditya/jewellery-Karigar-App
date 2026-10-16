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
  ReferenceLine,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { useGetAdvanceBalanceLedgerQuery } from "../../features/api/apiSlice";

// ── Theme colors mapping ───────────────────────────────────────────────────
const ADVANCE_COLOR = "#0288d1"; // Light Blue
const WAGES_COLOR = "#C9A84C"; // Gold

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
  const absVal = Math.abs(v);
  let formatted = "";
  if (absVal >= 100000) formatted = `₹${(absVal / 100000).toFixed(2)}L`;
  else if (absVal >= 1000) formatted = `₹${(absVal / 1000).toFixed(1)}K`;
  else formatted = `₹${Number(absVal).toFixed(0)}`;

  return v < 0 ? `-${formatted}` : formatted;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isNegativeBalance = data.netBalance < 0;

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        minWidth: 240,
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
              bgcolor: ADVANCE_COLOR,
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Advance Given:
          </Typography>
        </Box>
        <Typography variant="caption" fontWeight={600}>
          {fmtINR(data.advancePaid)}
        </Typography>
      </Box>

      <Box display="flex" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              bgcolor: WAGES_COLOR,
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Wages Earned:
          </Typography>
        </Box>
        <Typography variant="caption" fontWeight={600}>
          {fmtINR(data.wagesEarned)}
        </Typography>
      </Box>

      <Box
        pt={1}
        borderTop="1px dashed"
        borderColor="divider"
        display="flex"
        flexDirection="column"
        gap={0.5}
      >
        <Box display="flex" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Net Balance:
          </Typography>
          <Typography
            variant="caption"
            fontWeight={700}
            color={
              isNegativeBalance
                ? theme.palette.error.main
                : theme.palette.success.main
            }
          >
            {fmtINR(data.netBalance)}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          align="right"
          color={
            isNegativeBalance
              ? theme.palette.error.main
              : theme.palette.success.main
          }
          sx={{ fontSize: 10, fontStyle: "italic" }}
        >
          {isNegativeBalance
            ? "(Karigar owes us advance recovery)"
            : "(We owe Karigar)"}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdvanceBalanceLedgerChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const defaults = getLast6Months();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [karigarType, setKarigarType] = useState("ALL");

  // GET /api/charts/advance-balance-ledger?startDate=...&endDate=...&karigarType=...
  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetAdvanceBalanceLedgerQuery(
    { startDate, endDate, karigarType },
    { refetchOnMountOrArgChange: true },
  );

  // Map DTO keys safely
  const chartData = useMemo(() => {
    return rawData.map((d) => ({
      karigarName: d.karigarName || "Unknown",
      advancePaid: Number(d.advancePaid || d.advanceGiven || 0),
      wagesEarned: Number(d.wagesEarned || d.wagesPaid || 0),
      netBalance: Number(d.netBalance || d.balance || 0),
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
            Karigar-wise Advance & Balance Ledger
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tracks advance given vs. wages earned. Negative balance means
            karigar owes recovery.
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
              bgcolor: ADVANCE_COLOR,
              borderRadius: "2px",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Advance Paid
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              bgcolor: WAGES_COLOR,
              borderRadius: "2px",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Wages Earned
          </Typography>
        </Box>
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
            Net Balance (We Owe)
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
            Net Balance (Karigar Owes Us)
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
            {error?.data?.message ?? "Failed to load ledger data."}
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

              {/* Zero reference line for negative balance context */}
              <ReferenceLine y={0} stroke={theme.palette.divider} />

              {/* Bar 1: Advance Paid */}
              <Bar
                dataKey="advancePaid"
                name="Advance Paid"
                fill={ADVANCE_COLOR}
                maxBarSize={30}
                radius={[4, 4, 0, 0]}
              />

              {/* Bar 2: Wages Earned */}
              <Bar
                dataKey="wagesEarned"
                name="Wages Earned"
                fill={WAGES_COLOR}
                maxBarSize={30}
                radius={[4, 4, 0, 0]}
              />

              {/* Bar 3: Net Balance (Dynamic Color) */}
              <Bar
                dataKey="netBalance"
                name="Net Balance"
                maxBarSize={30}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.netBalance < 0
                        ? theme.palette.error.main // Negative = Red (Owes us)
                        : theme.palette.success.main // Positive = Green (We owe)
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
