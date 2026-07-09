# 💰 Rplanner

A modern, privacy-focused Personal Finance Tracker that gives you full control over your data.

**Rplanner** allows you to track expenses, income, subscriptions, and financial goals using **Supabase as your secure database.** Each user has their own private account and database slice separated by Postgres Row Level Security (RLS).

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

### 🔒 Security First
- **Multi-user Separation**: Secure PostgreSQL RLS ensuring users can only read and write their own data.
- **User Authentication**: Secure Sign-up, Sign-in, and Sign-out using Supabase Auth.

---

## 🛠️ Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database / Backend**: Supabase (PostgreSQL with RLS)
- **State Management**: Zustand
- **Icons**: Lucide React

---

## 🚀 Getting Started

### Prerequisites
1. Node.js (v18 or later)
2. A free Supabase Project.

### Database Setup
Run the SQL script from the implementation plan in your Supabase SQL Editor to create the necessary tables, indexes, and Row Level Security (RLS) policies.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rplanner.git
   cd rplanner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file at the root of the project:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```