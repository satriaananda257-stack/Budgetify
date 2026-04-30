# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-file, client-side web application built with plain HTML, CSS, and Vanilla JavaScript. It requires no build step, no backend, and no package manager. All state lives in memory during a session and is persisted to the browser's `localStorage` between sessions.

The application is structured around four visible UI regions — Input Form, Transaction List, Balance Display, and Spending Chart — plus two invisible subsystems: the Validator and the Storage layer. A central in-memory array (`transactions`) is the single source of truth; every user action mutates that array and then triggers a full re-render of all dependent UI regions.

### Key Design Decisions

- **Single source of truth**: All UI components read from one `transactions` array. This eliminates synchronization bugs between components.
- **Full re-render on change**: After every add/delete, all four UI regions are re-rendered from scratch. For the scale of this app (dozens to low hundreds of transactions), this is simpler and fast enough to meet the 200ms update requirement.
- **Chart.js via CDN**: Chart.js is loaded from a CDN `<script>` tag. This avoids a build step while providing a robust, accessible pie chart. The app degrades gracefully if the CDN is unreachable (chart area shows a fallback message).
- **No frameworks**: Plain DOM APIs (`document.createElement`, `innerHTML`, event listeners) keep the dependency surface minimal and ensure `file://` compatibility.
- **Responsive single-column layout**: A CSS-based single-column layout with `max-width` and `padding` ensures the app works from 320px to 1440px without horizontal scrolling.

---

## Architecture

The application is a single HTML file (`index.html`) with embedded `<style>` and `<script>` blocks (or co-located `style.css` / `app.js` files loaded via relative paths — both approaches work identically).

```
┌─────────────────────────────────────────────────────┐
│                     index.html                      │
│                                                     │
│  ┌──────────────┐   ┌──────────────────────────┐   │
│  │ Balance      │   │ Input Form               │   │
│  │ Display      │   │ (name, amount, category) │   │
│  └──────────────┘   └──────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Transaction List (scrollable)                │   │
│  │  [name] [amount] [category] [delete btn]     │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Spending Chart (Chart.js pie)                │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ app.js                                       │   │
│  │  • transactions[] — in-memory state          │   │
│  │  • addTransaction()                          │   │
│  │  • deleteTransaction()                       │   │
│  │  • renderAll()                               │   │
│  │    ├─ renderBalanceDisplay()                 │   │
│  │    ├─ renderTransactionList()                │   │
│  │    └─ renderChart()                          │   │
│  │  • StorageService (read/write localStorage)  │   │
│  │  • Validator (validateForm())                │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
User submits form
      │
      ▼
validateForm()
      │ valid
      ▼
addTransaction(name, amount, category)
      │
      ├──► transactions.push(newTransaction)
      ├──► StorageService.save(transactions)
      └──► renderAll()
               ├──► renderBalanceDisplay()
               ├──► renderTransactionList()
               └──► renderChart()

User clicks delete
      │
      ▼
deleteTransaction(id)
      │
      ├──► transactions = transactions.filter(t => t.id !== id)
      ├──► StorageService.save(transactions)
      └──► renderAll()

App initializes
      │
      ▼
StorageService.load()
      │ success → transactions = loaded array
      │ failure → transactions = [], show warning banner
      ▼
renderAll()
```

---

## Components and Interfaces

### 1. Input Form

**HTML element**: `<form id="transaction-form">`

**Fields**:
- `<input type="text" id="item-name">` — item name
- `<input type="number" id="item-amount" min="0.01" step="0.01">` — amount
- `<select id="item-category">` — options: Food, Transport, Fun (first option is a disabled placeholder)

**Behavior**:
- On `submit` event: call `validateForm()`. If valid, call `addTransaction()` then `form.reset()`.
- Inline error `<span>` elements adjacent to each field display validation messages.
- Error messages are cleared at the start of each submit attempt so stale errors do not persist.
- All interactive targets (submit button, select) are at least 44×44 CSS pixels to meet touch-friendly requirements.

