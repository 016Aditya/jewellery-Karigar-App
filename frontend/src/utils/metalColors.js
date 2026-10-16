// Reference hex swatches per metal type, based on the purity/color chart provided by the client.
export const METAL_COLORS = {
  GOLD: "#FFD700", // 24K — Pure Gold
  YELLOW_GOLD: "#E8A020", // 18K Yellow (750)
  ROSE_GOLD: "#F4ACAC", // 18K Rose (750)
  WHITE_GOLD: "#C8C8C8", // 18K White (750)
  SILVER: "#BDBDBD", // Silver 925
  PLATINUM: "#A8C4E0", // Pt 950
};

export const getMetalColor = (metalType) => METAL_COLORS[metalType] || "#D4AF37";
