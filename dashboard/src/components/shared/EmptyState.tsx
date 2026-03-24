import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {Icon && (
        <div className="mb-3 rounded bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[260px]">{description}</p>
      )}
    </div>
  );
}
