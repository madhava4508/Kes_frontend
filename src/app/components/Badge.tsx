import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success";
  className?: string;
}

export function Badge({ children, variant = "primary", className = "" }: BadgeProps) {
  const variants = {
    primary: "bg-white/10 text-foreground border-white/10",
    secondary: "bg-white/5 text-muted-foreground border-white/8",
    success: "bg-white/10 text-foreground border-white/10",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 border rounded-full text-xs tracking-wide font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
