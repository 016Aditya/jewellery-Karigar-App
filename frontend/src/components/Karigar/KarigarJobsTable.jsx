import React from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Avatar,
  Chip,
  Button,
  Typography,
  Skeleton,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Engineering, LocalShipping, TaskAlt } from "@mui/icons-material";

function StatusChip({ status }) {
  const theme = useTheme();
  const isCompleted = status === "Completed";
  return (
    <Chip
      size="small"
      label={status}
      icon={isCompleted ? <TaskAlt sx={{ fontSize: 16 }} /> : undefined}
      sx={{
        fontWeight: 700,
        borderRadius: 1.5,
        color: isCompleted
          ? theme.palette.success.dark
          : theme.palette.warning.dark,
        background: isCompleted
          ? alpha(theme.palette.success.main, 0.14)
          : alpha(theme.palette.warning.main, 0.14),
      }}
    />
  );
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton variant="text" width={j === 1 ? 140 : 70} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function KarigarJobsTable({ jobs, isLoading, onReceive, onSettle }) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      }}
    >
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Job ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Karigar</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Item / Order</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Work Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Qty
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Metal Issued
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows />
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Box py={5} textAlign="center">
                    <Engineering
                      sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      No jobs assigned yet.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {job.jobId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar
                        sx={{
                          width: 30,
                          height: 30,
                          fontSize: 13,
                          fontWeight: 700,
                          bgcolor: theme.palette.goldAccent.lightBg,
                          color: theme.palette.goldAccent.text,
                        }}
                      >
                        {job.karigarName?.charAt(0) || "?"}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {job.karigarName}
                        </Typography>
                        {job.karigarType && (
                          <Typography variant="caption" color="text.secondary">
                            {job.karigarType === "FULL_TIME"
                              ? "Full-Time"
                              : "Contract"}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {job.itemName || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.itemCode} • Order #{job.billId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{job.workType}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Std. wastage {job.expectedWastagePercent}%
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {job.quantity ?? 1}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700}>
                      {(job.estimatedMetalRequired != null
                        ? Number(job.estimatedMetalRequired)
                        : 0
                      ).toFixed(3)}{" "}
                      g
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.goldPurity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={job.status} />
                  </TableCell>
                  <TableCell align="right">
                    {job.status === "Assigned" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LocalShipping sx={{ fontSize: 16 }} />}
                        onClick={() => onReceive(job)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Receive
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => onSettle(job)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Settle
                      </Button>
                    )}
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
