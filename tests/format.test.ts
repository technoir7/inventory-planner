import { describe, it, expect } from "vitest";
import { formatNumber, formatNullableNumber } from "@/lib/format";

describe("formatNumber", () => {
  it("formats integers without decimals by default", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats fractional values with 2 decimal places by default", () => {
    expect(formatNumber(3.14159)).toBe("3.14");
  });

  it("respects maximumFractionDigits = 4", () => {
    expect(formatNumber(1.23456, 4)).toBe("1.2346");
  });

  it("does not crash when maximumFractionDigits = 1 and value is fractional", () => {
    // This was the original bug: minimumFractionDigits=2 > maximumFractionDigits=1
    expect(formatNumber(92.4567, 1)).toBe("92.5");
  });

  it("does not crash when maximumFractionDigits = 0 and value is fractional", () => {
    expect(formatNumber(3.7, 0)).toBe("4");
  });

  it("formats zero correctly", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats large integers with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats large fractional numbers with commas and decimals", () => {
    expect(formatNumber(1234.567)).toBe("1,234.57");
  });

  it("uses minimumFractionDigits = 0 for integers even with high max", () => {
    expect(formatNumber(10, 4)).toBe("10");
  });

  it("shows 2 minimum decimal places for fractional values when max >= 2", () => {
    expect(formatNumber(1.5)).toBe("1.50");
    expect(formatNumber(1.5, 4)).toBe("1.50");
  });

  it("clamps minimum to max when max = 1 for fractional values", () => {
    // min would be 2, but clamped to 1
    expect(formatNumber(1.5, 1)).toBe("1.5");
  });

  it("handles negative fractional numbers", () => {
    expect(formatNumber(-3.14159, 1)).toBe("-3.1");
  });
});

describe("formatNullableNumber", () => {
  it("returns N/A for null", () => {
    expect(formatNullableNumber(null)).toBe("N/A");
  });

  it("returns N/A for NaN", () => {
    expect(formatNullableNumber(NaN)).toBe("N/A");
  });

  it("formats a valid number with suffix", () => {
    expect(formatNullableNumber(5, " days")).toBe("5 days");
  });

  it("formats a fractional number", () => {
    expect(formatNullableNumber(3.14)).toBe("3.14");
  });
});
