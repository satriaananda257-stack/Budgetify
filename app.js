// =============================================================================
// Constants
// =============================================================================

const VALID_CATEGORIES = ["Food", "Transport", "Fun"];

const CATEGORY_COLORS = {
  Food:      "#FF6384",
  Transport: "#36A2EB",
  Fun:       "#FFCE56"
};

// =============================================================================
// Data Model
// =============================================================================

/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier (crypto.randomUUID() or Date.now().toString() fallback)
 * @property {string} name      - Item name, non-empty after trim
 * @property {number} amount    - Positive finite number, stored as float
 * @property {string} category  - One of: "Food" | "Transport" | "Fun"
 * @property {number} timestamp - Date.now() at time of creation, used for ordering
 */

/** @type {Transaction[]} */
let transactions = [];

// =============================================================================
// Validator
// =============================================================================

/**
 * Validates the transaction input form fields.
 *
 * @param {string} name      - Item name (must be non-empty after trimming)
 * @param {*}      amount    - Amount value (must be a finite number > 0)
 * @param {string} category  - Category (must be one of VALID_CATEGORIES)
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateForm(name, amount, category) {
  const errors = {};

  // Validate name: must be non-empty after trimming whitespace
  if (typeof name !== "string" || name.trim() === "") {
    errors.name = "Item name is required.";
  }

  // Validate amount: must be a finite number greater than zero
  const numericAmount = Number(amount);
  if (
    amount === "" ||
    amount === null ||
    amount === undefined ||
    !isFinite(numericAmount) ||
    isNaN(numericAmount) ||
    numericAmount <= 0
  ) {
    errors.amount = "Amount must be a positive number.";
  }

  // Validate category: must be one of the predefined valid categories
  if (!VALID_CATEGORIES.includes(category)) {
    errors.category = "Please select a valid category.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// =============================================================================
// Balance
// =============================================================================

/**
 * Computes the total balance from an array of transactions.
 *
 * @param {Transaction[]} transactions - Array of transaction objects
 * @returns {number} Sum of all transaction amounts, rounded to 2 decimal places.
 *                   Returns 0.00 for an empty array.
 */
function computeBalance(transactions) {
  if (transactions.length === 0) {
    return 0.00;
  }
  const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
  return Math.round(sum * 100) / 100;
}

// =============================================================================
// Chart Data
// =============================================================================

/**
 * Aggregates transaction amounts by category for use in a pie chart.
 * Only includes categories that have at least one transaction.
 * Colors are sourced from CATEGORY_COLORS.
 *
 * @param {Transaction[]} transactions - Array of transaction objects
 * @returns {{ labels: string[], data: number[], colors: string[] }}
 */
function computeChartData(transactions) {
  // Aggregate amounts per category, preserving insertion order of VALID_CATEGORIES
  const totals = {};

  for (const t of transactions) {
    if (totals[t.category] === undefined) {
      totals[t.category] = 0;
    }
    totals[t.category] += t.amount;
  }

  const labels = [];
  const data = [];
  const colors = [];

  // Iterate in the canonical category order so output is deterministic
  for (const category of VALID_CATEGORIES) {
    if (totals[category] !== undefined) {
      labels.push(category);
      data.push(Math.round(totals[category] * 100) / 100);
      colors.push(CATEGORY_COLORS[category]);
    }
  }

  return { labels, data, colors };
}

// =============================================================================
// Storage Service
// =============================================================================

/**
 * Wraps localStorage access for persisting and restoring the transactions array.
 * All methods handle SecurityError (private browsing) and malformed JSON gracefully.
 */
const StorageService = {
  /**
   * Serializes the transactions array to JSON and writes it to localStorage.
   * Logs a console warning on failure; does not throw.
   *
   * @param {Transaction[]} transactions - The current transactions array to persist
   */
  save(transactions) {
    try {
      localStorage.setItem(
        "expense-visualizer-transactions",
        JSON.stringify(transactions)
      );
    } catch (err) {
      console.warn("StorageService.save: failed to persist transactions.", err);
    }
  },

  /**
   * Reads and parses the transactions array from localStorage.
   * Returns the parsed array if it is a valid array, otherwise returns null.
   * Returns null on SecurityError, missing key, or malformed JSON.
   *
   * @returns {Transaction[]|null} The stored transactions array, or null on any failure
   */
  load() {
    try {
      const raw = localStorage.getItem("expense-visualizer-transactions");
      if (raw === null) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  }
};

// =============================================================================
// Transaction Mutations
// =============================================================================

/**
 * Creates a new transaction and adds it to the in-memory transactions array,
 * persists the updated array to localStorage, then triggers a full UI re-render.
 *
 * @param {string} name      - Item name (non-empty after trim)
 * @param {number} amount    - Positive finite number
 * @param {string} category  - One of: "Food" | "Transport" | "Fun"
 */
function addTransaction(name, amount, category) {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Date.now().toString();

  const newTransaction = {
    id,
    name,
    amount: Number(amount),
    category,
    timestamp: Date.now()
  };

  transactions.push(newTransaction);
  StorageService.save(transactions);
  renderAll(); // defined in task 6.6
}

/**
 *  Removes the transaction with the given id from the in-memory transactions array,
 *  persists the updated array to localStorage, then triggers a full UI re-render.
 *
 * @param {string} id - The unique identifier of the transaction to remove
 */
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  StorageService.save(transactions);
  renderAll(); // defined in task 6.6
}

