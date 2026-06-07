export const calculatorOperators = [
  "add",
  "subtract",
  "multiply",
  "divide",
] as const;

export type CalculatorOperator = (typeof calculatorOperators)[number];

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export type CalculatorErrorCode = "DIVISION_BY_ZERO" | "INVALID_RESULT";

export interface CalculatorError {
  code: CalculatorErrorCode;
  message: string;
}

export interface RepeatedOperation {
  operator: CalculatorOperator;
  operand: number;
}

export interface CalculatorState {
  /** The exact text the UI should render in the calculator display. */
  display: string;
  /** Running result used for Apple-style immediate chained calculations. */
  accumulator: number | null;
  /** Operation waiting for the next operand. */
  pendingOperator: CalculatorOperator | null;
  /** Whether the next digit/decimal input should replace the display. */
  waitingForOperand: boolean;
  /** Last completed operation, used for repeated equals behavior. */
  lastOperation: RepeatedOperation | null;
  /** Sticky recoverable error; clear is required before new input. */
  error: CalculatorError | null;
  /** Tracks whether the visible value came from equals. */
  justEvaluated: boolean;
}

export type CalculatorAction =
  | { type: "digit"; digit: Digit }
  | { type: "decimal" }
  | { type: "operator"; operator: CalculatorOperator }
  | { type: "equals" }
  | { type: "clear" };

interface CalculationSuccess {
  ok: true;
  value: number;
}

interface CalculationFailure {
  ok: false;
  error: CalculatorError;
}

type CalculationResult = CalculationSuccess | CalculationFailure;

const INITIAL_DISPLAY = "0";
const ERROR_DISPLAY = "Error";
const RESULT_PRECISION = 12;

export function createCalculatorState(): CalculatorState {
  return {
    display: INITIAL_DISPLAY,
    accumulator: null,
    pendingOperator: null,
    waitingForOperand: true,
    lastOperation: null,
    error: null,
    justEvaluated: false,
  };
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "digit":
      return inputDigit(state, action.digit);
    case "decimal":
      return inputDecimal(state);
    case "operator":
      return chooseOperator(state, action.operator);
    case "equals":
      return calculateEquals(state);
    case "clear":
      return clearCalculator();
    default:
      return action satisfies never;
  }
}

export function inputDigit(state: CalculatorState, digit: Digit): CalculatorState {
  if (state.error) {
    return state;
  }

  if (shouldStartFreshInput(state)) {
    return {
      ...createCalculatorState(),
      display: digit,
      waitingForOperand: false,
    };
  }

  if (state.waitingForOperand) {
    return {
      ...state,
      display: digit,
      waitingForOperand: false,
      justEvaluated: false,
    };
  }

  return {
    ...state,
    display: appendDigit(state.display, digit),
    justEvaluated: false,
  };
}

export function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.error) {
    return state;
  }

  if (shouldStartFreshInput(state)) {
    return {
      ...createCalculatorState(),
      display: "0.",
      waitingForOperand: false,
    };
  }

  if (state.waitingForOperand) {
    return {
      ...state,
      display: "0.",
      waitingForOperand: false,
      justEvaluated: false,
    };
  }

  if (state.display.includes(".")) {
    return state;
  }

  return {
    ...state,
    display: `${state.display}.`,
    justEvaluated: false,
  };
}

export function chooseOperator(
  state: CalculatorState,
  operator: CalculatorOperator,
): CalculatorState {
  if (state.error) {
    return state;
  }

  const currentValue = parseDisplayValue(state.display);

  if (state.pendingOperator && !state.waitingForOperand) {
    const calculation = applyOperation(
      state.pendingOperator,
      state.accumulator ?? 0,
      currentValue,
    );

    if (!calculation.ok) {
      return toErrorState(calculation.error);
    }

    return {
      ...state,
      display: formatNumber(calculation.value),
      accumulator: calculation.value,
      pendingOperator: operator,
      waitingForOperand: true,
      lastOperation: null,
      justEvaluated: false,
    };
  }

  return {
    ...state,
    accumulator:
      state.accumulator === null || !state.waitingForOperand
        ? currentValue
        : state.accumulator,
    pendingOperator: operator,
    waitingForOperand: true,
    lastOperation: null,
    justEvaluated: false,
  };
}

