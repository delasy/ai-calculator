import { describe, expect, it } from "vitest";
import {
  calculatorReducer,
  createCalculatorState,
  getOperatorSymbol,
  type CalculatorAction,
  type CalculatorOperator,
  type CalculatorState,
  type Digit,
} from "./calculator";

function digit(digitValue: Digit): CalculatorAction {
  return { type: "digit", digit: digitValue };
}

function decimal(): CalculatorAction {
  return { type: "decimal" };
}

function operator(operatorValue: CalculatorOperator): CalculatorAction {
  return { type: "operator", operator: operatorValue };
}

function equals(): CalculatorAction {
  return { type: "equals" };
}

function clear(): CalculatorAction {
  return { type: "clear" };
}

function press(...actions: CalculatorAction[]): CalculatorState {
  return actions.reduce(calculatorReducer, createCalculatorState());
}

describe("calculator state engine", () => {
  it("starts with a clear zero display", () => {
    expect(createCalculatorState()).toMatchObject({
      display: "0",
      accumulator: null,
      pendingOperator: null,
      waitingForOperand: true,
      lastOperation: null,
      error: null,
      justEvaluated: false,
    });
  });

  it("enters digits and replaces insignificant leading zeroes", () => {
    const state = press(digit("0"), digit("0"), digit("7"), digit("5"));

    expect(state.display).toBe("75");
    expect(state.waitingForOperand).toBe(false);
  });

  it("allows one decimal point per operand", () => {
    const state = press(decimal(), digit("1"), decimal(), digit("2"));

    expect(state.display).toBe("0.12");
  });

  it("starts a fresh decimal operand after an operator", () => {
    const state = press(
      digit("4"),
      operator("add"),
      decimal(),
      digit("5"),
      equals(),
    );

    expect(state.display).toBe("4.5");
  });

  it("clears all in-progress calculation state", () => {
    const state = press(digit("9"), operator("multiply"), digit("9"), clear());

    expect(state).toEqual(createCalculatorState());
  });

  it("performs the four basic arithmetic operations", () => {
    expect(press(digit("7"), operator("add"), digit("5"), equals()).display).toBe(
      "12",
    );
    expect(
      press(digit("7"), operator("subtract"), digit("9"), equals()).display,
    ).toBe("-2");
    expect(
      press(digit("6"), operator("multiply"), digit("7"), equals()).display,
    ).toBe("42");
    expect(
      press(digit("8"), operator("divide"), digit("2"), equals()).display,
    ).toBe("4");
  });

  it("uses Apple-style immediate chained calculations instead of precedence", () => {
    const state = press(
      digit("2"),
      operator("add"),
      digit("3"),
      operator("multiply"),
      digit("4"),
      equals(),
    );

    expect(state.display).toBe("20");
  });

  it("lets the pending operator be changed before entering the next operand", () => {
    const state = press(
      digit("8"),
      operator("add"),
      operator("subtract"),
      digit("3"),
      equals(),
    );

    expect(state.display).toBe("5");
  });

  it("uses the left operand when equals is pressed before a second operand", () => {
    const state = press(digit("2"), operator("add"), equals());

    expect(state.display).toBe("4");
  });

  it("repeats the last completed operation on repeated equals", () => {
    const state = press(
      digit("2"),
      operator("add"),
      digit("3"),
      equals(),
      equals(),
    );

    expect(state.display).toBe("8");
  });

  it("starts a new calculation when a digit is pressed after equals", () => {
    const state = press(
      digit("2"),
      operator("add"),
      digit("3"),
      equals(),
      digit("9"),
    );

    expect(state.display).toBe("9");
    expect(state.accumulator).toBeNull();
    expect(state.lastOperation).toBeNull();
  });

  it("continues from the result when an operator is pressed after equals", () => {
    const state = press(
      digit("2"),
      operator("add"),
      digit("3"),
      equals(),
      operator("multiply"),
      digit("4"),
      equals(),
    );

    expect(state.display).toBe("20");
  });

  it("rounds common floating point artifacts for display", () => {
    const state = press(
      digit("0"),
      decimal(),
      digit("1"),
      operator("add"),
      digit("0"),
      decimal(),
      digit("2"),
      equals(),
    );

    expect(state.display).toBe("0.3");
  });

  it("enters a sticky division-by-zero error that only clear recovers from", () => {
    const errorState = press(
      digit("8"),
      operator("divide"),
      digit("0"),
      equals(),
    );

    expect(errorState.display).toBe("Error");
    expect(errorState.error).toMatchObject({ code: "DIVISION_BY_ZERO" });

    const ignoredInput = calculatorReducer(errorState, digit("5"));
    expect(ignoredInput.display).toBe("Error");
    expect(ignoredInput.error).toMatchObject({ code: "DIVISION_BY_ZERO" });

    expect(calculatorReducer(errorState, clear())).toEqual(createCalculatorState());
  });

  it("exposes Apple-style operator symbols for UI labels", () => {
    expect(getOperatorSymbol("add")).toBe("+");
    expect(getOperatorSymbol("subtract")).toBe("−");
    expect(getOperatorSymbol("multiply")).toBe("×");
    expect(getOperatorSymbol("divide")).toBe("÷");
  });
});
