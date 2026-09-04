import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="w-full px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
