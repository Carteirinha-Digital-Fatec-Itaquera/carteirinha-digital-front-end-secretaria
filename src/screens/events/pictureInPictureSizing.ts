export type PipSize = "sm" | "md" | "lg";
export const PIP_DIMENSIONS: Record<PipSize, { width: number; height: number }> = {
  sm: { width: 180, height: 212 },
  md: { width: 240, height: 272 },
  lg: { width: 340, height: 372 },
};
