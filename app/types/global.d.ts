// types/global.d.ts
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export {};