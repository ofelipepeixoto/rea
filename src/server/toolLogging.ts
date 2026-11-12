import type { Result } from "../domain/result.js";
import type { Logger } from "pino";

/** Log one MCP tool's duration and status without recording caller input. */
export const logToolExecution = async <Value, Failure>(
  logger: Logger,
  tool: string,
  execute: () => Promise<Result<Value, Failure>>,
): Promise<Result<Value, Failure>> => {
  const startedAt = performance.now();
  let result: Result<Value, Failure>;
  try {
    result = await execute();
  } catch (cause: unknown) {
    logger.error(
      {
        tool,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        status: "exception",
      },
      "MCP tool execution failed unexpectedly",
    );
    throw cause;
  }
  logger[result.ok ? "info" : "warn"](
    {
      tool,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      status: result.ok ? "ok" : "error",
    },
    "MCP tool execution completed",
  );
  return result;
};
