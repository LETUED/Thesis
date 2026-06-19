import { ThemeToggle } from "thesis-frontend";

export const InHeader = () => (
  <div className="flex w-72 items-center justify-between rounded-lg border border-border bg-card p-4">
    <span className="text-sm font-medium">테마</span>
    <ThemeToggle />
  </div>
);
