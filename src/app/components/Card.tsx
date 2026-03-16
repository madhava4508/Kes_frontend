import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, onClick }: CardProps) {
  return (
    <div 
      className={`bg-card border border-border rounded-[16px] p-6 ${
        hover 
          ? "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-white/12 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:translate-y-[-2px]" 
          : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
