import { useEffect, useRef, useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

// Truncates text with an ellipsis and — only when it's actually clipped, detected via
// scrollWidth vs clientWidth — shows a small info icon that reveals the full value on
// hover. Used anywhere a table cell's content is too long to always show in full
// (Type/Description), so the icon never appears for short values that already fit.
export default function OverflowText({ text, variant = "body2", color, sx }) {
  const ref = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <Box display="flex" alignItems="center" gap={0.5} minWidth={0}>
      <Typography
        ref={ref}
        variant={variant}
        color={color}
        noWrap
        sx={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, ...sx }}
      >
        {text || "—"}
      </Typography>
      {isOverflowing && (
        <Tooltip title={text} arrow placement="top">
          <InfoOutlined
            sx={{
              fontSize: 15,
              color: "text.secondary",
              flexShrink: 0,
              cursor: "default",
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
