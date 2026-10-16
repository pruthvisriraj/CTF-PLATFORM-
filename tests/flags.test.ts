import { describe, it, expect } from "vitest";
import { normalizeFlag, hashFlag, checkFlag } from "@/lib/flags";

describe("normalizeFlag", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeFlag("  FIN-WS-042 ")).toBe("fin-ws-042");
    expect(normalizeFlag("Isolate   affected\tmachines\nfrom the network")).toBe(
      "isolate affected machines from the network"
    );
  });
  it("is idempotent", () => {
    const once = normalizeFlag(" A  b ");
    expect(normalizeFlag(once)).toBe(once);
  });
});

describe("hashFlag", () => {
  it("produces a 64-char hex sha256 of the normalized value", () => {
    const h = hashFlag("invoices@northw1nd-billing.com");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe("" + hashFlag("  INVOICES@northw1nd-billing.COM "));
  });
  it("differs for different inputs", () => {
    expect(hashFlag("a")).not.toBe(hashFlag("b"));
  });
});

describe("checkFlag", () => {
  const stored = hashFlag("customer_master_2026.xlsx");
  it("accepts matching answers regardless of case and spacing", () => {
    expect(checkFlag("Customer_Master_2026.XLSX", stored)).toBe(true);
    expect(checkFlag("  customer_master_2026.xlsx\n", stored)).toBe(true);
  });
  it("rejects wrong answers", () => {
    expect(checkFlag("customer_master_2025.xlsx", stored)).toBe(false);
    expect(checkFlag("", stored)).toBe(false);
  });
  it("rejects malformed stored hashes", () => {
    expect(checkFlag("x", "")).toBe(false);
    expect(checkFlag("x", "abc")).toBe(false);
  });
});
