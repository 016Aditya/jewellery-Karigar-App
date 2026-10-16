import { Alert, Card, Divider, Grid, Paper, Typography } from "@mui/material";
import { f4 } from "./karigarLedgerUtils";

export default function KarigarLedgerSettlementCard({
  activeMetalLabel,
  outFine,
  inFine,
  balance,
  isSettled,
  shortLabel,
  metalColor,
  catPurities,
  reverseSettlement,
}) {
  return (
    <Card elevation={0} sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
      <Typography variant="subtitle1" fontWeight={800} mb={2}>
        Settlement Engine — {activeMetalLabel}
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Total Issued (OUT)
          </Typography>
          <Typography variant="h6" fontWeight={800}>
            {f4(outFine)} {shortLabel}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Total Returned (IN)
          </Typography>
          <Typography variant="h6" fontWeight={800}>
            {f4(inFine)} {shortLabel}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary">
            Net Balance
          </Typography>
          <Typography variant="h6" fontWeight={800} sx={{ color: metalColor }}>
            {f4(Math.abs(balance))} {shortLabel}
          </Typography>
        </Grid>
      </Grid>
      <Divider sx={{ mb: 2 }} />
      {isSettled ? (
        <Alert severity="success">
          Fully settled — no outstanding balance for {activeMetalLabel}.
        </Alert>
      ) : balance > 0 ? (
        <>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Karigar owes the facility {f4(balance)} {shortLabel}.
          </Alert>
          <Typography variant="body2" fontWeight={700} mb={1}>
            Equivalent gross weight to settle, by purity:
          </Typography>
          <Grid container spacing={1.5}>
            {catPurities.map((p) => (
              <Grid item xs={6} sm={4} md={3} key={p.key}>
                <Paper
                  elevation={0}
                  sx={{ p: 1.5, textAlign: "center", border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                >
                  <Typography variant="caption" color="text.secondary" display="block">
                    {p.label}
                  </Typography>
                  <Typography variant="body1" fontWeight={800}>
                    {f4(reverseSettlement(balance, p.key))}g
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Alert severity="info">
          Facility owes the karigar {f4(Math.abs(balance))} {shortLabel}.
        </Alert>
      )}
    </Card>
  );
}
