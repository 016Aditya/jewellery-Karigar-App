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
  Chip,
  OutlinedInput,
  Tooltip as MuiTooltip,
  IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import {
  useGetKarigarLookupQuery,
  useGetProductivityScoreQuery,
} from "../../features/api/apiSlice";

const MAX_KARIGARS = 3;

// ── Radar colours per karigar slot ─────────────────────────────────────────
const RADAR_PALETTE = [
  { stroke: "#C9A84C", fill: "#C9A84C" }, // gold
  { stroke: "#1976d2", fill: "#1976d2" }, // blue
  { stroke: "#9c27b0", fill: "#9c27b0" }, // purple
];

// ── Spoke labels (display) mapped from DTO keys ────────────────────────────
const SPOKES = [
  { key: "onTimeScore", label: "On Time" },
  { key: "jobVolumeScore", label: "Job Volume" },
  { key: "metalAccuracyScore", label: "Metal Accuracy" },
  { key: "ghataControlScore", label: "Ghata Control" },
  { key: "reworkRateScore", label: "Rework Rate" },
];

// ── Metrics Information Tooltip Content ────────────────────────────────────
const MetricInfoContent = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 0.5 }}>
    <Typography variant="subtitle2" fontWeight="bold">
      Productivity Score Metrics
    </Typography>
    <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
      <strong>On-Time Score:</strong> The percentage of completed jobs that were
      delivered within the target Turnaround Time (TAT). If no custom target is
      provided, it defaults to evaluating against a 5-day limit.
    </Typography>
    <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
      <strong>Metal Accuracy Score:</strong> Measures how closely the total
      returned weight (finished item + scrap) matches the expected return
      weight. The expected weight is the total metal issued minus the allowed
      wastage. This score is capped at a maximum of 100%.
    </Typography>
    <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
      <strong>Job Volume Score:</strong> Evaluates the karigar's total assigned
      jobs against a monthly target (currently set at 50 jobs). For example,
      completing 25 jobs results in a 50% score, while handling 50 or more jobs
      maxes out the score at 100%.
    </Typography>
    <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
      <strong>Ghata Control Score:</strong> The percentage of all assigned jobs
      where the actual metal loss remained strictly within the expected wastage
      limits. If a karigar works on 10 jobs and 9 have acceptable metal loss (no
      excess ghata), they score 90%.
    </Typography>
    <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
      <strong>Rework Rate Score:</strong> Currently set to a fixed 100%. In
      future updates, this will reflect the percentage of jobs completed
      correctly on the first attempt without requiring any reworks or
      corrections.
    </Typography>
  </Box>
);

