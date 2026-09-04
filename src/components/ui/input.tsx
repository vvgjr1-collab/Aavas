import * as React from "react";

import { cn } from "./utils";

// forwardRef matters here: react-hook-form focuses the first invalid field
// through the ref it hands to a Controller's render prop, and Radix primitives
// pass a ref through `asChild`. A plain function component drops it silently.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        // A recessed, softly filled field - iOS/macOS forms use fill rather than
        // outline, and only draw an edge once the field has focus.
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex h-11 w-full min-w-0 rounded-xl border border-transparent px-4 py-1 text-base bg-input-background outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "transition-[color,box-shadow,background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:bg-muted focus-visible:bg-card focus-visible:border-ring/60 focus-visible:ring-ring/25 focus-visible:ring-[3.5px] focus-visible:shadow-[var(--shadow-xs)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
