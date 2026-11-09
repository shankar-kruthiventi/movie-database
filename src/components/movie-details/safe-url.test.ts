import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./safe-url";

describe("safeHttpUrl (Follow-up C)", () => {
  it("accepts absolute http and https URLs and returns them unchanged", () => {
    expect(safeHttpUrl("https://example.com/fixture-movie")).toBe("https://example.com/fixture-movie");
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com");
    expect(safeHttpUrl("HTTPS://Example.com/Path?q=1#x")).toBe("HTTPS://Example.com/Path?q=1#x");
  });

  it.each([
    ["javascript:alert(1)"],
    ["JaVaScRiPt:alert(1)"],
    [" javascript:alert(1)"],
    ["java\tscript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["vbscript:msgbox(1)"],
    ["file:///etc/passwd"],
    ["ftp://example.com/x"],
    ["blob:https://example.com/uuid"],
    ["//evil.example/x"],
    ["/relative/path"],
    ["example.com"],
    ["http://"],
    ["https://:80"],
    ["not a url"],
    [""],
    ["   "],
  ])("rejects %j", (value) => {
    expect(safeHttpUrl(value)).toBeUndefined();
  });

  it("rejects non-strings", () => {
    expect(safeHttpUrl(undefined)).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl(42)).toBeUndefined();
    expect(safeHttpUrl({ href: "https://example.com" })).toBeUndefined();
  });
});