// =============================================================================
// UI Render Functions
// =============================================================================

/**
 * Renders the current total balance into the #balance-display element.
 * Calls computeBalance() and formats the result to exactly 2 decimal places.
 *
 * @param {Transaction[]} transactions - The current transactions array
 */
function renderBalanceDisplay(transactions) {
  const balanceEl = document.getElementById("balance-display");
  if (!balanceEl) return;
  const balance = computeBalance(transactions);
  balanceEl.textContent = balance.toFixed(2);
}

// =============================================================================
// Transaction List Render
// =============================================================================

/**
 * Tracks whether the delegated click listener has been attached to
 * #transaction-list. Ensures the listener is only attached once, not
 * re-attached on every render call.
 *
 * @type {boolean}
 */
let _transactionListListenerAttached = false;

/**
 * Fully re-renders the #transaction-list element from the provided transactions
 * array. Items are sorted by timestamp descending (newest first). Each <li>
 * contains the item name, amount formatted to 2 decimal places, a category
 * badge, and a delete button with a data-id attribute.
 *
 * When the array is empty, a single placeholder <li> with "No transactions yet"
 * is rendered instead.
 *
 * A single delegated click listener is attached to the list element on the
 * first call to handle delete button clicks via data-id. Subsequent calls do
 * not re-attach the listener.
 *
 * @param {Transaction[]} transactions - The current transactions array
 */
function renderTransactionList(transactions) {
  const listEl = document.getElementById("transaction-list");
  if (!listEl) return;

  // Attach the delegated click listener exactly once
  if (!_transactionListListenerAttached) {
    listEl.addEventListener("click", function (event) {
      const btn = event.target.closest("button[data-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (id) {
        deleteTransaction(id);
      }
    });
    _transactionListListenerAttached = true;
  }

  // Clear existing content
  listEl.innerHTML = "";

  // Empty state
  if (transactions.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    emptyLi.textContent = "No transactions yet";
    listEl.appendChild(emptyLi);
    return;
  }

  // Sort by timestamp descending (newest first)
  const sorted = transactions.slice().sort((a, b) => b.timestamp - a.timestamp);

  for (const t of sorted) {
    const li = document.createElement("li");

    // Item name
    const nameSpan = document.createElement("span");
    nameSpan.className = "transaction-name";
    nameSpan.textContent = t.name;

    // Amount formatted to 2 decimal places
    const amountSpan = document.createElement("span");
    amountSpan.className = "transaction-amount";
    amountSpan.textContent = t.amount.toFixed(2);

    // Category badge
    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.setAttribute("data-category", t.category);
    badge.textContent = t.category;

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.setAttribute("data-id", t.id);
    deleteBtn.setAttribute("aria-label", `Delete ${t.name}`);
    deleteBtn.textContent = "Delete";

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(badge);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  }
}

// =============================================================================
// Chart Render
// =============================================================================

/**
 * Tracks the single Chart.js instance across renders.
 * Reusing the same instance (rather than creating a new one each time)
 * avoids canvas memory leaks.
 *
 * @type {Chart|null}
 */
let _chartInstance = null;

/**
 * Renders a pie chart of spending by category inside #chart-container.
 *
 * Behaviour:
 *  - If window.Chart is undefined (CDN failed to load), displays a fallback
 *    text message and returns early.
 *  - If transactions is empty, destroys any existing Chart instance and shows
 *    a "No data available" placeholder message.
 *  - On first render with data, creates a new Chart instance.
 *  - On subsequent renders with data, updates chart.data and calls
 *    chart.update() to avoid memory leaks from repeated new Chart() calls.
 *  - Configures plugins.legend.display: true so category names appear in the
 *    legend.
 *
 * @param {Transaction[]} transactions - The current transactions array
 */
