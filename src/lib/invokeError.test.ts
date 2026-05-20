import { describe, expect, it } from "vitest";
import { formatInvokeError } from "./invokeError";

describe("formatInvokeError", () => {
  it("formats Error objects correctly", () => {
    const error = new Error("Test error message");
    const result = formatInvokeError(error);
    expect(result).toBe("Test error message");
  });

  it("formats string errors correctly", () => {
    const result = formatInvokeError("String error");
    expect(result).toBe("String error");
  });

  it("formats object errors with message property", () => {
    const error = { message: "Object error message" };
    const result = formatInvokeError(error);
    expect(result).toBe("Object error message");
  });

  it("formats object errors with error property", () => {
    const error = { error: "Error property" };
    const result = formatInvokeError(error);
    expect(result).toBe("Error property");
  });

  it("handles unknown error types", () => {
    const result = formatInvokeError(12345);
    expect(result).toBe("Unknown error");
  });

  it("handles null errors", () => {
    const result = formatInvokeError(null);
    expect(result).toBe("Unknown error");
  });

  it("handles complex objects by stringifying", () => {
    const error = { custom: "error", data: { nested: true } };
    const result = formatInvokeError(error);
    expect(result).toBe('{"custom":"error","data":{"nested":true}}');
  });
});