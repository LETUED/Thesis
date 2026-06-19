import { Skeleton } from "thesis-frontend";

export const Shapes = () => (
  <div className="w-72 space-y-3 p-6">
    <Skeleton className="h-6 w-2/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-24 w-full" />
  </div>
);
