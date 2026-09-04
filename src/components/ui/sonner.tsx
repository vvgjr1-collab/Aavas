"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        // A floating notification pane rather than a flat box: frosted, deeply
        // rounded, and lifted off the page by an ambient shadow.
        classNames: {
          toast:
            "rounded-2xl border-[var(--hairline)] shadow-[var(--shadow-lg)] backdrop-blur-xl",
        },
      }}
      style={
        {
          "--normal-bg": "var(--material-thick)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--hairline)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
