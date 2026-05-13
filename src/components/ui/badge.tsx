import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700",
        className,
      )}
    >
      {children}
    </span>
  );
}
