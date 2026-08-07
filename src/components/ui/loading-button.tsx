import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  children: ReactNode;
}

/**
 * Button primitive with baked-in loading and momentary success states.
 * Wraps the app's default primary style; consumers pass className to override.
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    { loading, success, loadingLabel, successLabel, disabled, className, children, ...rest },
    ref,
  ) => {
    const isBusy = loading || success;
    return (
      <button
        ref={ref}
        {...rest}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {success && !loading && <Check className="h-4 w-4 animate-scale-in" />}
        <span className={cn(isBusy && "opacity-90")}>
          {loading ? (loadingLabel ?? children) : success ? (successLabel ?? children) : children}
        </span>
      </button>
    );
  },
);
LoadingButton.displayName = "LoadingButton";