function renderChart(transactions) {
  const container = document.getElementById("chart-container");
  if (!container) return;

  // Guard: Chart.js not available (CDN failed to load)
  if (typeof window.Chart === "undefined") {
    container.innerHTML =
      '<p class="chart-fallback">Chart unavailable — could not load Chart.js</p>';
    return;
  }

  const canvas = document.getElementById("spending-chart");
  if (!canvas) return;

  // Empty state: destroy existing instance and show placeholder
  if (transactions.length === 0) {
    if (_chartInstance !== null) {
      _chartInstance.destroy();
      _chartInstance = null;
    }
    // Hide canvas, show placeholder message
    canvas.style.display = "none";
    // Remove any previous placeholder before adding a new one
    const existing = container.querySelector(".chart-placeholder");
    if (!existing) {
      const placeholder = document.createElement("p");
      placeholder.className = "chart-placeholder";
      placeholder.textContent = "No data available";
      container.appendChild(placeholder);
    }
    return;
  }

  // We have data — remove any placeholder message and ensure canvas is visible
  const placeholder = container.querySelector(".chart-placeholder");
  if (placeholder) {
    placeholder.remove();
  }
  canvas.style.display = "";

  const { labels, data, colors } = computeChartData(transactions);

  if (_chartInstance === null) {
    // First render: create a new Chart instance
    _chartInstance = new window.Chart(canvas, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: true
          }
        }
      }
    });
  } else {
    // Subsequent renders: update existing instance to avoid memory leaks
    _chartInstance.data.labels = labels;
    _chartInstance.data.datasets[0].data = data;
    _chartInstance.data.datasets[0].backgroundColor = colors;
    _chartInstance.update();
  }
}

// =============================================================================
// Central Re-render
// =============================================================================

/**
 * Re-renders all UI regions from the current in-memory transactions array.
 * Called after every state change (add or delete transaction, and on app init).
 *
 * Calls renderBalanceDisplay, renderTransactionList, and renderChart in
 * sequence, each reading from the global `transactions` array.
 */
function renderAll() {
  renderBalanceDisplay(transactions);
  renderTransactionList(transactions);
  renderChart(transactions);
}

// =============================================================================
// Form Handler
// =============================================================================

/**
 * Handles the transaction form's submit event.
 *
 * Steps:
 *  1. Prevents the default browser form submission.
 *  2. Clears all inline error <span> elements so stale messages do not persist.
 *  3. Reads the current field values from #item-name, #item-amount, and
 *     #item-category.
 *  4. Calls validateForm() with those values.
 *  5. If validation fails, renders each error message adjacent to its
 *     offending field and returns early.
 *  6. If validation passes, calls addTransaction() with the field values and
 *     then resets the form to its default empty/unselected state.
 *
 * @param {Event} event - The form submit event
 */
function handleFormSubmit(event) {
  // 1. Prevent default browser form submission / page reload
  event.preventDefault();

  // 2. Clear all inline error spans at the start of each attempt
  const nameError     = document.getElementById("item-name-error");
  const amountError   = document.getElementById("item-amount-error");
  const categoryError = document.getElementById("item-category-error");

  if (nameError)     nameError.textContent     = "";
  if (amountError)   amountError.textContent   = "";
  if (categoryError) categoryError.textContent = "";

  // 3. Read current field values
  const nameInput     = document.getElementById("item-name");
  const amountInput   = document.getElementById("item-amount");
  const categoryInput = document.getElementById("item-category");

  const name     = nameInput     ? nameInput.value     : "";
  const amount   = amountInput   ? amountInput.value   : "";
  const category = categoryInput ? categoryInput.value : "";

  // 4. Validate
  const { valid, errors } = validateForm(name, amount, category);

  // 5. If invalid, render error messages and return early
  if (!valid) {
    if (errors.name     && nameError)     nameError.textContent     = errors.name;
    if (errors.amount   && amountError)   amountError.textContent   = errors.amount;
    if (errors.category && categoryError) categoryError.textContent = errors.category;
    return;
  }

  // 6. Valid — add the transaction and reset the form
  addTransaction(name, Number(amount), category);
  event.target.reset();
}

// =============================================================================
// App Initialization
// =============================================================================

/**
 * Initializes the application on DOMContentLoaded.
 *
 * Steps:
 *  1. Calls StorageService.load() to restore persisted transactions.
 *     - If load() returns null (storage unavailable or malformed data),
 *       initializes with an empty array and shows the #warning-banner.
 *     - Otherwise, sets transactions to the loaded array.
 *  2. Wires up the #warning-banner-close button to dismiss the banner.
 *  3. Attaches the submit event listener on #transaction-form.
 *  4. Calls renderAll() to paint the initial UI state.
 *
 * Requirements: 5.3, 5.4, 8.1
 */
document.addEventListener("DOMContentLoaded", function () {
  // 1. Restore persisted transactions from localStorage
  const loaded = StorageService.load();

  if (loaded === null) {
    // Storage unavailable or data was malformed — start with empty list
    transactions = [];

    // Show the non-blocking warning banner
    const banner = document.getElementById("warning-banner");
    if (banner) {
      banner.hidden = false;
    }
  } else {
    transactions = loaded;
  }

  // 2. Wire up the warning banner dismiss button
  const bannerCloseBtn = document.getElementById("warning-banner-close");
  if (bannerCloseBtn) {
    bannerCloseBtn.addEventListener("click", function () {
      const banner = document.getElementById("warning-banner");
      if (banner) {
        banner.hidden = true;
      }
    });
  }

  // 3. Attach the form submit listener
  const form = document.getElementById("transaction-form");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  // 4. Paint the initial UI state
  renderAll();
});
