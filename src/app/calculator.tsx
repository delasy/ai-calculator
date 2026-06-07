"use client";

import { useEffect, useId, useReducer } from "react";
import {
  calculatorReducer,
  createCalculatorState,
  getOperatorSymbol,
  type CalculatorAction,
  type CalculatorOperator,
  type Digit,
} from "@/lib/calculator";
import { getCalculatorKeyboardAction } from "./calculator-keyboard";
import styles from "./calculator.module.css";

interface CalculatorButton {
  action: CalculatorAction;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  isPressed?: boolean;
  text: string;
}

const operatorLabels: Record<CalculatorOperator, string> = {
  add: "Add",
  subtract: "Subtract",
  multiply: "Multiply",
  divide: "Divide",
};

export function Calculator() {
  const [state, dispatch] = useReducer(calculatorReducer, undefined, () =>
    createCalculatorState(),
  );
  const errorMessageId = useId();
  const keyboardHelpId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "Enter" && isButtonTarget(event.target)) {
        return;
      }

      const action = getCalculatorKeyboardAction(event.key);

      if (!action) {
        return;
      }

      event.preventDefault();
      dispatch(action);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const error = state.error;
  const hasError = error !== null;
  const isDecimalDisabled =
    hasError || (!state.waitingForOperand && state.display.includes("."));
  const selectedOperatorLabel = state.pendingOperator
    ? operatorLabels[state.pendingOperator]
    : null;

  const buttons: CalculatorButton[] = [
    {
      action: { type: "clear" },
      ariaLabel: "Clear calculator",
      className: styles.functionButton,
      text: "C",
    },
    createOperatorButton("divide", state.pendingOperator, hasError),
    createOperatorButton("multiply", state.pendingOperator, hasError),
    createOperatorButton("subtract", state.pendingOperator, hasError),
    createDigitButton("7", hasError),
    createDigitButton("8", hasError),
    createDigitButton("9", hasError),
    createOperatorButton("add", state.pendingOperator, hasError),
    createDigitButton("4", hasError),
    createDigitButton("5", hasError),
    createDigitButton("6", hasError),
    {
      action: { type: "equals" },
      ariaLabel: "Equals",
      className: `${styles.operatorButton} ${styles.equalsButton}`,
      disabled: hasError,
      text: "=",
    },
    createDigitButton("1", hasError),
    createDigitButton("2", hasError),
    createDigitButton("3", hasError),
    {
      action: { type: "digit", digit: "0" },
      ariaLabel: "Digit 0",
      className: `${styles.numberButton} ${styles.zeroButton}`,
      disabled: hasError,
      text: "0",
    },
    {
      action: { type: "decimal" },
      ariaLabel: "Decimal point",
      className: styles.numberButton,
      disabled: isDecimalDisabled,
      text: ".",
    },
  ];

  return (
    <section
      className={styles.calculator}
      aria-describedby={`${keyboardHelpId}${hasError ? ` ${errorMessageId}` : ""}`}
      aria-label="Calculator"
    >
      <div className={styles.displayPanel}>
        <p className={styles.statusText} aria-atomic="true" aria-live="polite">
          {hasError
            ? "Error"
            : selectedOperatorLabel
              ? `${selectedOperatorLabel} selected`
              : "Ready"}
        </p>
        <output
          className={`${styles.display} ${hasError ? styles.errorDisplay : ""}`}
          aria-atomic="true"
          aria-label={
            hasError
              ? `Calculator display error: ${error.message}`
              : `Calculator display: ${state.display}`
          }
          aria-live={hasError ? "assertive" : "polite"}
        >
          {state.display}
        </output>
        {hasError ? (
          <p className={styles.errorMessage} id={errorMessageId} role="alert">
            {error.message} Press C or Escape to clear.
          </p>
        ) : null}
      </div>

      <div className={styles.keypad} aria-label="Calculator controls" role="group">
        {buttons.map((button) => (
          <button
            aria-label={button.ariaLabel}
            aria-pressed={button.isPressed || undefined}
            className={`${styles.button} ${button.className ?? ""}`}
            disabled={button.disabled}
            key={button.ariaLabel}
            onClick={() => dispatch(button.action)}
            type="button"
          >
            {button.text}
          </button>
        ))}
      </div>

      <p className={styles.keyboardHelp} id={keyboardHelpId}>
        Keyboard shortcuts: 0–9, decimal point, +, -, *, /, Enter or =, and
        Escape to clear.
      </p>
    </section>
  );
}

function createDigitButton(digit: Digit, disabled: boolean): CalculatorButton {
  return {
    action: { type: "digit", digit },
    ariaLabel: `Digit ${digit}`,
    className: styles.numberButton,
    disabled,
    text: digit,
  };
}

function createOperatorButton(
  operator: CalculatorOperator,
  pendingOperator: CalculatorOperator | null,
  disabled: boolean,
): CalculatorButton {
  const label = operatorLabels[operator];

  return {
    action: { type: "operator", operator },
    ariaLabel: label,
    className: styles.operatorButton,
    disabled,
    isPressed: pendingOperator === operator,
    text: getOperatorSymbol(operator),
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function isButtonTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("button") !== null;
}
