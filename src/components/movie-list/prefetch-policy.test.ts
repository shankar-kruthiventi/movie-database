import { describe, expect, it } from "vitest";
import {
  BACKOFF_MAX_MS,
  BACKOFF_START_MS,
  MAX_CONSECUTIVE_FAILURES,
  REARM_COOLDOWN_MS,
  backoffDelay,
  canRearm,
  isStalled,
} from "./prefetch-policy";

describe("prefetch retry policy (Follow-up B)", () => {
  it("backs off 1, 2, 4, 8 then 15 s and never exceeds the maximum", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(backoffDelay)).toEqual([1000, 2000, 4000, 8000, 15000, 15000, 15000]);
    expect(backoffDelay(1)).toBe(BACKOFF_START_MS);
    expect(backoffDelay(0)).toBe(BACKOFF_START_MS);
    expect(backoffDelay(1000)).toBe(BACKOFF_MAX_MS);
  });

  it("stalls after exactly MAX_CONSECUTIVE_FAILURES failures in a row, not before", () => {
    expect(MAX_CONSECUTIVE_FAILURES).toBe(6);
    expect(isStalled(0)).toBe(false);
    expect(isStalled(MAX_CONSECUTIVE_FAILURES - 1)).toBe(false);
    expect(isStalled(MAX_CONSECUTIVE_FAILURES)).toBe(true);
    expect(isStalled(MAX_CONSECUTIVE_FAILURES + 3)).toBe(true);
  });

  it("the automatic phase is bounded: the waits before the stall add up to about 30 s", () => {
    let total = 0;
    for (let f = 1; f < MAX_CONSECUTIVE_FAILURES; f++) total += backoffDelay(f);
    expect(total).toBe(1000 + 2000 + 4000 + 8000 + 15000);
  });

  it("a scroll re-arms only after the cool-down", () => {
    expect(canRearm(1000, 1000)).toBe(false);
    expect(canRearm(1000, 1000 + REARM_COOLDOWN_MS - 1)).toBe(false);
    expect(canRearm(1000, 1000 + REARM_COOLDOWN_MS)).toBe(true);
  });
});
