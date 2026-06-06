import type { CalculatorAction, CalculatorOperator, Digit } from "@/lib/calculator";

const operatorKeys: Record<string, CalculatorOperator> = {
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  "/": "divide",
};

export function getCalculatorKeyboardAction(
  key: string,
): CalculatorAction | null {
  if (isDigitKey(key)) {
    return { type: "digit", digit: key };
  }

  if (key === ".") {
    return { type: "decimal" };
  }

  if (key === "Enter" || key === "=") {
    return { type: "equals" };
  }

  if (key === "Escape") {
    return { type: "clear" };
  }

  const operator = operatorKeys[key];

  if (operator) {
    return { type: "operator", operator };
  }

  return null;
}

function isDigitKey(key: string): key is Digit {
  return key.length === 1 && key >= "0" && key <= "9";
}
