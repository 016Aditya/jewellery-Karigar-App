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
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { useGetKarigarJobVolumeQuery } from "../../features/api/apiSlice";

const COLORS = {
  assigned: "#C9A84C",
  completed: "#2e7d32",
  pending: "#E65100",
};

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
      {payload.map((entry) => (
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
              borderRadius: "50%",
              bgcolor: entry.fill,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {entry.name}:&nbsp;
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {entry.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

const MONTHS = [
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function KarigarJobVolumeChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const {
    data: chartData = [],
    isLoading,
    isError,
    error,
  } = useGetKarigarJobVolumeQuery(
    { year: selectedYear, month: selectedMonth },
    { refetchOnMountOrArgChange: true },
  );

  const transformedData = chartData.map((item) => ({
    name: item.karigarName,
    Assigned: item.totalAssigned,
    Completed: item.totalCompleted,
    Pending: item.totalPending,
  }));

  return (
    <Card sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* Header + Filters */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={2}
      >
        <Typography
          variant="subtitle2"
          color="primary"
          textTransform="uppercase"
          fontWeight={700}
          letterSpacing={0.5}
        >
          Karigar-wise Job Volume
        </Typography>

        <Box display="flex" gap={1.5} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="kjv-month-label">Month</InputLabel>
            <Select
              labelId="kjv-month-label"
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel id="kjv-year-label">Year</InputLabel>
            <Select
              labelId="kjv-year-label"
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEARS.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Chart body */}
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
            {error?.data?.message ?? "Failed to load karigar job volume data."}
          </Alert>
        ) : transformedData.length === 0 ? (
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
            <BarChart
              data={transformedData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              barCategoryGap="25%"
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
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                label={{
                  value: "Jobs",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: theme.palette.action.hover }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: 8 }}
                iconType="circle"
                iconSize={10}
              />
              <Bar
                dataKey="Assigned"
                name="Assigned"
                fill={COLORS.assigned}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="Completed"
                name="Completed"
                fill={COLORS.completed}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="Pending"
                name="Pending"
                fill={COLORS.pending}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
