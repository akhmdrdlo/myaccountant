import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { AccountCards } from './components/home/AccountCards';
import { TransactionList } from './components/home/TransactionList';
import { TransactionForm } from './components/home/TransactionForm';
import { FinancialSummary } from './components/home/FinancialSummary';
import { GoalCard } from './components/home/GoalCard';
import { BudgetList } from './components/home/BudgetList';
import { AnalyticsView } from './components/home/AnalyticsView';
import { AccountProfile } from './components/account/AccountProfile';
import { InvestmentView } from './components/home/InvestmentView';
import { AuthScreen } from './components/auth/AuthScreen';
import { GoalForm } from './components/home/GoalForm';
import { BudgetSettings } from './components/home/BudgetSettings';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { useFinanceStore } from './store/useFinanceStore';
import { useThemeStore } from './store/useThemeStore'; // Init Theme
import { SpendingProgress } from './components/home/SpendingProgress';
import { AktivitasKalender } from './components/home/AktivitasKalender';
import { TransaksiTerbaru } from './components/home/TransaksiTerbaru';
import type { TransactionInput, Goal, Budget } from './types';
import { Toaster } from 'sonner';

import { useSubscriptionAutoRecord } from './hooks/useSubscriptionAutoRecord';

// New Sub-views
import { AiAdvisorView } from './components/home/AiAdvisorView';
import { DompetView } from './components/home/DompetView';
import { KebutuhanView } from './components/home/KebutuhanView';
import { TipsView } from './components/home/TipsView';
import { DeadlinesView } from './components/home/DeadlinesView';
import { TrendingUp, Sliders, Wallet, Sparkles, Target, Lightbulb, Calendar, PieChart, ArrowLeft } from 'lucide-react';

