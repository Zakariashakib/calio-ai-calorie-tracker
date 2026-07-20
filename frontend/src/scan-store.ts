import type { ScanResult } from "@/src/types";

let current: ScanResult | null = null;

export const scanStore = {
  set(value: ScanResult) { current = value; },
  get() { return current; },
  clear() { current = null; },
};
