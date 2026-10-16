import { useState, useRef, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  Button,
  LinearProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Skeleton,
  Fade,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  ErrorOutline as ErrorIcon,
  TaskAlt as TaskAltIcon,
  Inventory2 as OrderIcon,
} from "@mui/icons-material";
import {
  useGetTrackingsQuery,
  useUpdateTrackingStatusMutation,
} from "../features/api/apiSlice";
import StatusTag from "../components/StatusTag";

const STAGES = [
  "Design",
  "Manufacturing",
  "Stone Setting",
  "Polishing",
  "Quality Check",
  "Ready",
  "Dispatched",
];

// Steps for the "Advance Stage" progress modal. The first two are timer-driven purely for
// visual feedback; the third ("confirming") is tied to the real network round trip (update
// + refetching the latest list) and stays active until that actually resolves.
const ADVANCE_STEPS = [
  { key: "tracking-order", label: "Tracking this order in database" },
  { key: "marking-stage", label: "Marking current stage as completed" },
  { key: "confirming", label: "Getting confirmation" },
];

// Groups the flat tracking rows into one entry per order (Bill). The backend already
// orders newest bill first with each order's items adjacent, so a Map (which preserves
// insertion order) is enough to produce grouped, newest-first orders with no re-sorting.
function groupByOrder(trackings) {
  const map = new Map();
  trackings.forEach((t) => {
    if (!map.has(t.billId)) {
      map.set(t.billId, { billId: t.billId, customer: t.customer, items: [] });
    }
    map.get(t.billId).items.push(t);
  });
  return Array.from(map.values());
}

function OrderCardSkeleton() {
  return (
    <Card sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box>
          <Skeleton width={120} height={16} sx={{ mb: 1 }} />
          <Skeleton width={160} height={24} sx={{ mb: 0.5 }} />
          <Skeleton width={100} height={16} />
        </Box>
        <Skeleton variant="rounded" width={70} height={28} />
      </Box>
      <Skeleton variant="rounded" height={6} />
    </Card>
  );
}