export function calculateEquals(state: CalculatorState): CalculatorState {
  if (state.error) {
    return state;
  }

  const currentValue = parseDisplayValue(state.display);

  if (state.pendingOperator) {
    const leftOperand = state.accumulator ?? currentValue;
    const rightOperand = state.waitingForOperand ? leftOperand : currentValue;
    const calculation = applyOperation(
      state.pendingOperator,
      leftOperand,
      rightOperand,
    );

    if (!calculation.ok) {
      return toErrorState(calculation.error);
    }

    return toResultState(calculation.value, {
      operator: state.pendingOperator,
      operand: rightOperand,
    });
  }

  if (state.justEvaluated && state.lastOperation) {
    const calculation = applyOperation(
      state.lastOperation.operator,
      currentValue,
      state.lastOperation.operand,
    );

    if (!calculation.ok) {
      return toErrorState(calculation.error);
    }

    return toResultState(calculation.value, state.lastOperation);
  }

  return {
    ...state,
    accumulator: currentValue,
    waitingForOperand: true,
    justEvaluated: true,
  };
}

export function clearCalculator(): CalculatorState {
  return createCalculatorState();
}

export function getOperatorSymbol(operator: CalculatorOperator): "+" | "−" | "×" | "÷" {
  switch (operator) {
    case "add":
      return "+";
    case "subtract":
      return "−";
    case "multiply":
      return "×";
    case "divide":
      return "÷";
    default:
      return operator satisfies never;
  }
}

export function isCalculatorError(state: CalculatorState): boolean {
  return state.error !== null;
}

function shouldStartFreshInput(state: CalculatorState): boolean {
  return state.justEvaluated && state.pendingOperator === null;
}

function appendDigit(display: string, digit: Digit): string {
  if (display === "0") {
    return digit;
  }

  return `${display}${digit}`;
}

function parseDisplayValue(display: string): number {
  const value = Number(display);
  return Object.is(value, -0) ? 0 : value;
}

function applyOperation(
  operator: CalculatorOperator,
  leftOperand: number,
  rightOperand: number,
): CalculationResult {
  if (operator === "divide" && rightOperand === 0) {
    return {
      ok: false,
      error: {
        code: "DIVISION_BY_ZERO",
        message: "Cannot divide by zero.",
      },
    };
  }

  let value: number;

  switch (operator) {
    case "add":
      value = leftOperand + rightOperand;
      break;
    case "subtract":
      value = leftOperand - rightOperand;
      break;
    case "multiply":
      value = leftOperand * rightOperand;
      break;
    case "divide":
      value = leftOperand / rightOperand;
      break;
    default:
      return operator satisfies never;
  }

  if (!Number.isFinite(value)) {
    return {
      ok: false,
      error: {
        code: "INVALID_RESULT",
        message: "The result is too large to display.",
      },
    };
  }

  return { ok: true, value: Object.is(value, -0) ? 0 : value };
}

function formatNumber(value: number): string {
  const normalizedValue = Object.is(value, -0) ? 0 : value;

  if (Number.isInteger(normalizedValue)) {
    return normalizedValue.toString();
  }

  return Number(normalizedValue.toPrecision(RESULT_PRECISION)).toString();
}

function toResultState(
  value: number,
  lastOperation: RepeatedOperation,
): CalculatorState {
  return {
    display: formatNumber(value),
    accumulator: value,
    pendingOperator: null,
    waitingForOperand: true,
    lastOperation,
    error: null,
    justEvaluated: true,
  };
}

function toErrorState(error: CalculatorError): CalculatorState {
  return {
    display: ERROR_DISPLAY,
    accumulator: null,
    pendingOperator: null,
    waitingForOperand: true,
    lastOperation: null,
    error,
    justEvaluated: false,
  };
}
