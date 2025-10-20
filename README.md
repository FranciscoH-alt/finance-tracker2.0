# Finance Tracker — Modern End-to-End Finance Web App

A responsive, interactive finance management web app built with **React + TypeScript + Vite**.  
It tracks your **accounts, transactions, budgets, and investment growth** — all in one elegant dashboard.

---

## Features

### 💸 Transactions
- Add income or expense transactions.
- Automatically updates account balances.
- Delete transactions (balances auto-adjust).
- Categorize and search easily.

### Accounts
- Manage multiple account types (Brokerage, Checking, Savings, Credit).
- Balances update live as you record transactions.

### 📊 Dashboard
- Overview of total balance, cash flow, monthly spend, and performance.
- Interactive **10-year portfolio projection chart** with hover tooltips.
- Sparkline trends and performance KPIs.

### Budgets
- Inline editing of budget categories, limits, and spending.
- Add or delete budget categories.
- Live progress bars showing usage percentage.

### Visualization
- Custom **SVG Area Chart** (no external chart library).
- Dynamic hover tooltips and legend with current year & value.
- Three investment projections: Conservative, Moderate, Aggressive.

---

## Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Vanilla CSS (custom dark UI theme) |
| **Data Logic** | React Hooks (`useState`, `useMemo`) |
| **Visualization** | Native SVG rendering (interactive chart, sparkline) |
| **Build & Dev** | Vite, npm, ES Modules |

---

## Architecture

- Modular components (`App.tsx`, `Dashboard`, `AccountsTab`, `BudgetsTab`, `TransactionsTab`)
- Local state acts as the data layer — ready to connect to APIs or a database (e.g. PostgreSQL, Firebase, Flask, or Node backend)
- Environment configuration via `.env`
- Fully TypeScript-typed models for **Accounts** and **Transactions**

---

## 🧠 Future Enhancements
- ✅ LocalStorage or database persistence  
- ✅ AI financial assistant (budget or investment recommendations)  
- ✅ Authentication (JWT or OAuth)  
- ✅ REST / GraphQL backend integration  

---

## 🛠️ Setup

```bash
git clone https://github.com/yourname/finance-tracker.git
cd finance-tracker
npm install
npm run dev
# open http://localhost:5173
