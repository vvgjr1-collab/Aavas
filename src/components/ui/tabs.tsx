"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";

import { cn } from "./utils";

/**
 * An iOS-style segmented control: a recessed track with a single raised pill
 * that slides between segments.
 *
 * The slide needs to know which segment is selected, and Radix does not expose
 * its internal state. So `Tabs` mirrors the value it is already given - the
 * controlled `value`, or the uncontrolled one observed through
 * `onValueChange` - and publishes it on a context alongside a `useId` that
 * scopes the shared layout animation to this one tab bar. Radix stays the
 * source of truth for behaviour and ARIA; this only watches.
 */
const SegmentedContext = React.createContext<{
  value: string | undefined;
  pillId: string;
} | null>(null);

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const pillId = React.useId();
  const current = value !== undefined ? value : uncontrolled;

  const handleValueChange = React.useCallback(
    (next: string) => {
      setUncontrolled(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );

  return (
    <SegmentedContext.Provider value={{ value: current, pillId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </SegmentedContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-black/[0.05] dark:bg-white/[0.06] text-muted-foreground inline-flex h-[3.25rem] sm:h-11 w-fit items-center justify-center gap-1 rounded-2xl p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const ctx = React.useContext(SegmentedContext);
  const isActive = ctx?.value === value;

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium whitespace-nowrap select-none",
        "text-muted-foreground data-[state=active]:text-foreground",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {isActive && ctx && (
        <motion.span
          layoutId={ctx.pillId}
          aria-hidden
          className="absolute inset-0 rounded-xl bg-card shadow-[var(--shadow-sm)]"
          transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
