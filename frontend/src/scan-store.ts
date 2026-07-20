import type { ScanResult } from "@/src/types";

let current: ScanResult | null = null;
let beforeScan: (ScanResult & { image_base64: string }) | null = null;

export const scanStore = {
  set(value: ScanResult) { current = value; },
  get() { return current; },
  clear() { current = null; },

  // Before/after comparison pair
  setBefore(value: ScanResult & { image_base64: string }) { beforeScan = value; },
  getBefore() { return beforeScan; },
  clearBefore() { beforeScan = null; },
};
