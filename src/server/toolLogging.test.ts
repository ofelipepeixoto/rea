import { describe, expect, it } from "vitest";
import pino from "pino";

import { err, ok } from "../domain/result.js";
import { logToolExecution } from "./toolLogging.js";

const captureLogs = () => {
  const lines: string[] = [];
  const logger = pino(
    { base: null, timestamp: false },
    { write: (line: string) => lines.push(line) },
  );
  return { logger, lines };
};

describe("logToolExecution", () => {
  it("returns successful results unchanged and logs completion metadata", async () => {
    const { logger, lines } = captureLogs();
    const result = ok("synthetic-private-output");

    expect(await logToolExecution(logger, "example", async () => result)).toBe(
      result,
    );
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines.join(""))).toEqual({
      level: 30,
      tool: "example",
      durationMs: expect.any(Number),
      status: "ok",
      msg: "MCP tool execution completed",
    });
    expect(lines.join("")).not.toContain("synthetic-private-output");
  });

  it("returns expected failures unchanged without logging their contents", async () => {
    const { logger, lines } = captureLogs();
    const result = err("synthetic-private-failure");

    expect(await logToolExecution(logger, "example", async () => result)).toBe(
      result,
    );
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines.join(""))).toEqual({
      level: 40,
      tool: "example",
      durationMs: expect.any(Number),
      status: "error",
      msg: "MCP tool execution completed",
    });
    expect(lines.join("")).not.toContain("synthetic-private-failure");
  });

  it.each([
    new Error("synthetic-private-exception"),
    "synthetic-private-rejection",
  ])(
    "logs unexpected failures and rethrows the identical cause without its contents",
    async (cause) => {
      const { logger, lines } = captureLogs();

      await expect(
        logToolExecution(logger, "example", () => Promise.reject(cause)),
      ).rejects.toBe(cause);
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines.join(""))).toEqual({
        level: 50,
        tool: "example",
        durationMs: expect.any(Number),
        status: "exception",
        msg: "MCP tool execution failed unexpectedly",
      });
      expect(lines.join("")).not.toContain("synthetic-private");
    },
  );
});