// ── Custom Tooltip for Radar Chart ─────────────────────────────────────────
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
        minWidth: 180,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
        {label}
      </Typography>
      {payload.map((entry, i) => (
        <Box key={i} display="flex" alignItems="center" gap={1} mb={0.25}>
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
          <Typography variant="caption" fontWeight={700}>
            {entry.value != null ? `${Number(entry.value).toFixed(1)}` : "—"}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ProductivityRadarChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();

  // ── Date filters ──────────────────────────────────────────────────────
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedKarigars, setSelectedKarigars] = useState([]);

  // ── Lookup: populate karigar dropdown ─────────────────────────────────
  const { data: lookupData = [], isLoading: lookupLoading } =
    useGetKarigarLookupQuery();

  const karigarOptions = useMemo(
    () => lookupData.map((d) => d.karigarName),
    [lookupData],
  );

  // ── Radar data: only fetch when at least 1 karigar selected ───────────
  const skipFetch = selectedKarigars.length === 0;

  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useGetProductivityScoreQuery(
    {
      karigars: selectedKarigars,
      startDate,
      endDate,
    },
    { skip: skipFetch, refetchOnMountOrArgChange: true },
  );

  // ── Pivot DTO list → Recharts radar shape ─────────────────────────────
  // OUT: [{ spoke, "Raju": 80, "Amit": 65 }, ...]
  const chartData = useMemo(() => {
    if (!rawData.length) return [];
    return SPOKES.map(({ key, label }) => {
      const row = { spoke: label };
      rawData.forEach((item) => {
        row[item.karigarName] = Number((item[key] ?? 0).toFixed(1));
      });
      return row;
    });
  }, [rawData]);

  const karigarNames = useMemo(
    () => rawData.map((d) => d.karigarName),
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

  // ── Karigar multi-select handler (max 3) ──────────────────────────────
  const handleKarigarChange = (e) => {
    const val =
      typeof e.target.value === "string"
        ? e.target.value.split(",")
        : e.target.value;
    setSelectedKarigars(val.slice(0, MAX_KARIGARS));
  };

  return (
    <Card sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* ── Title & Info Tooltip ─────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography
          variant="subtitle2"
          color="primary"
          textTransform="uppercase"
          fontWeight={700}
          letterSpacing={0.5}
        >
          Karigar Productivity Score
        </Typography>

        <MuiTooltip
          title={<MetricInfoContent />}
          placement="right"
          arrow
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: "background.paper",
                color: "text.primary",
                boxShadow: theme.shadows[4],
                border: `1px solid ${theme.palette.divider}`,
                maxWidth: 380,
              },
            },
            arrow: {
              sx: {
                color: "background.paper",
                "&::before": {
                  border: `1px solid ${theme.palette.divider}`,
                },
              },
            },
          }}
        >
          <IconButton size="small" sx={{ p: 0 }}>
            <InfoOutlinedIcon fontSize="small" color="action" />
          </IconButton>
        </MuiTooltip>
      </Box>

      {/* ── Filters row ──────────────────────────────────────────────────── */}
      <Box
        display="flex"
        gap={1.5}
        flexWrap="wrap"
        alignItems="center"
        mb={1.5}
      >
        {/* Karigar multi-select — max 3 */}
        <FormControl size="small" sx={{ minWidth: 200, maxWidth: 280 }}>
          <InputLabel id="ks-label">Compare Karigars (max 3)</InputLabel>
          <Select
            labelId="ks-label"
            multiple
            value={selectedKarigars}
            onChange={handleKarigarChange}
            input={<OutlinedInput label="Compare Karigars (max 3)" />}
            renderValue={(selected) => (
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {selected.map((v, i) => (
                  <Chip
                    key={v}
                    label={v}
                    size="small"
                    sx={{
                      bgcolor: RADAR_PALETTE[i]?.stroke,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
            )}
            disabled={lookupLoading}
          >
            {karigarOptions.map((name) => (
              <MenuItem
                key={name}
                value={name}
                disabled={
                  selectedKarigars.length >= MAX_KARIGARS &&
                  !selectedKarigars.includes(name)
                }
              >
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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

      {/* ── Chart body ───────────────────────────────────────────────────── */}
      <Box flex={1} minHeight={0}>
        {isLoading || lookupLoading ? (
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
            {error?.data?.message ?? "Failed to load productivity data."}
          </Alert>
        ) : skipFetch ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100%"
            gap={1}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Select up to 3 karigars above to compare their productivity
              scores.
            </Typography>
          </Box>
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
            <RadarChart
              data={chartData}
              margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
            >
              <PolarGrid stroke={theme.palette.divider} />

              <PolarAngleAxis
                dataKey="spoke"
                tick={{
                  fontSize: 11,
                  fill: theme.palette.text.primary,
                  fontWeight: 600,
                }}
              />

              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={6}
                tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                tickFormatter={(v) => `${v}`}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: 4 }}
                iconType="circle"
                iconSize={10}
              />

              {/* One polygon per karigar */}
              {karigarNames.map((name, i) => {
                const palette = RADAR_PALETTE[i % RADAR_PALETTE.length];
                return (
                  <Radar
                    key={name}
                    name={name}
                    dataKey={name}
                    stroke={palette.stroke}
                    fill={palette.fill}
                    fillOpacity={0.18}
                    strokeWidth={2}
                    dot={{ r: 3, fill: palette.stroke }}
                  />
                );
              })}
            </RadarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
