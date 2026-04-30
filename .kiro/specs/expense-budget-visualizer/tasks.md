# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-file, client-side web app using plain HTML, CSS, and Vanilla JavaScript. The implementation proceeds in layers: HTML skeleton → CSS layout → pure-function core (validator, balance, chart data, storage) → UI render functions → event wiring → app initialization. Each layer is testable before the next is added. Property-based tests use fast-check loaded via CDN alongside the app's test file.

## Tasks

- [x] 1. Create the HTML skeleton and static assets
  - Create `index.html` with the four UI regions: Balance Display (`#balance-display`), Input Form (`#transaction-form`), Transaction List (`#transaction-list`), and Spending Chart (`<canvas id="spending-chart">`)
  - Add inline error `<span>` elements adjacent to each form field for validation messages
  - Include a `<div id="warning-banner">` (hidden by default) for the localStorage failure warning
  - Add a `<div id="chart-container">` wrapping the canvas to hold the chart or its fallback message
  - Load Chart.js from CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js">`) before `app.js`
  - Link `style.css` and `app.js` via relative paths so the page works under `file://`
  - _Requirements: 1.1, 4.1, 5.4, 7.2_

- [x] 2. Implement responsive CSS layout
  - Write `style.css` with a single-column layout using `max-width` and `padding` that adapts from 320px to 1440px without horizontal scrolling
  - Set `overflow-y: auto` and a `max-height` on `#transaction-list` so it scrolls when items exceed the visible area
  - Ensure all interactive targets (submit button, select, delete buttons) are at least 44×44 CSS pixels
  - Apply distinct, fixed background colors to category badges matching `CATEGORY_COLORS` (`#FF6384` Food, `#36A2EB` Transport, `#FFCE56` Fun)
  - Style the warning banner as a non-blocking, dismissible notice
  - _Requirements: 2.2, 6.1, 6.2, 6.3_

- [x] 3. Implement the pure-function core in `app.js`
  - [x] 3.1 Define constants and data model
    - Define `VALID_CATEGORIES = ["Food", "Transport", "Fun"]` and `CATEGORY_COLORS` map
    - Define the `Transaction` shape in a JSDoc comment for editor support
    - Declare `let transactions = []` as the single in-memory source of truth
    - _Requirements: 1.1, 4.5_

  - [x] 3.2 Implement `validateForm(name, amount, category)`
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - Reject empty/whitespace-only name, non-positive/non-finite/non-numeric amount, and any category not in `VALID_CATEGORIES`
    - Return error entries only for invalid fields; omit entries for valid fields
    - _Requirements: 1.4, 1.5_



  - [x] 3.4 Implement `computeBalance(transactions)`
    - Sum all `transaction.amount` values and return the result as a number rounded to 2 decimal places
    - Return `0.00` (as a number) for an empty array
    - _Requirements: 3.1, 3.4_



  - [x] 3.6 Implement `computeChartData(transactions)`
    - Return `{ labels: string[], data: number[], colors: string[] }` aggregating amounts by category
    - Include only categories that have at least one transaction
    - Map each label to its fixed color from `CATEGORY_COLORS`
    - _Requirements: 4.1, 4.5_



  - [x] 3.8 Implement `StorageService.save(transactions)` and `StorageService.load()`
    - `save`: serialize to JSON and write to `localStorage` key `"expense-visualizer-transactions"`; wrap in try/catch and log a console warning on failure without throwing
    - `load`: read and `JSON.parse` the key; return the parsed array if it is a valid array, otherwise return `null`; wrap all access in try/catch to handle `SecurityError` and malformed JSON
    - _Requirements: 5.1, 5.2, 5.3, 5.4_


- [x] 4. Checkpoint — Ensure all pure-function tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `addTransaction()` and `deleteTransaction()`
  - [x] 5.1 Implement `addTransaction(name, amount, category)`
    - Create a new Transaction object with `id` from `crypto.randomUUID()` (fallback: `Date.now().toString()`), `timestamp: Date.now()`, and the provided fields
    - Push to `transactions`, call `StorageService.save(transactions)`, then call `renderAll()`
    - _Requirements: 1.2, 2.4, 3.2, 4.2, 5.1_



  - [x] 5.3 Implement `deleteTransaction(id)`
    - Filter `transactions` to exclude the entry with the matching `id`
    - Call `StorageService.save(transactions)` then `renderAll()`
    - _Requirements: 2.6, 3.3, 4.3, 5.2_


- [x] 6. Implement UI render functions
  - [x] 6.1 Implement `renderBalanceDisplay(transactions)`
    - Call `computeBalance(transactions)` and write the result formatted to 2 decimal places into `#balance-display`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.2 Implement `renderTransactionList(transactions)`
    - Clear `#transaction-list` and re-render all items sorted by `timestamp` descending (newest first)
    - Each `<li>` contains: item name, amount formatted to 2 decimal places, category badge, and a delete `<button data-id="...">` 
    - When `transactions` is empty, render a single placeholder `<li>` with "No transactions yet"
    - Attach a single delegated `click` listener on the list element to handle delete button clicks via `data-id`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_


  - [x] 6.5 Implement `renderChart(transactions)`
    - If `window.Chart` is undefined, display a fallback text message inside `#chart-container` and return early
    - When `transactions` is empty, destroy any existing Chart instance and show a placeholder "No data available" message inside `#chart-container`
    - On first render with data, create a `new Chart(canvas, { type: 'pie', ... })` using `computeChartData(transactions)`; on subsequent renders, update `chart.data` and call `chart.update()` to avoid memory leaks
    - Configure `plugins.legend.display: true` so category names appear in the legend
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.6 Implement `renderAll()`
    - Call `renderBalanceDisplay(transactions)`, `renderTransactionList(transactions)`, and `renderChart(transactions)` in sequence
    - _Requirements: 2.4, 3.2, 3.3, 4.2, 4.3_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement form submit handler and app initialization
  - [x] 8.1 Implement `handleFormSubmit(event)`
    - Prevent default form submission
    - Clear all inline error `<span>` elements at the start of each attempt
    - Read field values and call `validateForm(name, amount, category)`
    - If invalid, render error messages adjacent to the offending fields and return
    - If valid, call `addTransaction(name, amount, category)` then `form.reset()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_


  - [x] 8.3 Implement app initialization (`DOMContentLoaded` handler)
    - Call `StorageService.load()`; if the result is `null`, set `transactions = []` and show the `#warning-banner`; otherwise set `transactions` to the loaded array
    - Attach the `submit` event listener on `#transaction-form` pointing to `handleFormSubmit`
    - Call `renderAll()` to paint the initial UI state
    - _Requirements: 5.3, 5.4, 8.1_

- [x] 9. Set up fast-check property-based test file
  - Create `tests.html` (or `tests.js` runnable via a `<script type="module">`) that loads fast-check from CDN and imports/inlines the pure functions under test
  - Configure each property test to run a minimum of 100 iterations (`{ numRuns: 100 }`)
  - Tag each test with a comment in the format: `// Feature: expense-budget-visualizer, Property N: <title>`
  - _Requirements: NFR-1 (no build step required)_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each layer boundary
- Property tests validate universal correctness properties across many generated inputs; unit tests cover specific edge cases (zero amount, whitespace name, malformed storage data, missing Chart.js)
- The single `transactions[]` array is the sole source of truth — all render functions read from it directly, eliminating synchronization bugs between UI regions
