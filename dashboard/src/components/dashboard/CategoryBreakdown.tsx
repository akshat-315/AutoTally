import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchCategoryBreakdown } from "@/lib/api";
import type { CategoryBreakdownItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import SectionHeader from "@/components/shared/SectionHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Tag, ArrowRight } from "lucide-react";

const RING_COLORS = [
  { stroke: "oklch(0.60 0.22 270)", bg: "oklch(0.60 0.22 270 / 10%)" },
  { stroke: "oklch(0.65 0.20 25)", bg: "oklch(0.65 0.20 25 / 10%)" },
  { stroke: "oklch(0.70 0.18 85)", bg: "oklch(0.70 0.18 85 / 10%)" },
  { stroke: "oklch(0.62 0.16 155)", bg: "oklch(0.62 0.16 155 / 10%)" },
  { stroke: "oklch(0.65 0.18 200)", bg: "oklch(0.65 0.18 200 / 10%)" },
  { stroke: "oklch(0.60 0.20 330)", bg: "oklch(0.60 0.20 330 / 10%)" },
  { stroke: "oklch(0.68 0.14 45)", bg: "oklch(0.68 0.14 45 / 10%)" },
  { stroke: "oklch(0.58 0.15 120)", bg: "oklch(0.58 0.15 120 / 10%)" },
];

const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({
  percentage,
  color,
  bgColor,
  animated,
  delay,
  children,
}: {
  percentage: number;
  color: string;
  bgColor: string;
  animated: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  const offset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={bgColor}
          strokeWidth={RING_STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={animated ? offset : RING_CIRCUMFERENCE}
          style={{
            transition: `stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function CategoryBreakdown() {
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<CategoryBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setAnimated(false);
    fetchCategoryBreakdown(startDate, endDate, "debit")
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    if (!loading && data.length > 0) {
      requestAnimationFrame(() => setAnimated(true));
    }
  }, [loading, data]);

  const total = data.reduce((s, d) => s + d.total_debited, 0);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <SectionHeader className="mb-1">Where Your Money Goes</SectionHeader>
        <p className="text-xs text-muted-foreground">
          {total > 0 ? `${formatCurrency(total)} across ${data.length} categories` : "Category spending breakdown"}
        </p>
      </div>

      <div className="px-5 pb-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={Tag} title="No spending data" />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {data.map((item, i) => {
              const pct = total > 0 ? (item.total_debited / total) * 100 : 0;
              const avg = item.transaction_count > 0
                ? item.total_debited / item.transaction_count
                : 0;
              const color = RING_COLORS[i % RING_COLORS.length];
              const isHovered = hoveredId === (item.category_id ?? -1);

              const handleClick = () => {
                if (item.category_id != null) {
                  navigate(`/category/${item.category_id}`);
                }
              };

              return (
                <div
                  key={item.category_id ?? "uncategorized"}
                  role="button"
                  tabIndex={0}
                  className="group relative rounded-xl border border-border/60 p-3 cursor-pointer"
                  style={{
                    opacity: animated ? 1 : 0,
                    transform: animated
                      ? (isHovered ? "translateY(-2px) scale(1)" : "translateY(0) scale(1)")
                      : "translateY(16px) scale(0.95)",
                    background: isHovered ? "var(--color-accent)" : undefined,
                    boxShadow: isHovered ? "0 2px 8px rgba(0,0,0,0.06)" : undefined,
                    transition: `opacity 0.4s ease ${i * 60}ms, transform 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) ${i * 60}ms, background 0.2s ease, box-shadow 0.2s ease`,
                  }}
                  onClick={handleClick}
                  onKeyDown={(e) => e.key === "Enter" && handleClick()}
                  onMouseEnter={() => setHoveredId(item.category_id ?? -1)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="flex items-start gap-3">
                    {/* Animated ring */}
                    <ProgressRing
                      percentage={pct}
                      color={color.stroke}
                      bgColor={color.bg}
                      animated={animated}
                      delay={i * 80 + 200}
                    >
                      <span className="text-sm">
                        {item.icon || item.category_name.charAt(0).toUpperCase()}
                      </span>
                    </ProgressRing>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1">
                        <h4 className="text-xs font-semibold truncate">{item.category_name}</h4>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <p className="text-base font-bold tabular-nums tracking-tight mt-0.5">
                        {formatCurrency(item.total_debited)}
                      </p>
                    </div>
                  </div>

                  {/* Bottom stats */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="tabular-nums font-medium" style={{ color: color.stroke }}>
                        {pct.toFixed(1)}%
                      </span>
                      <span className="h-3 w-px bg-border" />
                      <span className="tabular-nums">{item.transaction_count} txns</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      ~{formatCurrency(avg)}/txn
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
