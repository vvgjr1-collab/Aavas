import * as React from "react";

import { cn } from "./utils";

// See ui/input.tsx: react-hook-form and Radix `asChild` both hand this a ref,
// which a plain function component would drop.
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        // Matches ui/input.tsx: filled by default, edged only on focus.
        "resize-none placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content min-h-20 w-full rounded-xl border border-transparent bg-input-background px-4 py-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "transition-[color,box-shadow,background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:bg-muted focus-visible:bg-card focus-visible:border-ring/60 focus-visible:ring-ring/25 focus-visible:ring-[3.5px] focus-visible:shadow-[var(--shadow-xs)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