export default function LiveTracking() {
  // FIXED: Added refetchOnMountOrArgChange to force a fresh API call every time this page opens
  const {
    data: trackings = [],
    isLoading,
    refetch,
  } = useGetTrackingsQuery(undefined, { refetchOnMountOrArgChange: true });

  const [updateStatus] = useUpdateTrackingStatusMutation();

  const [selectedBillId, setSelectedBillId] = useState(null);

  const [advanceItem, setAdvanceItem] = useState(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceStatus, setAdvanceStatus] = useState("running"); // running | success | error
  const [advanceStepIndex, setAdvanceStepIndex] = useState(0);
  const advTimersRef = useRef([]);

  const clearAdvTimers = () => {
    advTimersRef.current.forEach((t) => clearTimeout(t));
    advTimersRef.current = [];
  };

  useEffect(() => clearAdvTimers, []);

  const orders = groupByOrder(trackings);
  const selectedOrder = selectedBillId
    ? orders.find((o) => o.billId === selectedBillId)
    : null;

  const runAdvanceSequence = (item) => {
    clearAdvTimers();
    setAdvanceItem(item);
    setAdvanceStatus("running");
    setAdvanceStepIndex(0);
    setAdvanceOpen(true);

    const STEP_DELAY = 550;

    const t1 = setTimeout(() => setAdvanceStepIndex(1), STEP_DELAY);
    const t2 = setTimeout(async () => {
      setAdvanceStepIndex(2);
      try {
        const currentIndex = STAGES.indexOf(item.status);
        const nextIndex = Math.min(currentIndex + 1, STAGES.length - 1);
        await updateStatus({
          itemId: item.itemId,
          status: STAGES[nextIndex],
          progress: Math.round(((nextIndex + 1) / STAGES.length) * 100),
        }).unwrap();
        // This is the slow part — stay on "confirming" until the fresh list has actually
        // come back, instead of declaring success as soon as the update PUT resolves.
        await refetch();
        setAdvanceStatus("success");
      } catch (err) {
        setAdvanceStatus("error");
      }
    }, STEP_DELAY * 2);

    advTimersRef.current = [t1, t2];
  };

  const handleAdvanceClick = (item) => runAdvanceSequence(item);
  const handleAdvanceRetry = () => advanceItem && runAdvanceSequence(advanceItem);
  const handleAdvanceModalOk = () => setAdvanceOpen(false);
  const handleAdvanceCancel = () => {
    clearAdvTimers();
    setAdvanceOpen(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Live Item Tracking</Typography>
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <OrderCardSkeleton key={i} />)
        ) : orders.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" mt={4}>
            No tracking items found. Generate a bill to start tracking items.
          </Typography>
        ) : (
          orders.map((order) => {
            const avgProgress = Math.round(
              order.items.reduce((s, i) => s + (i.progress || 0), 0) /
                order.items.length,
            );
            const allDone = order.items.every((i) => i.progress === 100);
            return (
              <Card
                key={order.billId}
                sx={{
                  p: 2,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "0.2s",
                  "&:hover": { borderColor: "primary.main" },
                }}
                onClick={() => setSelectedBillId(order.billId)}
              >
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Box>
                    <Box display="flex" gap={1} mb={1} alignItems="center">
                      <Typography
                        variant="caption"
                        color="primary"
                        fontFamily="monospace"
                        sx={{ bgcolor: "action.hover", px: 1, borderRadius: 1 }}
                      >
                        BILL: {order.billId}
                      </Typography>
                      <StatusTag status={allDone ? "Dispatched" : "In Progress"} />
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      {order.customer}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}{" "}
                      in this order
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.7,
                      color: "text.secondary",
                    }}
                  >
                    <OrderIcon fontSize="small" />
                    <Typography variant="caption">View order</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <LinearProgress
                    variant="determinate"
                    value={avgProgress}
                    color={avgProgress === 100 ? "success" : "primary"}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {avgProgress}%
                  </Typography>
                </Box>
              </Card>
            );
          })
        )}
      </Box>

      {/* --- ORDER MODAL: every item that belongs to this single order/Bill --- */}
      <Dialog
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedBillId(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedOrder && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pb: 1,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="primary"
                  textTransform="uppercase"
                >
                  Order Tracking
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {selectedOrder.customer}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Bill No: {selectedOrder.billId}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedBillId(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3 }}>
              <Box display="flex" flexDirection="column" gap={2}>
                {selectedOrder.items.map((item) => (
                  <Card
                    key={item.itemId}
                    variant="outlined"
                    sx={{ p: 2, boxShadow: "none" }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1.5}
                    >
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {item.itemName}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          <StatusTag status={item.status} />
                          <Typography variant="caption" color="text.secondary">
                            {item.progress}%
                          </Typography>
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        color="primary"
                        fontFamily="Georgia, serif"
                        fontWeight={700}
                      >
                        ₹{item.amount?.toLocaleString() || 0}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.progress}
                      color={item.progress === 100 ? "success" : "primary"}
                      sx={{ height: 5, borderRadius: 3, mb: 1.5 }}
                    />
                    <Button
                      fullWidth
                      size="small"
                      variant={item.status === "Dispatched" ? "outlined" : "contained"}
                      disabled={item.status === "Dispatched"}
                      onClick={() => handleAdvanceClick(item)}
                    >
                      {item.status === "Dispatched" ? "COMPLETED" : "ADVANCE STAGE"}
                    </Button>
                  </Card>
                ))}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* --- ADVANCE STAGE MODAL: same step-by-step pattern as the Domestic bill submit modal --- */}
      <Dialog
        open={advanceOpen}
        onClose={() => {}}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogContent sx={{ p: 4 }}>
          {advanceStatus === "error" ? (
            <Fade in>
              <Box textAlign="center" py={2}>
                <ErrorIcon sx={{ fontSize: 56, color: "error.main", mb: 1.5 }} />
                <Typography variant="h6" fontWeight={800} mb={0.5}>
                  Oops, ran into a problem
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try again later or check your network connection.
                </Typography>
              </Box>
            </Fade>
          ) : advanceStatus === "success" ? (
            <Fade in>
              <Box textAlign="center" py={2}>
                <TaskAltIcon sx={{ fontSize: 56, color: "success.main", mb: 1.5 }} />
                <Typography variant="h6" fontWeight={800} mb={0.5}>
                  Complete
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stage updated and confirmed by the server.
                </Typography>
              </Box>
            </Fade>
          ) : (
            <Box py={1}>
              <Typography
                variant="h6"
                fontWeight={800}
                mb={3}
                textAlign="center"
              >
                Updating Tracking
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {ADVANCE_STEPS.map((step, idx) => {
                  const isDone = idx < advanceStepIndex;
                  const isActive = idx === advanceStepIndex;
                  return (
                    <Box
                      key={step.key}
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                      sx={{
                        opacity: isDone || isActive ? 1 : 0.4,
                        transition: "opacity 0.3s ease",
                      }}
                    >
                      {isDone ? (
                        <CheckCircleIcon
                          sx={{ color: "success.main", fontSize: 22 }}
                        />
                      ) : isActive ? (
                        <CircularProgress size={18} thickness={5} />
                      ) : (
                        <PendingIcon
                          sx={{ color: "text.disabled", fontSize: 22 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        fontWeight={isActive ? 700 : 500}
                        color={
                          isDone || isActive ? "text.primary" : "text.disabled"
                        }
                      >
                        {step.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        {advanceStatus !== "running" && (
          <DialogActions sx={{ px: 4, pb: 3, pt: 0 }}>
            {advanceStatus === "error" ? (
              <>
                <Button onClick={handleAdvanceCancel} color="inherit">
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleAdvanceRetry}>
                  Try Again
                </Button>
              </>
            ) : (
              <Button fullWidth variant="contained" onClick={handleAdvanceModalOk}>
                OK
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
