"use client";

import { useTranslation } from "@/lib/i18n/provider";

interface ScoreCircleProps {
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function ScoreCircle({ score }: ScoreCircleProps) {
  const { t } = useTranslation();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={120} viewBox="0 0 120 120" className="-rotate-90">
        {/* Background track */}
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke="var(--color-outline-variant)"
          strokeWidth={8}
        />
        {/* Score arc */}
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-emphasized)]"
        />
      </svg>
      {/* Center text overlay */}
      <div className="-mt-[84px] mb-[24px] flex flex-col items-center">
        <span
          className="nums text-[40px] leading-none font-bold"
          style={{ color: scoreColor(score) }}
        >
          {score}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {t("applicants.analysis.match_score")}
        </span>
      </div>
    </div>
  );
}
