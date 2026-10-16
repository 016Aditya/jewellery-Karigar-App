import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Fade,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  ErrorOutline as ErrorIcon,
  TaskAlt as TaskAltIcon,
} from "@mui/icons-material";
import { EXPORT_STEPS } from "./karigarLedgerUtils";

// Small "typing" ellipsis for the active step — cycles 1 to 3 dots to give an
// Agentic-AI-style "still working" feel next to the active label.
function TypingDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c % 3) + 1), 350);
    return () => clearInterval(id);
  }, []);
  return <span>{".".repeat(count)}</span>;
}

export default function KarigarLedgerExportProgressDialog({
  open,
  status, // running | success | error
  stepIndex,
  errorMsg,
  onClose,
  onRetry,
}) {
  return (
    <Dialog
      open={open}
      onClose={status === "running" ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <DialogContent sx={{ p: 4 }}>
        {status === "error" ? (
          <Fade in>
            <Box textAlign="center" py={2}>
              <ErrorIcon sx={{ fontSize: 56, color: "error.main", mb: 1.5 }} />
              <Typography variant="h6" fontWeight={800} mb={0.5}>
                Export failed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {errorMsg}
              </Typography>
            </Box>
          </Fade>
        ) : status === "success" ? (
          <Fade in>
            <Box textAlign="center" py={2}>
              <TaskAltIcon sx={{ fontSize: 56, color: "success.main", mb: 1.5 }} />
              <Typography variant="h6" fontWeight={800} mb={0.5}>
                Export complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your Excel file has finished downloading.
              </Typography>
            </Box>
          </Fade>
        ) : (
          <Box py={1}>
            <Typography variant="h6" fontWeight={800} mb={3} textAlign="center">
              Building Your Export
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              {EXPORT_STEPS.map((label, idx) => {
                const isDone = idx < stepIndex;
                const isActive = idx === stepIndex;
                return (
                  <Box
                    key={label}
                    display="flex"
                    alignItems="center"
                    gap={1.5}
                    sx={{ opacity: isDone || isActive ? 1 : 0.4, transition: "opacity 0.3s ease" }}
                  >
                    {isDone ? (
                      <CheckCircleIcon sx={{ color: "success.main", fontSize: 22 }} />
                    ) : isActive ? (
                      <CircularProgress size={18} thickness={5} />
                    ) : (
                      <PendingIcon sx={{ color: "text.disabled", fontSize: 22 }} />
                    )}
                    <Typography
                      variant="body2"
                      fontWeight={isActive ? 700 : 500}
                      color={isDone || isActive ? "text.primary" : "text.disabled"}
                    >
                      {label}
                      {isActive && <TypingDots />}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
      {status !== "running" && (
        <DialogActions sx={{ px: 4, pb: 3, pt: 0 }}>
          {status === "error" ? (
            <>
              <Button onClick={onClose} color="inherit">
                Cancel
              </Button>
              <Button variant="contained" onClick={onRetry}>
                Try Again
              </Button>
            </>
          ) : (
            <Button fullWidth variant="contained" onClick={onClose}>
              OK
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}
