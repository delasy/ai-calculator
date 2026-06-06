# Web Calculator PRD

## Overview
Build a simple web calculator application using Next.js and pnpm.

The first release should provide a responsive, accessible calculator experience for mobile and desktop users. It should support the core arithmetic operations of addition, subtraction, multiplication, and division, along with clear and equals actions and decimal-number entry. The interaction model for chained calculations should follow Apple-style calculator behavior as the reference for both visual direction and calculation flow.

This release is intentionally small in scope: a single-page calculator focused on fast, reliable input and output, with keyboard support, clear feedback, and no calculation history.

## Personas

### 1. Everyday user
A user who wants to quickly perform simple arithmetic in a browser without installing an app.

### 2. Keyboard-first user
A user who prefers entering numbers and operators via keyboard for speed and convenience.

### 3. Accessibility-focused user
A user who relies on semantic structure, visible focus states, clear labels, and predictable interaction patterns.

## User Stories

### US-1: Enter numbers
As a user, I want to enter whole and decimal numbers so that I can calculate common values accurately.

**Acceptance criteria**
- I can enter digits 0-9 using on-screen controls.
- I can enter decimal values.
- The calculator prevents invalid decimal formatting such as multiple decimal points in a single number.
- The current input is visible in the calculator display.
- Input updates correctly on both mobile and desktop.

### US-2: Perform basic arithmetic
As a user, I want to use addition, subtraction, multiplication, and division so that I can complete simple calculations.

**Acceptance criteria**
- I can select +, -, ×, and ÷ operations using on-screen controls.
- I can calculate a result using the equals action.
- Chained operations behave according to Apple-style calculator behavior.
- The display updates to reflect the current operand, selected operation, and resulting value in a clear, predictable way.

### US-3: Clear the calculation
As a user, I want to clear the current calculation so that I can quickly start over.

**Acceptance criteria**
- A clear action is available at all times.
- Activating clear resets the display and any in-progress calculation state.
- After clearing, I can immediately begin a new calculation.

### US-4: Receive safe handling for invalid operations
As a user, I want invalid operations to be handled safely so that I am not confused by broken or misleading results.

**Acceptance criteria**
- Invalid actions are disabled where practical.
- Division-by-zero and similar invalid states are handled gracefully.
- When an invalid operation cannot be prevented in advance, the interface shows a clear error state or message.
- After an error, I can recover using clear and continue using the calculator.

### US-5: Use the calculator with a keyboard
As a user, I want keyboard support so that I can calculate quickly without relying only on pointer input.

**Acceptance criteria**
- Number keys trigger the corresponding numeric input.
- Standard operator keys trigger the corresponding arithmetic actions where feasible.
- Enter or = triggers calculation.
- Backspace and/or an equivalent keyboard interaction is supported if included in the final UI behavior.
- Keyboard interactions do not conflict with basic page usability.

### US-6: Use the calculator on mobile and desktop
As a user, I want the calculator to work well across screen sizes so that I can use it on different devices.

**Acceptance criteria**
- The layout is responsive and usable on common mobile and desktop viewport sizes.
- Controls remain large enough to tap on touch devices.
- The display remains readable without layout breakage.
- The core calculator workflow works consistently across supported screen sizes.

### US-7: Use an accessible interface
As an accessibility-focused user, I want the calculator UI to be understandable and operable so that I can use it with confidence.

**Acceptance criteria**
- Interactive controls have clear accessible names.
- Focus states are visible for keyboard users.
- The calculator can be operated without requiring a mouse.
- Color contrast is sufficient for core text and controls.
- Error and result states are presented in a way that is perceivable to users relying on assistive technologies.

### US-8: Use a minimal Apple-inspired visual design
As a user, I want a clean, familiar calculator appearance so that the interface feels polished and intuitive.

**Acceptance criteria**
- The UI uses a minimal visual style inspired by Apple’s calculator aesthetic.
- The design remains simple and does not introduce extra functionality beyond the approved v1 scope.
- Visual styling does not reduce readability, accessibility, or responsive usability.

## Open Questions
None at this time.

## Out of Scope
- Scientific calculator functions
- Percentage (%) support
- Positive/negative toggle (+/-)
- Calculation history during the session
- Saved history across visits
- User accounts or authentication
- Multi-page workflows
- Advanced expression editor beyond approved calculator behavior
- Branding or design-system integration beyond the requested Apple-style direction
- Localization, currency formatting, or unit conversion

## Assumptions
- The repository context is currently minimal, so this PRD assumes the calculator will be introduced as a new Next.js application structure or within a newly prepared Next.js codebase managed with pnpm.
- “Simple web calculator” in v1 includes only digits, decimals, +, -, ×, ÷, clear, and equals.
- Apple-style reference applies to interaction behavior for chained calculations and to the general visual direction, but not to unsupported functions such as % or +/-.
- No calculation history is required; only the current calculation state is shown.
- Error handling should be lightweight and user-friendly rather than deeply configurable.
- The app is intended for browser use only in this release.
