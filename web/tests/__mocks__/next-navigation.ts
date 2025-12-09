export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  prefetch: () => Promise.resolve(),
  refresh: () => {},
  back: () => {},
  forward: () => {},
});

export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
export const redirect = () => {};
export const notFound = () => {};