function App() {
  // Auto Record Subscriptions
  useSubscriptionAutoRecord();

  const { fetchTransactions, addTransaction, addGoal, updateGoal, deleteGoal, saveBudgets: saveBudgetsApi } = useGoogleSheets();
  const {
    transactions,
    setTransactions,
    setMetadata,
    goals,
    setGoals,
    budgets,
    setBudgets,
    setSubscriptions,
    setInvestments,
    addTransactionOptimistic,
    removeTransactionOptimistic,
    setLoading,
    loading: storeLoading,
    getSeabankBalance // Get helper
  } = useFinanceStore();

  // Theme Init
  useThemeStore();

  const [activeTab, setActiveTab] = useState('home');
  const [currentSubview, setCurrentSubview] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<TransactionInput> | undefined>(undefined);

  // New Modals State
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('myaccountant_token');
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setLoading(true);
      const result = await fetchTransactions();

      // Handle the new return signature
      if (Array.isArray(result)) {
        setTransactions(result); // Fallback for mock or old API
      } else {
        setTransactions(result.transactions);
        if (result.metadata) setMetadata(result.metadata);
        if (result.goals) setGoals(result.goals);
        if (result.budgets) setBudgets(result.budgets);
        if (result.subscriptions) setSubscriptions(result.subscriptions);
        if (result.investments) setInvestments(result.investments);
      }
      setLoading(false);
    };
    loadData();
  }, [isAuthenticated, fetchTransactions, setTransactions, setMetadata, setGoals, setBudgets, setSubscriptions, setInvestments, setLoading]);

  const handleOpenForm = (initial?: Partial<TransactionInput>) => {
    setFormInitialData(initial);
    setIsFormOpen(true);
  };

  const handleAddTransaction = async (input: TransactionInput) => {
    // 1. Dual Entry for Transfer
    if (input.type === 'transfer') {
      const sourceTx: TransactionInput = {
        type: 'expense',
        category: 'Transfer / Tarik Tunai',
        amount: input.amount,
        description: `Transfer ke ${input.toAccount} (${input.description})`,
        account: input.account,
      };

      const destTx: TransactionInput = {
        type: 'income',
        category: 'Transfer / Tarik Tunai',
        amount: input.amount,
        description: `Transfer dari ${input.account} (${input.description})`,
        account: input.toAccount || 'Cash', // Fallback if missing
      };

      // Optimistic Update for both
      const tempId1 = crypto.randomUUID();
      const tempId2 = crypto.randomUUID();

      const t1 = { ...sourceTx, id: tempId1, timestamp: new Date().toISOString(), status: 'pending' as const };
      const t2 = { ...destTx, id: tempId2, timestamp: new Date().toISOString(), status: 'pending' as const };

      addTransactionOptimistic(t1);
      // Wait roughly before adding second to avoid identical timestamp collision if sorting relies on it strictly
      addTransactionOptimistic(t2);

      try {
        await addTransaction(sourceTx);
        await addTransaction(destTx);

        const result = await fetchTransactions();
        if (Array.isArray(result)) setTransactions(result);
        else setTransactions(result.transactions);
        return true;
      } catch (err) {
        console.error("Transfer failed", err);
        removeTransactionOptimistic(tempId1);
        removeTransactionOptimistic(tempId2);
        alert("Gagal melakukan transfer.");
        return false;
      }
    }

    // Normal Transaction Logic
    const tempId = crypto.randomUUID();
    const tempTransaction = {
      ...input,
      id: tempId,
      timestamp: new Date().toISOString(),
      status: 'pending' as const
    };

    addTransactionOptimistic(tempTransaction);

    // 2. Call API
    try {
      const success = await addTransaction(input);
      if (!success) {
        throw new Error("Failed to save");
      }
      // Re-fetch to get consistent state
      const result = await fetchTransactions();
      if (Array.isArray(result)) {
        setTransactions(result);
      } else {
        setTransactions(result.transactions);
        if (result.metadata) setMetadata(result.metadata);
      }
      return true;
    } catch (err) {
      console.error("Failed to add transaction", err);
      // Rollback
      removeTransactionOptimistic(tempId);
      alert("Gagal menyimpan transaksi. Cek koneksi internet.");
      return false;
    }
  };

  // Goal Handlers
  const handleOpenGoalForm = (goal?: Goal) => {
    setEditingGoal(goal);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goal: Goal) => {
    // Optimistic Update
    if (editingGoal) {
      setGoals(goals.map(g => g.id === goal.id ? goal : g));
      await updateGoal(goal);
    } else {
      setGoals([...goals, goal]);
      await addGoal(goal);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    // Optimistic Update
    setGoals(goals.filter(g => g.id !== id));
    await deleteGoal(id);
  };

  const handleSaveBudgets = async (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    await saveBudgetsApi(newBudgets);
  };

  // Extract categories for Budget Settings (from existing transactions or predefined)
  const availableCategories = Array.from(new Set(transactions.map(t => t.category)));
  // Ensure default categories exist if no transactions
  const defaultCategories = ['Makan Weekday', 'Makan Weekend', 'Transport', 'Jajan/Hobi', 'Utilitas', 'Kos (Tabungan)'];
  const allCategories = Array.from(new Set([...defaultCategories, ...availableCategories]));


  if (!isAuthenticated) {
    return (
      <>
        <Toaster richColors closeButton position="top-center" />
        <AuthScreen onSuccess={() => setIsAuthenticated(true)} />
      </>
    );
  }

  // Get Safety Buffer from Budgets (Special Category)
  const safetyBuffer = budgets.find(b => b.category === 'Dana Darurat (Safety Buffer)')?.limit || 0;

  // Sync Logic: Get Seabank Balance
  const seabankBalance = getSeabankBalance ? getSeabankBalance() : 0;

  return (
    <Layout activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setCurrentSubview(null); }} onFabClick={() => handleOpenForm()}>
      <Toaster richColors closeButton position="top-center" />

      {/* Home Tab */}
      {activeTab === 'home' && (
        currentSubview === 'investasi' ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <button onClick={() => setCurrentSubview(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </button>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Investasi & Aset</h2>
            </div>
            <InvestmentView />
          </div>
        ) : currentSubview === 'kebutuhan' ? (
          <KebutuhanView
            transactions={transactions}
            budgets={budgets}
            onOpenSettings={() => setIsBudgetSettingsOpen(true)}
            onBack={() => setCurrentSubview(null)}
          />
        ) : currentSubview === 'dompet' ? (
          <DompetView
            onBack={() => setCurrentSubview(null)}
            onOpenTransactionForm={() => handleOpenForm()}
          />
        ) : currentSubview === 'ai_advisor' ? (
          <AiAdvisorView
            onBack={() => setCurrentSubview(null)}
          />
        ) : currentSubview === 'goals' ? (
          <div className="flex flex-col min-h-[80vh] bg-brimo-bg dark:bg-gray-900 transition-colors animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentSubview(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                  <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                    <Target className="w-5 h-5 text-indigo-500" />
                    Barang Harapan
                  </h2>
                  <p className="text-[10px] text-gray-400">Daftar wishlist impian Anda</p>
                </div>
              </div>
              <button onClick={() => handleOpenGoalForm()} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition active:scale-95">
                Tambah
              </button>
            </div>
            <div className="p-4 space-y-4">
              {goals.map(goal => {
                const isSeabankSync = goal.name.toLowerCase().includes('barang harapan') || goal.name.toLowerCase().includes('wishlist');
                const displayAmount = isSeabankSync ? seabankBalance : goal.currentAmount;

                return (
                  <GoalCard
                    key={goal.id}
                    title={goal.name}
                    currentAmount={displayAmount}
                    targetAmount={goal.targetAmount}
                    deadline={goal.deadline}
                    color={goal.color}
                    safetyBuffer={safetyBuffer}
                    onEdit={() => handleOpenGoalForm(goal)}
                  />
                )
              })}
              {goals.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-200 text-center py-8 italic bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">Belum ada barang harapan. Tambahkan sekarang!</p>
              )}
            </div>
          </div>
        ) : currentSubview === 'tips' ? (
          <TipsView
            onBack={() => setCurrentSubview(null)}
          />
        ) : currentSubview === 'deadlines' ? (
          <DeadlinesView
            onBack={() => setCurrentSubview(null)}
          />
        ) : (
          <>
            <AccountCards
              onOpenTransactionForm={handleOpenForm}
              onQuickPay={(category, type) => {
                handleOpenForm({ category, type });
              }}
            />

            {/* Dashboard Menu Grid */}
            <div className="px-1 mb-8">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 text-xs uppercase tracking-wide">Fitur Rplanner</h3>
              <div className="grid grid-cols-4 gap-y-5 gap-x-2">
                <button onClick={() => setCurrentSubview('investasi')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 group-hover:scale-105 active:scale-95 transition">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Investasi</span>
                </button>

                <button onClick={() => setCurrentSubview('kebutuhan')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center border border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400 group-hover:scale-105 active:scale-95 transition">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Kebutuhan</span>
                </button>

                <button onClick={() => setCurrentSubview('dompet')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center border border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-400 group-hover:scale-105 active:scale-95 transition">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Dompet</span>
                </button>

                <button onClick={() => setCurrentSubview('ai_advisor')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center border border-orange-100 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 group-hover:scale-105 active:scale-95 transition">
                    <Sparkles className="w-5 h-5 fill-orange-500/10" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">AI Advisor</span>
                </button>

                <button onClick={() => setCurrentSubview('goals')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 active:scale-95 transition">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Barang Harapan</span>
                </button>

                <button onClick={() => setCurrentSubview('tips')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-50 dark:bg-yellow-950/30 flex items-center justify-center border border-yellow-100 dark:border-yellow-900/50 text-yellow-600 dark:text-yellow-400 group-hover:scale-105 active:scale-95 transition">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Tips Finansial</span>
                </button>

                <button onClick={() => setCurrentSubview('deadlines')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center border border-pink-100 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 group-hover:scale-105 active:scale-95 transition">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Tagihan</span>
                </button>

                <button onClick={() => setActiveTab('analytics')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center border border-teal-100 dark:border-teal-900/50 text-teal-600 dark:text-teal-400 group-hover:scale-105 active:scale-95 transition">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Analisis</span>
                </button>
              </div>
            </div>

            <div className="px-1 mb-6">
              <FinancialSummary />
              <SpendingProgress />
              <AktivitasKalender transactions={transactions} />
              <TransaksiTerbaru transactions={transactions} />
            </div>
          </>
        )
      )}

      {/* Mutasi Tab */}
      {activeTab === 'mutasi' && (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 px-2">Mutasi Rekening</h2>
          <TransactionList transactions={transactions} loading={storeLoading} />
        </div>
      )}

      {/* Investasi Tab */}
      {activeTab === 'investasi' && <InvestmentView />}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="mt-4">
          <AnalyticsView transactions={transactions}>
            <div className="mt-6">
              <BudgetList
                transactions={transactions}
                budgets={budgets}
                onOpenSettings={() => setIsBudgetSettingsOpen(true)}
              />
            </div>
          </AnalyticsView>
        </div>
      )}

      {/* Akun Tab */}
      {activeTab === 'akun' && (
        <AccountProfile />
      )}



      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={formInitialData}
        onSubmit={handleAddTransaction}
        loading={storeLoading}
        accounts={useFinanceStore.getState().getAccountBalances()}
      />

      <GoalForm
        isOpen={isGoalFormOpen}
        onClose={() => setIsGoalFormOpen(false)}
        initialData={editingGoal}
        onSubmit={handleSaveGoal}
        onDelete={handleDeleteGoal}
        defaultAmount="=summary!E4"
      />

      <BudgetSettings
        isOpen={isBudgetSettingsOpen}
        onClose={() => setIsBudgetSettingsOpen(false)}
        budgets={budgets}
        categories={allCategories}
        onSave={handleSaveBudgets}
      />

    </Layout>
  );
}

export default App;
