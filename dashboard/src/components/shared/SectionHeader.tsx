import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function SectionHeader({ children, className, action }: Props) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-sm font-semibold text-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}
