import { describe, expect, it } from "vitest";
import { getCalculatorKeyboardAction } from "./calculator-keyboard";

describe("calculator keyboard shortcuts", () => {
  it("maps digit keys to digit actions", () => {
    expect(getCalculatorKeyboardAction("0")).toEqual({
      type: "digit",
      digit: "0",
    });
    expect(getCalculatorKeyboardAction("9")).toEqual({
      type: "digit",
      digit: "9",
    });
  });

  it("maps decimal, equals, and clear keys", () => {
    expect(getCalculatorKeyboardAction(".")).toEqual({ type: "decimal" });
    expect(getCalculatorKeyboardAction("Enter")).toEqual({ type: "equals" });
    expect(getCalculatorKeyboardAction("=")).toEqual({ type: "equals" });
    expect(getCalculatorKeyboardAction("Escape")).toEqual({ type: "clear" });
  });

  it("maps standard operator keys", () => {
    expect(getCalculatorKeyboardAction("+")).toEqual({
      type: "operator",
      operator: "add",
    });
    expect(getCalculatorKeyboardAction("-")).toEqual({
      type: "operator",
      operator: "subtract",
    });
    expect(getCalculatorKeyboardAction("*")).toEqual({
      type: "operator",
      operator: "multiply",
    });
    expect(getCalculatorKeyboardAction("/")).toEqual({
      type: "operator",
      operator: "divide",
    });
  });

  it("ignores unsupported keys, including Backspace without backspace UI behavior", () => {
    expect(getCalculatorKeyboardAction("Backspace")).toBeNull();
    expect(getCalculatorKeyboardAction("a")).toBeNull();
  });
});
