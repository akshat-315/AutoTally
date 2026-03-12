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
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      {Icon && (
        <div className="mb-4 rounded-2xl bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px]">{description}</p>
      )}
    </div>
  );
}
