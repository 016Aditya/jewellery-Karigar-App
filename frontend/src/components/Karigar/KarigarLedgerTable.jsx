import {
  Box,
  Chip,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { AccountBalanceWallet, ArrowDownward, ArrowUpward } from "@mui/icons-material";
import OverflowText from "./OverflowText";
import { f4, f6 } from "./karigarLedgerUtils";

// Fixed pixel widths per column, keyed by header label. Merged and split views render
// this exact same table (just with different `rows`), so columns never differ in width,
// order, or count between the two — only which rows are shown changes.
const COLUMN_WIDTH = {
  "#": 44,
  Date: 96,
  Type: 190,
  Purity: 168,
  "Gross Wt": 96,
  Factor: 84,
  "Fine Conversion": 200,
  "Fine Wt": 96,
  "Running Balance": 140,
  "Job Card": 110,
  Description: 220,
};
const COLUMNS = [
  "#",
  "Date",
  "Type",
  "Purity",
  "Gross Wt",
  "Factor",
  "Fine Conversion",
  "Fine Wt",
  "Running Balance",
  "Job Card",
  "Description",
];
const RIGHT_ALIGN = ["Gross Wt", "Factor", "Fine Wt", "Running Balance"];
const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, h) => sum + COLUMN_WIDTH[h], 0);

// Entry type labels above this length (USED_IN_ORDER, SCRAP_RETURNED_FOR_ORDER) get
// truncated inside the fixed-width chip — the tooltip surfaces the full value on hover.
const TYPE_TRUNCATE_LEN = 10;

export default function KarigarLedgerTable({
  rows,
  title,
  subtitle,
  isLoading,
  purities,
  shortLabel,
  metalColor,
}) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        overflow: "hidden",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: theme.palette.background.paper,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box minWidth={0}>
          <Typography variant="subtitle1" fontWeight={800} noWrap>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={<AccountBalanceWallet sx={{ fontSize: 14 }} />}
          label={`${rows.length} txn${rows.length !== 1 ? "s" : ""}`}
          sx={{ fontWeight: 700, flexShrink: 0 }}
        />
      </Box>
      <TableContainer sx={{ flex: 1 }}>
        <Table sx={{ minWidth: TABLE_MIN_WIDTH, tableLayout: "fixed" }} size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((h) => (
                <TableCell
                  key={h}
                  align={RIGHT_ALIGN.includes(h) ? "right" : "left"}
                  sx={{
                    width: COLUMN_WIDTH[h],
                    color: theme.palette.text.secondary,
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    py: 1.25,
                    borderBottom: `2px solid ${metalColor}55`,
                    background: alpha(metalColor, 0.06),
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {COLUMNS.map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton width={j === 6 ? 100 : 44} height={16} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 5 }}>
                  <Typography variant="body2" color="text.secondary">
                    No transactions recorded yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e, rowIdx) => (
                <TableRow
                  key={e.id}
                  hover
                  sx={{
                    background:
                      rowIdx % 2 === 1 ? alpha(theme.palette.text.primary, 0.015) : "none",
                  }}
                >
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {e.idx}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="body2">{e.date}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5} minWidth={0}>
                      <Chip
                        size="small"
                        icon={
                          e.entryType === "ISSUE" ? (
                            <ArrowUpward sx={{ fontSize: 13 }} />
                          ) : (
                            <ArrowDownward sx={{ fontSize: 13 }} />
                          )
                        }
                        label={e.entryType}
                        color={e.entryType === "ISSUE" ? "warning" : "success"}
                        sx={{
                          fontWeight: 700,
                          fontSize: 10.5,
                          height: 22,
                          maxWidth: "100%",
                          "& .MuiChip-label": {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                      {e.entryType.length > TYPE_TRUNCATE_LEN && (
                        <Tooltip title={e.entryType} arrow placement="top">
                          <Typography
                            component="span"
                            sx={{
                              fontSize: 15,
                              color: "text.secondary",
                              flexShrink: 0,
                              cursor: "default",
                              lineHeight: 1,
                            }}
                          >
                            ⓘ
                          </Typography>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={purities.find((p) => p.key === e.purity)?.label || e.purity}
                      sx={{
                        bgcolor: `${metalColor}18`,
                        border: `1px solid ${metalColor}55`,
                        fontSize: 10.5,
                        fontWeight: 600,
                        height: 22,
                        maxWidth: "100%",
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {f4(e.grossWeight)}g
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {f6(e.purityFactor)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                      {f4(e.grossWeight)} × {f6(e.purityFactor)} = {f4(e.fineWeight)} {shortLabel}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      fontWeight={700}
                      variant="body2"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {f4(e.fineWeight)}g
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      fontWeight={800}
                      variant="body2"
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        color: e.runningBalance >= 0 ? metalColor : "success.main",
                      }}
                    >
                      {f4(Math.abs(e.runningBalance))} {shortLabel}{" "}
                      {e.runningBalance >= 0 ? "" : "(cr.)"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <OverflowText text={e.jobCard || "—"} />
                  </TableCell>
                  <TableCell>
                    <OverflowText text={e.description} color="text.secondary" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