**Interface**:
```js
// Called on form submit
function handleFormSubmit(event) { ... }

// Returns { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
function validateForm(name, amount, category) { ... }
```

### 2. Transaction List

**HTML element**: `<ul id="transaction-list">`

**Behavior**:
- Fully re-rendered by `renderTransactionList()` on every state change.
- Items rendered in reverse-chronological order (newest first, sorted by `timestamp` descending).
- Each `<li>` contains: item name, formatted amount (2 decimal places), category badge, and a delete `<button>` with a `data-id` attribute.
- The delete button calls `deleteTransaction(id)` via event delegation on the list element.
- When `transactions` is empty, renders a placeholder `<li>` with a "No transactions yet" message.
- The list container has `overflow-y: auto` and a `max-height` so it scrolls when items exceed the visible area.

**Interface**:
```js
function renderTransactionList(transactions) { ... }
```

### 3. Balance Display

**HTML element**: `<div id="balance-display">`

**Behavior**:
- Displays the sum of all `transaction.amount` values, formatted to 2 decimal places.
- Re-rendered by `renderBalanceDisplay()` on every state change.
- Shows `0.00` when `transactions` is empty.

**Interface**:
```js
// Returns a number rounded to 2 decimal places
function computeBalance(transactions) { ... }

function renderBalanceDisplay(transactions) { ... }
```

### 4. Spending Chart

**HTML element**: `<canvas id="spending-chart">`

**Behavior**:
- Rendered using Chart.js (`type: 'pie'`).
- A single `Chart` instance is created on first render and updated via `chart.data` + `chart.update()` on subsequent renders (avoids canvas memory leaks from repeated `new Chart()` calls).
- When `transactions` is empty, the Chart instance is destroyed and a placeholder `<p>` is shown instead.
- Chart.js is configured with `plugins.legend.display: true` so category names appear in the legend.
- Category colors are fixed constants:
  - Food: `#FF6384`
  - Transport: `#36A2EB`
  - Fun: `#FFCE56`

**Interface**:
```js
// Returns { labels: string[], data: number[], colors: string[] }
function computeChartData(transactions) { ... }

function renderChart(transactions) { ... }
```

### 5. Validator

**Behavior**:
- Pure function — takes form field values, returns a validation result object.
- Validates:
  - `name`: non-empty after trimming whitespace
  - `amount`: a finite number greater than zero (rejects zero, negative, NaN, non-numeric strings)
  - `category`: one of the three valid values (`"Food"`, `"Transport"`, `"Fun"`)
- Returns error entries only for invalid fields; valid fields produce no error entry.

**Interface**:
```js
//  Returns { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
function validateForm(name, amount, category) { ... }
```

### 6. Storage Service

**Behavior**:
- Wraps `localStorage` access in try/catch to handle `SecurityError` (private browsing) and `JSON.parse` failures.
- On load failure, returns `null` and the app initializes with an empty array.
- If `load()` returns a value that parses as JSON but is not an array, it is treated as malformed and `null` is returned.
- Exposes two functions: `save` and `load`.

**Interface**:
```js
const StorageService = {
  // Serializes transactions array to JSON and writes to localStorage.
  // Logs a console warning on failure; does not throw.
  save(transactions) { ... },

  // Returns parsed transactions array, or null on any failure
  // (SecurityError, malformed JSON, non-array value).
  load() { ... }
};
```

---

## Data Models

### Transaction

```js
{
  id: string,        // crypto.randomUUID() or Date.now().toString() fallback
  name: string,      // item name, non-empty after trim
  amount: number,    // positive finite number, stored as float
  category: string,  // one of: "Food" | "Transport" | "Fun"
  timestamp: number  // Date.now() at time of creation, used for ordering
}
```

### Application State

```js
// In-memory array, single source of truth
let transactions = []; // Transaction[]
```

### Local Storage Schema

```
Key:   "expense-visualizer-transactions"
Value: JSON.stringify(Transaction[])
```

### Category Color Map

