import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { AccountCards } from './components/home/AccountCards';
import { QuickActions } from './components/home/QuickActions';
import { TransactionList } from './components/home/TransactionList';
import { TransactionForm } from './components/home/TransactionForm';
import { FinancialSummary } from './components/home/FinancialSummary';
import { AccountProfile } from './components/account/AccountProfile';
import { PinLock } from './components/auth/PinLock';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { useFinanceStore } from './store/useFinanceStore';
import type { TransactionInput } from './types';

function App() {
  const { fetchTransactions, addTransaction } = useGoogleSheets();
  const {
    transactions,
    setTransactions,
    setMetadata,
    addTransactionOptimistic,
    removeTransactionOptimistic,
    setLoading,
    loading: storeLoading
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState('home');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<TransactionInput> | undefined>(undefined);

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
        if (result.metadata) {
          setMetadata(result.metadata);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [fetchTransactions, setTransactions, setMetadata, setLoading]);

  const handleOpenForm = (initial?: Partial<TransactionInput>) => {
    setFormInitialData(initial);
    setIsFormOpen(true);
  };

  const handleAddTransaction = async (input: TransactionInput) => {
    // 1. Create temp ID and Optimistic Update
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
      fetchTransactions().then(startResult => {
        if (Array.isArray(startResult)) {
          setTransactions(startResult);
        } else {
          setTransactions(startResult.transactions);
          if (startResult.metadata) setMetadata(startResult.metadata);
        }
      });
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

  if (!isAuthenticated) {
    return <PinLock onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>

      {/* Home Tab */}
      {activeTab === 'home' && (
        <>
          <AccountCards />

          <QuickActions
            onActionClick={handleQuickAction}
          />

          <FinancialSummary />

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
    </Layout>
  );
}

export default App;
