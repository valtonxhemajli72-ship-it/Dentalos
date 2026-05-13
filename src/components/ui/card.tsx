import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-lg border border-line bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}
