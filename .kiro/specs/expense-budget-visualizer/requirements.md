# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, client-side web application that helps users track their daily spending. It provides a transaction input form, a scrollable transaction history, an auto-updating total balance display, and a pie chart that visualizes spending distribution by category. All data is persisted in the browser's Local Storage with no backend required. The app is built with plain HTML, CSS, and Vanilla JavaScript.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single spending record consisting of an item name, a monetary amount, and a category.
- **Category**: One of three predefined spending labels — Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Balance_Display**: The UI component at the top of the App that shows the computed total balance.
- **Input_Form**: The UI form through which the user enters a new transaction.
- **Chart**: The pie chart component that visualizes spending distribution by category.
- **Storage**: The browser's Local Storage API used to persist transaction data client-side.
- **Validator**: The client-side logic that checks Input_Form field completeness before submission.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter a new transaction with a name, amount, and category, so that I can record my spending.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name, a numeric field for the amount, and a dropdown selector for the category containing exactly the options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add the transaction to the Transaction_List.
3. WHEN the user submits the Input_Form with all fields filled, THE Input_Form SHALL reset all fields to their default empty/unselected state after the transaction is added.
4. IF the user submits the Input_Form with one or more fields empty or unselected, THEN THE Validator SHALL display an inline error message indicating which fields are missing.
5. IF the user enters a non-positive or non-numeric value in the amount field, THEN THE Validator SHALL display an inline error message indicating that the amount must be a positive number.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's item name, amount, and category.
2. WHILE transactions exist, THE Transaction_List SHALL be scrollable when the number of items exceeds the visible area.
3. THE Transaction_List SHALL display transactions in reverse-chronological order, with the most recently added transaction appearing first.
4. WHEN a transaction is added, THE Transaction_List SHALL update immediately to include the new transaction without requiring a page reload.
5. THE Transaction_List SHALL provide a delete control for each transaction.
6. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List immediately.

---

### Requirement 3: Total Balance

**User Story:** As a user, I want to see my total amount spent at the top of the page, so that I can quickly understand my overall spending.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all transaction amounts, formatted as a currency value with two decimal places.
2. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
4. WHILE no transactions exist, THE Balance_Display SHALL show a value of 0.00.

---

### Requirement 4: Spending Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart displaying the proportional spending for each category that has at least one transaction.
2. WHEN a transaction is added, THE Chart SHALL update automatically to reflect the new category distribution without requiring a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update automatically to reflect the revised category distribution without requiring a page reload.
4. WHILE no transactions exist, THE Chart SHALL display a placeholder state indicating that no data is available.
5. THE Chart SHALL assign a distinct, consistent color to each category (Food, Transport, Fun) so that categories are visually distinguishable.
6. THE Chart SHALL include a legend or labels that identify each category by name.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my spending history when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE Storage SHALL persist the updated transaction list to Local Storage immediately.
2. WHEN a transaction is deleted, THE Storage SHALL persist the updated transaction list to Local Storage immediately.
3. WHEN the App loads, THE App SHALL read all previously saved transactions from Local Storage and restore them to the Transaction_List, Balance_Display, and Chart.
4. IF Local Storage is unavailable or returns malformed data, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning message to the user.

---

### Requirement 6: Mobile-Friendly Layout

**User Story:** As a user, I want the app to work well on my phone, so that I can track spending on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to viewport widths from 320px to 1440px without horizontal scrolling or content overflow.
2. THE Input_Form, Transaction_List, Balance_Display, and Chart SHALL each remain fully usable and legible at a viewport width of 375px.
3. THE App SHALL use touch-friendly controls with interactive targets no smaller than 44×44 CSS pixels.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the app to work in any modern browser, so that I am not restricted to a specific browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari without polyfills or browser-specific workarounds.
2. THE App SHALL operate as a standalone web page that can be opened directly from the file system (via `file://` protocol) or served from any static HTTP host.

---

### Requirement 8: Performance

**User Story:** As a user, I want the app to feel fast and responsive, so that entering and reviewing transactions is not frustrating.

#### Acceptance Criteria

1. WHEN the App is opened, THE App SHALL render the initial UI and restore persisted data within 2 seconds on a standard desktop or mobile device.
2. WHEN a transaction is added or deleted, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 200ms of the user action.
3. THE App SHALL load without requiring any build step, package manager, or network connection beyond the initial page load.
