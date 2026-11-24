import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { TrendingUp, Sliders, Wallet, Sparkles, Target, CalendarClock, CreditCard, HandCoins, Inbox, BellRing, X, CalendarRange, type LucideIcon } from 'lucide-react';

import { Layout } from './components/layout/Layout';
import { SubviewHeader } from './components/layout/SubviewHeader';
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
import { SpendingProgress } from './components/home/SpendingProgress';
import { AktivitasKalender } from './components/home/AktivitasKalender';
import { TransaksiTerbaru } from './components/home/TransaksiTerbaru';
import { AiAdvisorView } from './components/home/AiAdvisorView';
import { DompetView } from './components/home/DompetView';
import { KebutuhanView } from './components/home/KebutuhanView';
import { TipsView } from './components/home/TipsView';
import { DeadlinesView } from './components/home/DeadlinesView';
import { DraftInbox, type DraftConfirmation } from './components/notifications/DraftInbox';
import { NotificationCenter } from './components/notifications/NotificationCenter';

import { useSupabase } from './hooks/useSupabase';
import { useSubscriptionAutoRecord } from './hooks/useSubscriptionAutoRecord';
import { useAppNavigation } from './hooks/useAppNavigation';
import { usePlanning } from './hooks/usePlanning';
import { useDrafts, type TransactionDraft } from './hooks/useDrafts';
import { supabase } from './lib/supabase';
import { parseBankText, type ParsedBankText } from './lib/parseBankText';
import { getCurrentSubscription, getPushSupport } from './lib/push';
import { useFinanceStore } from './store/useFinanceStore';
import { useThemeStore } from './store/useThemeStore';
import { formatRupiah } from './lib/utils';
import { AI_ENABLED } from './lib/ai';
import { enqueue, flushQueue, queuedAsTransactions, readQueue } from './lib/offlineQueue';
import type { Transaction, TransactionInput, Goal, Budget } from './types';
import { TransactionEditSheet, findTransferPair } from './components/home/TransactionEditSheet';
import { DebtsView } from './components/planning/DebtsView';
import { InstallmentsView } from './components/planning/InstallmentsView';
import { ImportView } from './components/planning/ImportView';
import { PaydaySheet } from './components/planning/PaydaySheet';
import { YearReviewView } from './components/analytics/YearReviewView';
import { NetWorthCard } from './components/analytics/NetWorthCard';
import { AppLock } from './components/auth/AppLock';

type AddTxInput = TransactionInput & { source?: string; externalId?: string; timestamp?: string };

const FEATURES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'deadlines', label: 'Tagihan', icon: CalendarClock },
  { id: 'cicilan', label: 'Cicilan', icon: CreditCard },
  { id: 'utang', label: 'Utang', icon: HandCoins },
  { id: 'dompet', label: 'Dompet', icon: Wallet },
  { id: 'goals', label: 'Wishlist', icon: Target },
  { id: 'kebutuhan', label: 'Budget', icon: Sliders },
  { id: 'investasi', label: 'Investasi', icon: TrendingUp },
  { id: 'ai_advisor', label: 'Tanya AI', icon: Sparkles },
];

const NUDGE_KEY = 'rplanner_push_nudge_dismissed';
const SNAPSHOT_KEY = 'rplanner_snapshot';
// Dibaca sekali saat modul dimuat, sebelum useAppNavigation merapikan URL.
const INITIAL_SEARCH = window.location.search;
let initialLinkHandled = false;

