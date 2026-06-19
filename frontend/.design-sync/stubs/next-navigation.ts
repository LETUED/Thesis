// design-sync preview stub for next/navigation — no-op router so previews don't crash.
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
});
export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const redirect = (_url: string) => {};
export const permanentRedirect = (_url: string) => {};
export const notFound = () => {};
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = (): string[] => [];
