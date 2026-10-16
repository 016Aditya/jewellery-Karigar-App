import React, { useState, useMemo } from "react";
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
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
} from "recharts";
import { useTheme } from "@mui/material/styles";
import {
  useGetWageTrendQuery,
  useGetKarigarLookupQuery,
} from "../../features/api/apiSlice";

// ── Unique colours per karigar line ────────────────────────────────────────
const LINE_PALETTE = [
  "#1976d2", // Blue
  "#C9A84C", // Gold
  "#d32f2f", // Red
  "#2e7d32", // Green
  "#ed6c02", // Orange
  "#9c27b0", // Purple
  "#0288d1", // Light Blue
  "#e91e63", // Pink
  "#009688", // Teal
  "#795548", // Brown
];

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

// ── Default date range: last 12 months ─────────────────────────────────────
function getLast12Months() {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  // 11 months ago + current month = 12 months spread
  const start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1)
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
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  // Sort payload by value descending so the highest earners are at the top of the tooltip
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

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
        maxWidth: 280,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        {label}
      </Typography>

      {sortedPayload.map((entry) => (
        <Box
          key={entry.dataKey}
          display="flex"
          alignItems="center"
          gap={1}
          mb={0.5}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: entry.stroke,
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
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function WageTrendChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const defaults = getLast12Months();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [selectedKarigars, setSelectedKarigars] = useState([]);

  // Fetch Karigar list for the multi-select dropdown
  const { data: lookupData = [], isLoading: lookupLoading } =
    useGetKarigarLookupQuery();

  const karigarOptions = useMemo(
    () => lookupData.map((d) => d.karigarName),
    [lookupData],
  );

  // GET /api/charts/wage-trend?startDate=...&endDate=...&karigars=...
  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetWageTrendQuery(
    { startDate, endDate, karigars: selectedKarigars },
    { refetchOnMountOrArgChange: true },
  );

  // ── Pivot DTO to Line Chart Shape ──────────────────────────────────────
  // DTO: { karigarName, year, month, monthName, wagePaid }
  // OUT: [{ monthKey: "2023-06", label: "Jun 2023", "Amit": 5000, "Raju": 6000 }, ...]
  const { chartData, karigarNames } = useMemo(() => {
    const monthMap = {};
    const nameSet = new Set();

    rawData.forEach(({ karigarName, year, month, wagePaid }) => {
      const key = toMonthKey(year, month);
      const label = toMonthLabel(year, month);

      if (!monthMap[key]) {
        monthMap[key] = { monthKey: key, label };
      }

      monthMap[key][karigarName] = Number((wagePaid ?? 0).toFixed(2));
      nameSet.add(karigarName);
    });

    // Sort chronologically
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

  const handleKarigarChange = (e) => {
    const val =
      typeof e.target.value === "string"
        ? e.target.value.split(",")
        : e.target.value;
    setSelectedKarigars(val);
  };

  return (
    <Card sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* ── Title & Legend Context ──────────────────────────────────────── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Box>
          <Typography
            variant="subtitle2"
            color="primary"
            textTransform="uppercase"
            fontWeight={700}
            letterSpacing={0.5}
          >
            Month-over-Month Wage Trend
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Long-term tracking to identify activity drops or wage inflation per
            Karigar.
          </Typography>
        </Box>

        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          {/* Multi-Select for Karigars */}
          <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
            <InputLabel id="trend-ks-label">Filter Karigars</InputLabel>
            <Select
              labelId="trend-ks-label"
              multiple
              value={selectedKarigars}
              onChange={handleKarigarChange}
              input={<OutlinedInput label="Filter Karigars" />}
              renderValue={(selected) => (
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {selected.map((v) => (
                    <Chip
                      key={v}
                      label={v}
                      size="small"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  ))}
                </Box>
              )}
              disabled={lookupLoading}
            >
              {karigarOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date Range */}
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
            {error?.data?.message ?? "Failed to load wage trend data."}
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
            <LineChart
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
                  value: "Wages Paid (₹)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
                iconType="plainline"
              />

              {/* Dotted lines per karigar */}
              {karigarNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  stroke={LINE_PALETTE[i % LINE_PALETTE.length]}
                  strokeWidth={2}
                  strokeDasharray="5 5" // Makes the line dotted
                  dot={{ r: 3, strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
