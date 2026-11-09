// Pure retry policy of the list prefetch (Follow-up B, 2026-11-09). Kept free of React and timers so it is unit tested.
//
// Errors back off exponentially (1 s, 2 s, 4 s, 8 s, 15 s, 15 s ...). After MAX_CONSECUTIVE_FAILURES failures in a
// row (a revoked key, HTTP 401/429, a dead network) the automatic retries STOP (no timer, no request) and the list is
// "stalled". It re-arms when
//   - the user scrolls again after REARM_COOLDOWN_MS since the stall (one fresh attempt; if that fails the counter
//     is already at the cap again, so one more failure stalls it again after a single request round), or
//   - the list is replaced (a category change remounts the list; a reloaded page 1 resets it), or
//   - a request succeeds (the failure count returns to 0).
// With the default numbers the automatic phase lasts about 30 s and costs at most 6 failed requests plus the
// (at most one) request that was in flight together with the last failure.

export const BACKOFF_START_MS = 1000;
export const BACKOFF_MAX_MS = 15000;
/** Consecutive failures after which automatic retries stop. */
export const MAX_CONSECUTIVE_FAILURES = 6;
/** A scroll re-arms a stalled loader only this long after it stalled (no hammering a revoked key by scrolling). */
export const REARM_COOLDOWN_MS = 60000;

/** Delay before the retry that follows the `failures`-th consecutive failure (failures >= 1). */
export function backoffDelay(failures: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_START_MS * 2 ** (Math.max(1, failures) - 1));
}

/** True when `failures` consecutive failures have used up the automatic retries. */
export function isStalled(failures: number): boolean {
  return failures >= MAX_CONSECUTIVE_FAILURES;
}

/** True when a user scroll at `now` may re-arm a loader that stalled at `stalledAt`. */
export function canRearm(stalledAt: number, now: number): boolean {
  return now - stalledAt >= REARM_COOLDOWN_MS;
}
