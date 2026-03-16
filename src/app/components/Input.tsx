import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export function Input({ icon, className = "", ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </div>
      )}
      <input
        className={`w-full bg-input-background border border-border rounded-[12px] px-4 py-3 ${
          icon ? "pl-12" : ""
        } text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/20 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${className}`}
        {...props}
      />
    </div>
  );
}
