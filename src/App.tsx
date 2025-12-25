import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { AccountCards } from './components/home/AccountCards';
import { QuickActions } from './components/home/QuickActions';
import { TransactionList } from './components/home/TransactionList';
import { TransactionForm } from './components/home/TransactionForm';
import { FinancialSummary } from './components/home/FinancialSummary';
import { GoalCard } from './components/home/GoalCard';
import { BudgetList } from './components/home/BudgetList';
import { AnalyticsView } from './components/home/AnalyticsView';
import { AccountProfile } from './components/account/AccountProfile';
import { PinLock } from './components/auth/PinLock';
import { GoalForm } from './components/home/GoalForm';
import { BudgetSettings } from './components/home/BudgetSettings'; // New
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { SubscriptionTracker } from './components/home/SubscriptionTracker';
import { useFinanceStore } from './store/useFinanceStore';
import type { TransactionInput, Goal, Budget } from './types';

function App() {
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
    addTransactionOptimistic,
    removeTransactionOptimistic,
    setLoading,
    loading: storeLoading
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState('home');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<TransactionInput> | undefined>(undefined);

  // New Modals State
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchTransactions();
      // Handle the new return signature
      if (Array.isArray(result)) {
        setTransactions(result); // Fallback for mock or old API
      } else {
        setTransactions(result.transactions);
        // ... (rest of logic handles metadata, goals, budgets)
        if (result.metadata) setMetadata(result.metadata);
        if (result.goals) setGoals(result.goals);
        if (result.budgets) setBudgets(result.budgets);
        if (result.subscriptions) setSubscriptions(result.subscriptions);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchTransactions, setTransactions, setMetadata, setGoals, setBudgets, setLoading]);

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

  const handleQuickAction = (id: string) => {
    // Map Quick Action IDs to Categories/Types
    const mapping: Record<string, Partial<TransactionInput>> = {
      'makan_weekday': { type: 'expense', category: 'Makan Weekday' },
      'makan_weekend': { type: 'expense', category: 'Makan Weekend' },
      'jajan': { type: 'expense', category: 'Jajan/Hobi' },
      'transport': { type: 'expense', category: 'Transport' },
      'utilitas': { type: 'expense', category: 'Utilitas' },
      'tarik': { type: 'expense', category: 'Transfer / Tarik Tunai' },
      'kos': { type: 'expense', category: 'Kos (Tabungan)' },
    };

    if (mapping[id]) {
      handleOpenForm(mapping[id]);
    } else {
      // Default open
      handleOpenForm();
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
    return <PinLock onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Get Safety Buffer from Budgets (Special Category)
  const safetyBuffer = budgets.find(b => b.category === 'Dana Darurat (Safety Buffer)')?.limit || 0;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>

      {/* Home Tab */}
      {activeTab === 'home' && (
        <>
          <AccountCards onOpenTransactionForm={handleOpenForm} />


          <QuickActions
            onActionClick={handleQuickAction}
            transactions={transactions} // Pass for sorting
          />

          <div className="px-1 mb-6">
            <FinancialSummary />
          </div>

          <div className="px-1">
            <SubscriptionTracker />

            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="font-semibold text-gray-700">Barang Harapan</h3>
              <button onClick={() => handleOpenGoalForm()} className="text-xs text-brimo-secondary font-medium hover:underline">Tambah</button>
            </div>

            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                title={goal.name}
                currentAmount={goal.currentAmount}
                targetAmount={goal.targetAmount}
                deadline={goal.deadline}
                color={goal.color}
                safetyBuffer={safetyBuffer} // Pass the buffer
                onEdit={() => handleOpenGoalForm(goal)}
              />
            ))}
            {goals.length === 0 && (
              <p className="text-xs text-gray-400 text-center mb-4 italic">Belum ada barang harapan. Tambahkan sekarang!</p>
            )}
          </div>

          {/* Recent Transcations Preview (Optional, or just header) */}
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="font-semibold text-gray-700">Transaksi Terakhir</h3>
            <button onClick={() => setActiveTab('mutasi')} className="text-xs text-brimo-secondary font-medium hover:underline">Lihat Semua</button>
          </div>
        </>
      )}

      {/* Mutasi Tab */}
      {activeTab === 'mutasi' && (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">Mutasi Rekening</h2>
          <TransactionList transactions={transactions} loading={storeLoading} />
        </div>
      )}

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

      {/* Manual Add Button (FAB) */}
      <button
        onClick={() => handleOpenForm()}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-brimo-accent hover:bg-orange-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-orange-200 z-40 transition-transform active:scale-95"
      >
        <Plus className="w-8 h-8" strokeWidth={2.5} />
      </button>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={formInitialData}
        onSubmit={handleAddTransaction}
        loading={storeLoading}
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