```js
const CATEGORY_COLORS = {
  Food:      "#FF6384",
  Transport: "#36A2EB",
  Fun:       "#FFCE56"
};

const VALID_CATEGORIES = ["Food", "Transport", "Fun"];
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The pure-function core of this app (validation, balance computation, chart data aggregation, list ordering, and storage serialization) is well-suited to property-based testing. UI layout, browser compatibility, CSS behavior, and performance requirements are not suitable for PBT and are covered by manual/smoke tests instead.

### Property 1: Valid transaction addition

*For any* valid transaction (non-empty name, positive finite amount, valid category), calling `addTransaction()` with those values shall result in the `transactions` array containing a new entry whose `name`, `amount`, and `category` match the inputs exactly.

**Validates: Requirements 1.2, 2.4**

---

### Property 2: Validator rejects all invalid inputs

*For any* combination of form field values where at least one field is invalid (empty or whitespace-only name; zero, negative, non-finite, or non-numeric amount; or missing/invalid category), `validateForm()` shall return `valid: false` and include an error entry for each invalid field, while returning no error entry for any valid field.

**Validates: Requirements 1.4, 1.5**

---

### Property 3: Form resets after valid submission

*For any* valid (name, amount, category) input submitted through the form, after `addTransaction()` completes, all form fields shall be reset to their default empty/unselected state.

**Validates: Requirements 1.3**

---

### Property 4: Transaction list renders complete item data with delete control

*For any* non-empty `transactions` array, `renderTransactionList()` shall produce a list where each rendered item contains the transaction's item name, formatted amount, category, and a delete control — and no item's data appears in another item's rendered output.

**Validates: Requirements 2.1, 2.5**

---

### Property 5: Transaction list is in reverse-chronological order

*For any* `transactions` array with two or more entries having distinct timestamps, `renderTransactionList()` shall render items such that for every adjacent pair of rendered items, the upper item has a timestamp greater than or equal to the lower item's timestamp.

**Validates: Requirements 2.3**

---

### Property 6: Delete removes exactly the targeted transaction

*For any* `transactions` array and any transaction `id` present in that array, calling `deleteTransaction(id)` shall result in a `transactions` array that contains all original entries except the one with the matching `id`, with all remaining entries unchanged.

**Validates: Requirements 2.6**

---

### Property 7: Balance equals sum of transaction amounts

*For any* `transactions` array (including the empty array), `computeBalance()` shall return a value equal to the arithmetic sum of all `transaction.amount` values formatted to exactly two decimal places, and shall return `0.00` when the array is empty.

**Validates: Requirements 3.1, 3.4**

---

### Property 8: Chart data reflects actual category distribution with correct colors

*For any* `transactions` array, `computeChartData()` shall return labels, data, and colors arrays such that: (a) every category present in the transactions appears exactly once in the labels, (b) every category absent from the transactions does not appear in the labels, (c) each data value equals the sum of amounts for its corresponding category, and (d) each label's corresponding color matches the value in `CATEGORY_COLORS` for that category.

**Validates: Requirements 4.1, 4.5**

---

### Property 9: Storage round-trip preserves transaction list

*For any* `transactions` array (including the empty array), calling `StorageService.save(transactions)` followed by `StorageService.load()` shall return an array that is deeply equal to the original input — same length, same order, and same field values for every entry.

**Validates: Requirements 5.1, 5.2, 5.3**

---

## Error Handling

### Validation Errors

- `validateForm()` returns a structured error object rather than throwing. The form submit handler reads this object and renders inline error messages adjacent to the offending fields.
- Error messages are cleared at the start of each submit attempt so stale errors do not persist.
- The validator treats whitespace-only strings as empty for the name field, and rejects zero, negative, non-finite, and non-numeric values for the amount field.

### Storage Errors

- `StorageService.save()` wraps `localStorage.setItem()` in a try/catch. On failure (e.g., storage quota exceeded, `SecurityError` in private browsing), it logs a console warning and does not throw — the in-memory state remains correct for the current session.
- `StorageService.load()` wraps `localStorage.getItem()` and `JSON.parse()` in a try/catch. On any failure (missing key, malformed JSON, `SecurityError`), it returns `null`. The app initialization code treats a `null` return as an empty transaction list and displays a non-blocking banner warning to the user.
- If `StorageService.load()` returns a value that parses as valid JSON but is not an array (e.g., a stray string or object written to the key by another script), the app treats it as malformed, returns `null`, and initializes with an empty list.

### Chart.js Unavailability

- If Chart.js fails to load from the CDN (offline use, CDN outage), the `<canvas>` element will be present but `window.Chart` will be undefined. `renderChart()` checks for `window.Chart` before attempting to create a chart instance and falls back to a text message inside the chart container (e.g., "Chart unavailable — could not load Chart.js").

### Invalid Stored Data Shape

- If `StorageService.load()` returns a non-array value after successful JSON parsing, the app logs a console warning, discards the value, and initializes with an empty transaction list. The non-blocking warning banner is shown to the user in this case as well.

---

## Testing Strategy

### Dual Testing Approach

Testing is split into two complementary layers:

- **Unit / property-based tests**: Verify the pure-function core (validator, balance computation, chart data aggregation, list ordering, storage serialization) using property-based testing with many generated inputs.
- **Smoke / manual tests**: Verify UI layout, browser compatibility, CSS behavior, performance, and Chart.js configuration — concerns that do not vary meaningfully with input and are not suitable for PBT.

### Property-Based Testing

The property-based testing library for this project is **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript). Each property test is configured to run a minimum of **100 iterations**.

Each property test is tagged with a comment referencing the design property it validates:

```js
// Feature: expense-budget-visualizer, Property 7: Balance equals sum of transaction amounts
```

**Properties to implement as property-based tests:**

| Property | Function under test | Generator inputs |
|---|---|---|
| 1: Valid transaction addition | `addTransaction()` | Random non-empty strings, positive floats, valid categories |
| 2: Validator rejects invalid inputs | `validateForm()` | Random combinations with at least one invalid field |
| 3: Form resets after valid submission | Form submit handler | Random valid (name, amount, category) tuples |
| 4: Transaction list renders complete item data | `renderTransactionList()` | Random non-empty Transaction arrays |
| 5: Transaction list is in reverse-chronological order | `renderTransactionList()` | Random Transaction arrays with distinct timestamps |
| 6: Delete removes exactly the targeted transaction | `deleteTransaction()` | Random Transaction arrays + random id from that array |
| 7: Balance equals sum of transaction amounts | `computeBalance()` | Random Transaction arrays (including empty) |
| 8: Chart data reflects category distribution with correct colors | `computeChartData()` | Random Transaction arrays (including empty, single-category, all-category) |
| 9: Storage round-trip preserves transaction list | `StorageService.save()` + `StorageService.load()` | Random Transaction arrays (including empty) |

### Unit / Example-Based Tests

Unit tests cover specific scenarios and edge cases not fully exercised by property generators:

- Validator accepts a transaction with all three valid categories individually.
- Validator rejects amount of `0`, `-1`, `NaN`, `""`, and `"abc"`.
- Validator rejects whitespace-only name (`" "`, `"\t"`, `"\n"`).
- `computeBalance()` returns `"0.00"` for an empty array.
- `renderTransactionList()` renders a placeholder message when the array is empty.
- `StorageService.load()` returns `null` when `localStorage` throws a `SecurityError`.
- `StorageService.load()` returns `null` when the stored value is valid JSON but not an array.
- `renderChart()` renders a fallback message when `window.Chart` is undefined.

### Smoke / Manual Tests

These are verified manually or via a browser-based checklist:

- App opens via `file://` protocol in Chrome, Firefox, Edge, and Safari without errors.
- Layout is correct and usable at 320px, 375px, 768px, and 1440px viewport widths.
- All interactive targets are at least 44×44 CSS pixels on a touch device.
- Chart.js legend is visible and shows category names.
- Initial load with persisted data completes within 2 seconds.
- Add/delete operations complete within 200ms (verified via DevTools Performance panel).
- Non-blocking warning banner appears when localStorage is unavailable (tested in private browsing mode).
