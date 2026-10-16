import React, { useState } from "react";
import {
  Card,
  Typography,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  ComposedChart,
  Bar,
  Line,
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
import { useGetMetalWeightVsReturnQuery } from "../../features/api/apiSlice";

// ── Colour tokens ──────────────────────────────────────────────────────────
const COLORS = {
  issued: "#C9A84C", // Gold/amber  — totalIssuedGrams
  returned: "#2e7d32", // Green       — totalReturnedGrams
  excessLoss: "#d32f2f", // Red         — excessLossGrams (Ghata)
  allowedWastage: "#1976d2", // Blue line   — allowedWastageGrams
  toleranceLine: "#E65100", // Orange ref  — 1.5% tolerance line
};

// ── Date helpers ───────────────────────────────────────────────────────────
function getDefaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(last).padStart(2, "0")}`,
  };
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload ?? {};
  const hasGhata = (data.excessLossGrams ?? 0) > 0;

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: hasGhata ? "error.main" : "divider",
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        minWidth: 210,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={0.75}>
        {label}
      </Typography>

      {[
        { key: "totalIssuedGrams", label: "Issued", color: COLORS.issued },
        {
          key: "totalReturnedGrams",
          label: "Returned",
          color: COLORS.returned,
        },
        {
          key: "allowedWastageGrams",
          label: "Allowed Wastage",
          color: COLORS.allowedWastage,
        },
        { key: "actualLossGrams", label: "Actual Loss", color: "#757575" },
        {
          key: "excessLossGrams",
          label: "Excess Loss (Ghata)",
          color: COLORS.excessLoss,
        },
      ].map(({ key, label: lbl, color }) => {
        const val = data[key] ?? 0;
        if (key === "excessLossGrams" && val <= 0) return null;
        return (
          <Box key={key} display="flex" alignItems="center" gap={1} mb={0.3}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {lbl}:&nbsp;
            </Typography>
            <Typography
              variant="caption"
              fontWeight={600}
              color={key === "excessLossGrams" ? "error.main" : "text.primary"}
            >
              {Number(val).toFixed(2)}g
            </Typography>
          </Box>
        );
      })}

      {hasGhata && (
        <Box mt={0.75} px={1} py={0.5} bgcolor="error.light" borderRadius={1}>
          <Typography variant="caption" color="error.dark" fontWeight={700}>
            ⚠ Ghata detected — follow up required
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Custom Bar cell — red if Ghata, green otherwise ────────────────────────
function ReturnedBar(props) {
  const { x, y, width, height, excessLossGrams } = props;
  const fill = (excessLossGrams ?? 0) > 0 ? COLORS.excessLoss : COLORS.returned;
  return (
    <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MetalWeightChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const defaults = getDefaultDates();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [metalType, setMetalType] = useState("");
  const [karigarType, setKarigarType] = useState("");

  // GET /api/charts/metal-weight-vs-return?startDate=...&endDate=...
  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetMetalWeightVsReturnQuery(
    {
      startDate,
      endDate,
      metalType: metalType || undefined,
      karigarType: karigarType || undefined,
    },
    { refetchOnMountOrArgChange: true },
  );

  // Flatten DTO into Recharts-friendly shape
  const chartData = rawData.map((item) => ({
    name: item.karigarName,
    totalIssuedGrams: Number((item.totalIssuedGrams ?? 0).toFixed(2)),
    totalReturnedGrams: Number((item.totalReturnedGrams ?? 0).toFixed(2)),
    allowedWastageGrams: Number((item.allowedWastageGrams ?? 0).toFixed(2)),
    actualLossGrams: Number((item.actualLossGrams ?? 0).toFixed(2)),
    excessLossGrams: Number((item.excessLossGrams ?? 0).toFixed(2)),
  }));

  // Tolerance reference line = max allowed wastage across all karigars
  const maxAllowed = chartData.length
    ? Math.max(...chartData.map((d) => d.allowedWastageGrams))
    : null;

  // Karigars with Ghata — for the summary chips
  const ghataCount = chartData.filter((d) => d.excessLossGrams > 0).length;

  return (
    <Card sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={1.5}
      >
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography
            variant="subtitle2"
            color="primary"
            textTransform="uppercase"
            fontWeight={700}
            letterSpacing={0.5}
          >
            Metal Issue vs. Return Weight
          </Typography>
          {ghataCount > 0 && (
            <Chip
              label={`${ghataCount} Ghata`}
              size="small"
              color="error"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
          )}
        </Box>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
          {/* Date range */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              From
            </Typography>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
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
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* ── Legend hint ─────────────────────────────────────────────────── */}
      <Box display="flex" gap={2} mb={1.5} flexWrap="wrap">
        {[
          { color: COLORS.issued, label: "Issued (g)" },
          { color: COLORS.returned, label: "Returned (g)" },
          { color: COLORS.excessLoss, label: "Ghata / Excess Loss" },
          { color: COLORS.allowedWastage, label: "Allowed Wastage line" },
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

      {/* ── Chart body — fills remaining card height ────────────────────── */}
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
            {error?.data?.message ?? "Failed to load metal weight data."}
          </Alert>
        ) : chartData.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
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
              margin={{ top: 10, right: 40, left: 0, bottom: 5 }}
              barCategoryGap="28%"
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme.palette.divider}
              />
              <XAxis
                dataKey="name"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              {/* Left Y — grams */}
              <YAxis
                yAxisId="left"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}g`}
                label={{
                  value: "Grams",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />

              {/* Right Y — returned grams line */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}g`}
                label={{
                  value: "Returned (g)",
                  angle: 90,
                  position: "insideRight",
                  offset: 12,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: theme.palette.action.hover }}
              />

              {/* Tolerance / allowed wastage reference line */}
              {maxAllowed !== null && (
                <ReferenceLine
                  yAxisId="left"
                  y={maxAllowed}
                  stroke={COLORS.toleranceLine}
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Allowed ${maxAllowed.toFixed(1)}g`,
                    position: "insideTopRight",
                    style: { fontSize: 10, fill: COLORS.toleranceLine },
                  }}
                />
              )}

              {/* Issued bars — always gold/amber */}
              <Bar
                yAxisId="left"
                dataKey="totalIssuedGrams"
                name="Issued (g)"
                fill={COLORS.issued}
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />

              {/* Returned bars — green normally, red if Ghata */}
              <Bar
                yAxisId="left"
                dataKey="totalReturnedGrams"
                name="Returned (g)"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      (entry.excessLossGrams ?? 0) > 0
                        ? COLORS.excessLoss
                        : COLORS.returned
                    }
                  />
                ))}
              </Bar>

              {/* Returned line overlay on right axis */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalReturnedGrams"
                name="Return Trend"
                stroke={COLORS.returned}
                strokeWidth={2}
                dot={{ r: 4, fill: COLORS.returned }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
