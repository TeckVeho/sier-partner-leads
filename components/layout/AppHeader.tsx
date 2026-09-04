"use client";

import { UserMenu } from "./UserMenu";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-0.5 border-b border-border bg-sidebar px-4">
      <UserMenu />
    </header>
  );
}
