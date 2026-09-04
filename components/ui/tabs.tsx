"use client";

import { cn } from "@/lib/utils";

export type TabItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-0.5 overflow-x-auto" role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-[13px] transition-colors",
              active
                ? "bg-white font-medium text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted hover:bg-white/60 hover:text-text",
            )}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                  active ? "bg-primary/10 text-primary" : "bg-bg text-muted",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
