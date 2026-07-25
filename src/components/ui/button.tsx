import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] focus:ring-[var(--primary)]",
      secondary:
        "bg-[var(--secondary)] text-[var(--dark)] hover:bg-[var(--secondary-dark)] focus:ring-[var(--secondary)]",
      outline:
        "border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white focus:ring-[var(--primary)]",
      ghost:
        "text-[var(--primary)] hover:bg-[var(--primary)]/10 focus:ring-[var(--primary)]",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
