// S6 开灯 · 结尾
import React from "react";
import { config } from "../config";
import { s6 } from "../timeline";
import { Confetti } from "../components/Confetti";
import { PopText } from "../components/PopText";
import { pop } from "../lib/anim";

const ink = config.colors.ink;
const P = config.colors.party;

export const S6Ending: React.FC<{ frame: number }> = ({ frame: raw }) => {
  if (raw < s6.lightsOn) return null;
  const frame = Math.min(raw, s6.freeze); // 最后 1 秒定格
  const titleLines = config.endingTitle;
  let k = 0;
  return (
    <>
      <Confetti frame={frame} rain={{ from: s6.lightsOn, to: s6.freeze, n: 320, seed: 9, prefill: 140 }} />
      {config.endingLines.map((l, i) => (
        <PopText key={i} text={l} start={s6.lines[i]} frame={frame} y={470 + i * 118} size={i === 1 ? 64 : 54} step={2} slow={i !== 1} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", fontFamily: config.fonts.title, lineHeight: 1.05 }}>
        {titleLines.map((line, li) => (
          <div key={li} style={{ fontSize: li === 0 ? 168 : 210, whiteSpace: "nowrap" }}>
            {[...line].map((c) => {
              const idx = k++;
              const p = pop(frame, s6.title + idx * 2, 1.35);
              if (p <= 0) return <span key={idx} style={{ display: "inline-block", opacity: 0 }}>{c}</span>;
              return (
                <span
                  key={idx}
                  style={{
                    display: "inline-block",
                    color: P[(idx * 2 + 1) % 6],
                    WebkitTextStroke: `7px ${ink}`,
                    paintOrder: "stroke fill",
                    textShadow: `7px 7px 0 ${ink}`,
                    transform: `translateY(${(1 - Math.min(1, p)) * 80}px) scale(${p}) rotate(${(idx % 2 ? 1 : -1) * 4 * (1.6 - p)}deg)`,
                  }}
                >
                  {c}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <PopText text={config.signature} start={s6.signature} frame={frame} y={1340} size={46} step={1} color="#5c5563" />
    </>
  );
};