function App() {
  const { fetchTransactions, addTransaction, updateTransaction, deleteTransactions, addGoal, updateGoal, deleteGoal, saveBudgets: saveBudgetsApi } = useSupabase();
  const {
    transactions, setTransactions, setMetadata, goals, setGoals, budgets, setBudgets,
    setSubscriptions, setInvestments, addTransactionOptimistic, removeTransactionOptimistic,
    setLoading, loading: storeLoading, getAccountBalance, getAccountBalances,
  } = useFinanceStore();
  const { fetchPlanning, learnMerchant } = usePlanning();

  useThemeStore();

  const { tab, view, setTab, openView, back, navigateToUrl } = useAppNavigation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<TransactionInput> | undefined>(undefined);
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);
  const [showPushNudge, setShowPushNudge] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [paydayOpen, setPaydayOpen] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('rplanner_token'));

  const { drafts, removeDraft } = useDrafts(isAuthenticated);

  // ── Auth ────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('rplanner_token', session.access_token);
        localStorage.setItem('rplanner_username', session.user?.user_metadata?.display_name || session.user?.email?.split('@')[0] || 'User');
        localStorage.setItem('rplanner_mode', 'online');
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('rplanner_token');
        localStorage.removeItem('rplanner_username');
        localStorage.removeItem('rplanner_mode');
        localStorage.removeItem(SNAPSHOT_KEY);
        setIsAuthenticated(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Data ────────────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    const [txResult, planning] = await Promise.all([fetchTransactions(), fetchPlanning()]);
    if (planning) {
      const st = useFinanceStore.getState();
      st.setDebts(planning.debts);
      st.setInstallments(planning.installments);
      st.setMerchantRules(planning.merchantRules);
      if (planning.payday && planning.payday !== st.payday) st.setPayday(planning.payday);
    }
    let result = txResult;
    if (result.failed) {
      // Offline / error: pakai salinan terakhir supaya layar tidak kosong
      const snapshot = localStorage.getItem(SNAPSHOT_KEY);
      if (!snapshot) return;
      try {
        result = JSON.parse(snapshot);
      } catch {
        return;
      }
    } else {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(result));
    }
    // Metadata (akun) dulu, baru transaksi, supaya saldo dihitung dengan saldo awal yang benar
    if (result.metadata) setMetadata(result.metadata);
    setTransactions([...queuedAsTransactions(), ...result.transactions]);
    if (result.goals) setGoals(result.goals);
    if (result.budgets) setBudgets(result.budgets);
    if (result.subscriptions) setSubscriptions(result.subscriptions);
    if (result.investments) setInvestments(result.investments);
  }, [fetchTransactions, fetchPlanning, setTransactions, setMetadata, setGoals, setBudgets, setSubscriptions, setInvestments]);

  // Kirim antrean offline saat app dibuka dan setiap kali kembali online
  useEffect(() => {
    if (!isAuthenticated) return;
    const flush = async () => {
      if (!navigator.onLine || readQueue().length === 0) return;
      const { sent, dropped } = await flushQueue(q => addTransaction(q));
      if (sent) toast.success(`${sent} transaksi tertunda berhasil terkirim.`);
      if (dropped.length) toast.error(`${dropped.length} transaksi gagal dikirim berulang kali dan dibuang. Catat ulang manual ya.`);
      if (sent || dropped.length) await refreshData();
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [isAuthenticated, addTransaction, refreshData]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    })();
  }, [isAuthenticated, refreshData, setLoading]);

  useSubscriptionAutoRecord(refreshData);

  // ── Ajakan aktifkan notifikasi (sekali, bisa ditutup) ───────
  useEffect(() => {
    if (!isAuthenticated || localStorage.getItem(NUDGE_KEY)) return;
    const support = getPushSupport();
    if (support !== 'supported' && support !== 'needs-install') return;
    getCurrentSubscription().then(sub => setShowPushNudge(!sub));
  }, [isAuthenticated]);

  const handleOpenForm = useCallback((initial?: Partial<TransactionInput>) => {
    setFormInitialData(initial);
    setIsFormOpen(true);
  }, []);

  // ── Deep link: share target, shortcut "Catat", klik notifikasi ──
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(initialLinkHandled ? '' : INITIAL_SEARCH);
    initialLinkHandled = true;
    const shared = [params.get('share_title'), params.get('share_text'), params.get('share_url')].filter(Boolean).join(' ');

    if (shared) {
      const parsed = parseBankText(shared);
      if (parsed) {
        handleOpenForm({
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.merchant ?? '',
        });
        toast.info(`Terbaca ${parsed.type === 'income' ? 'pemasukan' : 'pengeluaran'} ${formatRupiah(parsed.amount)}. Cek lalu simpan.`);
      } else {
        handleOpenForm({ description: shared.slice(0, 120) });
        toast.info('Nominal tidak terbaca, isi manual ya.');
      }
          } else if (params.get('action') === 'add') {
      handleOpenForm();
          }

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'rplanner:navigate') return;
      const url = new URL(e.data.url, window.location.origin);
      if (url.searchParams.get('action') === 'add') handleOpenForm();
      else navigateToUrl(e.data.url);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [isAuthenticated, handleOpenForm, navigateToUrl]);

  const accountList = getAccountBalances();
  const accountNames = accountList.map(a => a.name);

  // ── Simpan transaksi ────────────────────────────────────────
  const handleAddTransaction = async (input: AddTxInput) => {
    if (input.type === 'transfer') {
      if (!input.toAccount || input.toAccount === input.account) {
        toast.error(accountNames.length < 2 ? 'Tambahkan dompet kedua dulu di menu Dompet untuk transfer.' : 'Pilih dompet tujuan.');
        return false;
      }
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
        account: input.toAccount,
      };

      const now = new Date().toISOString();
      const sentOut = navigator.onLine && (await addTransaction(sourceTx));
      const sentIn = navigator.onLine && (await addTransaction(destTx));
      // Sisi yang gagal masuk antrean offline; tidak ada transfer yang hilang setengah
      if (!sentOut) enqueue({ ...sourceTx, timestamp: now });
      if (!sentIn) enqueue({ ...destTx, timestamp: now });
      if (!sentOut || !sentIn) toast.info('Belum tersambung. Transfer disimpan di HP dan dikirim otomatis saat online.');
      await refreshData();
      return true;
    }

    const tempId = crypto.randomUUID();
    addTransactionOptimistic({ ...input, id: tempId, timestamp: input.timestamp ?? new Date().toISOString(), status: 'pending' });

    const ok = navigator.onLine && (await addTransaction(input));
    if (ok) {
      await refreshData();
      return true;
    }

    removeTransactionOptimistic(tempId);
    if (input.externalId) {
      // Draft otomatis: biarkan tetap di inbox supaya bisa dicoba lagi
      toast.error('Gagal menyimpan. Draft tetap ada, coba lagi saat online.');
      return false;
    }
    enqueue(input);
    toast.info('Belum tersambung. Transaksi disimpan di HP dan dikirim otomatis saat online.');
    await refreshData();
    return true;
  };

  // ── Draft (catat otomatis) ──────────────────────────────────

  const handleConfirmDraft = async (draft: TransactionDraft, value: DraftConfirmation) => {
    const ok = await handleAddTransaction({
      type: draft.type,
      amount: draft.amount,
      category: value.category,
      account: value.account,
      description: draft.merchant ?? `Dari ${draft.accountHint ?? 'notifikasi'}`,
      timestamp: draft.occurredAt,
      source: draft.source,
      externalId: draft.externalId,
    });
    if (ok) {
      // Kamu sudah memeriksa kategori & dompetnya → ingat untuk merchant ini
      if (draft.merchant) learnMerchant(draft.merchant, value.category, value.account);
      await removeDraft(draft.id);
      toast.success('Tersimpan ke catatan.');
    }
    return ok;
  };

  const handleCreateDraft = async (parsed: ParsedBankText, raw: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('transaction_drafts').insert({
      user_id: user.id,
      source: 'share',
      external_id: `share:${raw.length}:${Date.now()}`,
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      account_hint: parsed.accountHint ?? null,
      merchant: parsed.merchant ?? null,
      confidence: parsed.confidence,
    });
    if (error) {
      toast.error('Gagal membuat draft. Sudah jalankan migrasi database?');
      return false;
    }
    return true;
  };

  // ── Edit / hapus transaksi ──────────────────────────────────
  const handleUpdateTransaction = async (updated: Transaction, pair?: Transaction) => {
    const ok = (await updateTransaction(updated)) && (!pair || (await updateTransaction(pair)));
    if (!ok) {
      toast.error('Perubahan gagal disimpan. Cek koneksi lalu coba lagi.');
      return false;
    }
    const original = transactions.find(t => t.id === updated.id);
    if (!pair && original && original.category !== updated.category && updated.description) {
      learnMerchant(updated.description, updated.category);
    }
    await refreshData();
    toast.success('Transaksi diperbarui.');
    return true;
  };

  const handleDeleteTransactions = async (ids: string[]) => {
    if (!(await deleteTransactions(ids))) {
      toast.error('Gagal menghapus transaksi.');
      return false;
    }
    await refreshData();
    toast.success('Transaksi dihapus.');
    return true;
  };

  // ── Goal & budget ───────────────────────────────────────────
  const handleOpenGoalForm = (goal?: Goal) => {
    setEditingGoal(goal);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goal: Goal) => {
    if (editingGoal) {
      setGoals(goals.map(g => g.id === goal.id ? goal : g));
      await updateGoal(goal);
    } else {
      setGoals([...goals, goal]);
      await addGoal(goal);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    await deleteGoal(id);
  };

  const handleSaveBudgets = async (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    await saveBudgetsApi(newBudgets);
  };

  const defaultCategories = ['Makan Weekday', 'Makan Weekend', 'Transport', 'Jajan/Hobi', 'Utilitas', 'Kos (Tabungan)'];
  const allCategories = Array.from(new Set([...defaultCategories, ...transactions.map(t => t.category)]));

  if (!isAuthenticated) {
    return (
      <>
        <Toaster richColors closeButton position="top-center" />
        <AuthScreen onSuccess={() => setIsAuthenticated(true)} />
      </>
    );
  }

  const safetyBuffer = budgets.find(b => b.category === 'Dana Darurat (Safety Buffer)')?.limit || 0;

  const openFeature = (id: string) => (id === 'analytics' ? setTab('analytics') : openView(id));

  const renderHomeView = () => {
    switch (view) {
      case 'investasi':
        return (
          <div>
            <SubviewHeader title="Investasi & aset" onBack={back} />
            <InvestmentView />
          </div>
        );
      case 'kebutuhan':
        return <KebutuhanView transactions={transactions} budgets={budgets} onOpenSettings={() => setIsBudgetSettingsOpen(true)} onBack={back} />;
      case 'dompet':
        return <DompetView onBack={back} onOpenTransactionForm={() => handleOpenForm()} onChanged={refreshData} />;
      case 'ai_advisor':
        return <AiAdvisorView onBack={back} />;
      case 'utang':
        return <DebtsView onBack={back} onChanged={refreshData} onRecordTransaction={handleAddTransaction} />;
      case 'cicilan':
        return <InstallmentsView onBack={back} onChanged={refreshData} onRecordTransaction={handleAddTransaction} />;
      case 'impor':
        return <ImportView onBack={back} onDone={async () => { await refreshData(); setTab('mutasi'); }} />;
      case 'rekap':
        return <YearReviewView onBack={back} />;
      case 'tips':
        return <TipsView onBack={back} />;
      case 'deadlines':
        return <DeadlinesView onBack={back} />;
      case 'inbox':
        return (
          <DraftInbox
            drafts={drafts}
            accounts={accountList}
            onConfirm={handleConfirmDraft}
            onDismiss={d => removeDraft(d.id)}
            onBack={back}
            onOpenSetup={() => openView('notifikasi')}
          />
        );
      case 'notifikasi':
        return <NotificationCenter onBack={back} onCreateDraft={handleCreateDraft} />;
      case 'goals':
        return (
          <div>
            <SubviewHeader
              title="Wishlist"
              subtitle="Barang yang sedang kamu tabung"
              onBack={back}
              action={
                <button onClick={() => handleOpenGoalForm()} className="h-11 px-4 rounded-xl bg-rp-action hover:bg-rp-action-press text-white text-sm font-semibold">
                  Tambah
                </button>
              }
            />
            <div className="space-y-4">
              {goals.map(goal => {
                return (
                  <GoalCard
                    key={goal.id}
                    title={goal.name}
                    currentAmount={goal.linkedAccount ? getAccountBalance(goal.linkedAccount) : goal.currentAmount}
                    targetAmount={goal.targetAmount}
                    deadline={goal.deadline}
                    color={goal.color}
                    safetyBuffer={safetyBuffer}
                    onEdit={() => handleOpenGoalForm(goal)}
                  />
                );
              })}
              {goals.length === 0 && (
                <div className="rp-card p-6 text-center">
                  <p className="font-semibold text-rp-ink">Belum ada wishlist</p>
                  <p className="mt-1 text-sm text-rp-ink-2">Tulis barang yang lagi kamu incar, Rplanner bantu hitung kapan uangnya cukup.</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const homeView = tab === 'home' ? renderHomeView() : null;

  return (
    <AppLock>
    <Layout
      activeTab={tab}
      onTabChange={setTab}
      onFabClick={() => handleOpenForm()}
      onOpenNotifications={() => openView(drafts.length ? 'inbox' : 'notifikasi')}
      pendingCount={drafts.length}
    >
      <Toaster richColors closeButton position="top-center" />

      {tab === 'home' && (homeView ?? (
        <>
          <AccountCards onOpenTransactionForm={handleOpenForm} onQuickPay={(category, type) => handleOpenForm({ category, type })} />

          {drafts.length > 0 && (
            <button
              onClick={() => openView('inbox')}
              className="w-full mb-6 rp-card p-4 flex items-center gap-3 text-left border-rp-action/40"
            >
              <span className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-rp-action flex items-center justify-center">
                <Inbox className="w-5 h-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-rp-ink">{drafts.length} transaksi terdeteksi</span>
                <span className="block text-xs text-rp-ink-2">Dari notifikasi bank. Ketuk untuk cek & simpan.</span>
              </span>
              <span className="text-rp-action font-semibold text-sm">Cek</span>
            </button>
          )}

          {showPushNudge && drafts.length === 0 && (
            <div className="mb-6 rp-card p-4 flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-rp-surface-2 text-rp-royal flex items-center justify-center">
                <BellRing className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-rp-ink">Biar nggak lupa bayar tagihan</p>
                <p className="text-xs text-rp-ink-2 mt-0.5">Nyalakan notifikasi dan catat otomatis dari notifikasi bank.</p>
                <button onClick={() => openView('notifikasi')} className="mt-2 h-9 px-3 rounded-lg bg-rp-surface-2 text-rp-royal text-xs font-semibold">
                  Atur sekarang
                </button>
              </div>
              <button
                aria-label="Tutup"
                onClick={() => { localStorage.setItem(NUDGE_KEY, '1'); setShowPushNudge(false); }}
                className="-mt-1 -mr-1 w-9 h-9 flex items-center justify-center rounded-lg text-rp-ink-2 hover:bg-rp-surface-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <section className="mb-6" aria-labelledby="fitur-title">
            <h2 id="fitur-title" className="rp-section-title mb-3">Fitur</h2>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {FEATURES.filter(f => f.id !== 'ai_advisor' || AI_ENABLED).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => openFeature(id)} className="flex flex-col items-center gap-1.5 rounded-xl py-1 active:scale-95 transition">
                  <span className="w-12 h-12 rounded-2xl bg-rp-surface border border-rp-line text-rp-royal flex items-center justify-center">
                    <Icon className="w-[22px] h-[22px]" strokeWidth={1.9} />
                  </span>
                  <span className="text-xs font-medium text-rp-ink text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="mb-6">
            <FinancialSummary onSetPayday={() => setPaydayOpen(true)} />
            <SpendingProgress />
            <AktivitasKalender transactions={transactions} />
            <TransaksiTerbaru transactions={transactions} />
          </div>
        </>
      ))}

      {tab === 'mutasi' && (
        <div>
          <h1 className="text-xl font-bold text-rp-ink mb-4">Mutasi</h1>
          <TransactionList transactions={transactions} loading={storeLoading} onSelect={setEditingTx} />
        </div>
      )}

      {tab === 'analytics' && (
        <>
        <NetWorthCard />
        <button onClick={() => openView('rekap')} className="w-full mb-6 rp-card p-4 flex items-center gap-3 text-left hover:bg-rp-surface-2">
          <span className="w-10 h-10 rounded-xl bg-rp-surface-2 text-rp-royal flex items-center justify-center"><CalendarRange className="w-5 h-5" /></span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-rp-ink">Rekap {new Date().getFullYear()}</span>
            <span className="block text-xs text-rp-ink-2">Setahun uangmu: disisihkan, paling boros, langganan setia</span>
          </span>
        </button>
        <AnalyticsView transactions={transactions}>
          <div className="mt-6">
            <BudgetList transactions={transactions} budgets={budgets} onOpenSettings={() => setIsBudgetSettingsOpen(true)} />
          </div>
        </AnalyticsView>
        </>
      )}

      {tab === 'akun' && <AccountProfile onOpenView={openView} onSetPayday={() => setPaydayOpen(true)} />}

      {paydayOpen && <PaydaySheet onClose={() => setPaydayOpen(false)} />}

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={formInitialData}
        onSubmit={handleAddTransaction}
        loading={storeLoading}
        accounts={getAccountBalances()}
      />

      <TransactionEditSheet
        transaction={editingTx}
        pair={editingTx ? findTransferPair(editingTx, transactions) : undefined}
        accounts={accountNames}
        onClose={() => setEditingTx(null)}
        onSave={handleUpdateTransaction}
        onDelete={handleDeleteTransactions}
      />

      <GoalForm
        isOpen={isGoalFormOpen}
        onClose={() => setIsGoalFormOpen(false)}
        initialData={editingGoal}
        onSubmit={handleSaveGoal}
        onDelete={handleDeleteGoal}
        accounts={accountNames}
      />

      <BudgetSettings
        isOpen={isBudgetSettingsOpen}
        onClose={() => setIsBudgetSettingsOpen(false)}
        budgets={budgets}
        categories={allCategories}
        onSave={handleSaveBudgets}
      />
    </Layout>
    </AppLock>
  );
}

export default App;
