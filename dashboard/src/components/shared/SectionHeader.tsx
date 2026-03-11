import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ children, className }: Props) {
  return (
    <h2
      className={cn(
        "text-xs font-medium text-muted-foreground uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </h2>
  );
}
