// 全片叠加：暖光（soft-light）+ 暗角
import React from "react";
import { AbsoluteFill } from "remotion";

export const WarmLight: React.FC<{ strength?: number; night?: boolean }> = ({ strength = 1, night }) => (
  <>
    <AbsoluteFill
      style={{
        mixBlendMode: "soft-light",
        opacity: 0.55 * strength,
        background: night
          ? "radial-gradient(ellipse 85% 75% at 30% 18%, rgba(255,210,160,0.45) 0%, rgba(255,190,140,0.12) 45%, rgba(0,0,0,0.3) 100%)"
          : "radial-gradient(ellipse 90% 80% at 28% 16%, rgba(255,226,180,0.95) 0%, rgba(255,214,160,0.45) 40%, rgba(120,70,40,0.35) 100%)",
        pointerEvents: "none",
      }}
    />
    <AbsoluteFill
      style={{
        mixBlendMode: "multiply",
        opacity: strength,
        background: night
          ? "radial-gradient(ellipse 78% 72% at 50% 48%, rgba(0,0,0,0) 55%, rgba(5,8,20,0.45) 100%)"
          : "radial-gradient(ellipse 80% 75% at 50% 46%, rgba(0,0,0,0) 58%, rgba(90,55,30,0.28) 100%)",
        pointerEvents: "none",
      }}
    />
  </>
);
