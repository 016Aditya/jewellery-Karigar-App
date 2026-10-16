import React, { useEffect, useRef, useState } from "react";
import { Card, Box, Skeleton } from "@mui/material";

// Defers mounting (and therefore the RTK Query fetch) of an expensive dashboard chart
// until it scrolls near the viewport. Once mounted it stays mounted — we don't want
// charts to unmount/refetch every time the user scrolls past them.
export default function LazyChartMount({ cardHeight = 460, children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  if (visible) return children;

  return (
    <Card
      ref={ref}
      sx={{ p: 3, height: cardHeight, boxSizing: "border-box", display: "flex", flexDirection: "column" }}
    >
      <Skeleton variant="text" width="35%" height={28} sx={{ mb: 2 }} />
      <Box flex={1} display="flex" alignItems="flex-end" gap={1.5}>
        {[0.5, 0.8, 0.4, 0.9, 0.6, 0.7].map((h, i) => (
          <Skeleton key={i} variant="rounded" width="100%" height={`${h * 100}%`} />
        ))}
      </Box>
    </Card>
  );
}
