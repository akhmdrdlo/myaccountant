# 💰 myAccountant

A modern, privacy-focused Personal Finance Tracker that gives you full control over your data.

**myAccountant** allows you to track expenses, income, subscriptions, and financial goals using **Google Sheets as your private backend database.** No 3rd party servers, no hidden fees—just you and your spreadsheet.

## ✨ Key Features

### 📊 Dashboard & Tracking
- **Smart Overview**: See your Total Balance, Cash in Hand, and Bank Savings at a glance.
- **Transaction Tracking**: Easily record Income, Expenses, and Transfers between accounts.
- **Quick Actions**: One-tap shortcuts for frequent expenses like "Makan Siang", "Transport", or "Jajan".

### 💳 Subscription Management
- **Recurring Bills**: Never miss a payment again. Track **Netflix, Spotify, Internet**, and other recurring bills.
- **Billing Calendar**: Visual indicators for when bills are due.

### 🎯 Goals & Budgeting
- **Barang Harapan (Wishlist)**: Create savings goals for items you want to buy. Track progress with visual bars.
- **Smart Budgeting**: Set monthly limits for categories (e.g., Makan, Transport).
- **Safety Buffer**: Define a "Dana Darurat" to ensure you never overspend your safety net.

### 📈 Analytics
- **Visual Insights**: specific breakdowns of where your money goes.
- **Monthly Reports**: Compare spending against your budget.

### 🔒 Privacy First
- **PIN Lock**: Simple security layer to keep your dashboard private.
- **Your Data, Your Control**: All data is stored in **your own Google Sheet**. You have full access and ownership of your raw financial data.

---

## 🛠️ Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Integration**: Google Sheets API (v4)

---

## 🚀 Getting Started

To run this project locally, you will need your own Google Cloud Console credentials.

### Prerequisites
1. Node.js (v18 or later)
2. A Google Cloud Project with **Google Sheets API** enabled.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/my-accountant.git
   cd my-accountant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Google Sheets credentials:
   ```env
   VITE_GOOGLE_SCRIPT_URL=your_api_key_here
   ```
   > **Note**: Never commit your `.env` file to public repositories!

4. **Run the Application**
   ```bash
   npm run dev
   ```

## 📝 Usage Note
This application requires a specific Google Sheet structure to function correctly. Ensure your spreadsheet has the required tabs (`Transactions`, `Metadata`, etc.) or let the app initialize them for you (functionality pending implementation).

## Developer
- **Name**: Akhmad Ridlo
- **Email**: akhmadd432@gmail.com