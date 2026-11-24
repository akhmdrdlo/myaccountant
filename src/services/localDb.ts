import type { Transaction, Goal, Budget, Subscription, Investment } from '../types';
import {
    INITIAL_METADATA,
    INITIAL_BUDGETS,
    INITIAL_GOALS,
    INITIAL_SUBSCRIPTIONS,
    INITIAL_INVESTMENTS,
    INITIAL_TRANSACTIONS
} from './initialSeed';

const KEYS = {
    get TRANSACTIONS() {
        const username = localStorage.getItem('rplanner_username') || 'default';
        const mode = localStorage.getItem('rplanner_mode');
        return mode === 'offline' ? `rplanner_${username}_transactions` : 'rplanner_transactions';
    },
    get METADATA() {
        const username = localStorage.getItem('rplanner_username') || 'default';
        const mode = localStorage.getItem('rplanner_mode');
        return mode === 'offline' ? `rplanner_${username}_metadata` : 'rplanner_metadata';
    },
    get BUDGETS() {
        const username = localStorage.getItem('rplanner_username') || 'default';
        const mode = localStorage.getItem('rplanner_mode');
        return mode === 'offline' ? `rplanner_${username}_budgets` : 'rplanner_budgets';
    },
    get GOALS() {
        const username = localStorage.getItem('rplanner_username') || 'default';
        const mode = localStorage.getItem('rplanner_mode');
        return mode === 'offline' ? `rplanner_${username}_goals` : 'rplanner_goals';
    },
    get SUBSCRIPTIONS() {
        const username = localStorage.getItem('rplanner_username') || 'default';
        const mode = localStorage.getItem('rplanner_mode');
        return mode === 'offline' ? `rplanner_${username}_subscriptions` : 'rplanner_subscriptions';
    },
    get INVESTMENTS() {
        const username = localStorage.getItem('rplanner_username') || 'default';
        const mode = localStorage.getItem('rplanner_mode');
        return mode === 'offline' ? `rplanner_${username}_investments` : 'rplanner_investments';
    }
};

export interface LocalData {
    transactions: Transaction[];
    metadata: {
        accounts: { name: string; initialBalance: number }[];
        expenseCategories: string[];
        incomeCategories: string[];
    };
    budgets: Budget[];
    goals: Goal[];
    subscriptions: Subscription[];
    investments: Investment[];
}

export const localDb = {
    // Warisan: dulu menyinkronkan ke server.js tanpa autentikasi (siapa pun bisa membaca data
    // pengguna lain lewat ?username=). Dihapus demi keamanan; sumber data tunggal sekarang Supabase.
    async syncWithBackend(): Promise<LocalData> {
        return this.loadAllData();
    },

    triggerBackendSync() {
        // no-op
    },

    // 2. Load all data, seed if empty (local fallback)
    loadAllData(): LocalData {
        let transactionsJson = localStorage.getItem(KEYS.TRANSACTIONS);
        let metadataJson = localStorage.getItem(KEYS.METADATA);
        let budgetsJson = localStorage.getItem(KEYS.BUDGETS);
        let goalsJson = localStorage.getItem(KEYS.GOALS);
        let subscriptionsJson = localStorage.getItem(KEYS.SUBSCRIPTIONS);
        let investmentsJson = localStorage.getItem(KEYS.INVESTMENTS);

        const isClean = !transactionsJson && !metadataJson && !budgetsJson && !goalsJson && !subscriptionsJson && !investmentsJson;

        if (isClean) {
            console.log('[localDb] Storage is clean. Seeding initial data from PDF reference.');
            this.saveTransactions(INITIAL_TRANSACTIONS);
            this.saveMetadata(INITIAL_METADATA);
            this.saveBudgets(INITIAL_BUDGETS);
            this.saveGoals(INITIAL_GOALS);
            this.saveSubscriptions(INITIAL_SUBSCRIPTIONS);
            this.saveInvestments(INITIAL_INVESTMENTS);

            return {
                transactions: INITIAL_TRANSACTIONS,
                metadata: INITIAL_METADATA,
                budgets: INITIAL_BUDGETS,
                goals: INITIAL_GOALS,
                subscriptions: INITIAL_SUBSCRIPTIONS,
                investments: INITIAL_INVESTMENTS
            };
        }

        return {
            transactions: transactionsJson ? JSON.parse(transactionsJson) : [],
            metadata: metadataJson ? JSON.parse(metadataJson) : INITIAL_METADATA,
            budgets: budgetsJson ? JSON.parse(budgetsJson) : INITIAL_BUDGETS,
            goals: goalsJson ? JSON.parse(goalsJson) : INITIAL_GOALS,
            subscriptions: subscriptionsJson ? JSON.parse(subscriptionsJson) : INITIAL_SUBSCRIPTIONS,
            investments: investmentsJson ? JSON.parse(investmentsJson) : INITIAL_INVESTMENTS
        };
    },

    // 3. Save individual keys locally
    saveTransactions(txs: Transaction[]) {
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
        this.triggerBackendSync();
    },

    saveMetadata(meta: any) {
        localStorage.setItem(KEYS.METADATA, JSON.stringify(meta));
        this.triggerBackendSync();
    },

    saveBudgets(budgets: Budget[]) {
        localStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
        this.triggerBackendSync();
    },

    saveGoals(goals: Goal[]) {
        localStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
        this.triggerBackendSync();
    },

    saveSubscriptions(subs: Subscription[]) {
        localStorage.setItem(KEYS.SUBSCRIPTIONS, JSON.stringify(subs));
        this.triggerBackendSync();
    },

    saveInvestments(invs: Investment[]) {
        localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(invs));
        this.triggerBackendSync();
    },

    // 3. Export JSON
    exportToJSON(): string {
        const data = this.loadAllData();
        return JSON.stringify(data, null, 2);
    },

    // 4. Export CSV
    exportToCSV(): string {
        const data = this.loadAllData();
        const headers = ['id', 'timestamp', 'account', 'type', 'category', 'amount', 'description', 'status'];
        const csvRows = [headers.join(',')];

        for (const tx of data.transactions) {
            const values = [
                tx.id,
                tx.timestamp,
                `"${tx.account.replace(/"/g, '""')}"`,
                tx.type,
                `"${tx.category.replace(/"/g, '""')}"`,
                tx.amount,
                `"${(tx.description || '').replace(/"/g, '""')}"`,
                tx.status
            ];
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    },

    // 5. Import JSON with de-duplication
    importFromJSON(jsonStr: string): { success: boolean; added: number; duplicates: number; error?: string } {
        try {
            const imported: Partial<LocalData> = JSON.parse(jsonStr);
            const current = this.loadAllData();

            let addedCount = 0;
            let duplicateCount = 0;

            // Merge metadata accounts
            const mergedAccounts = [...current.metadata.accounts];
            if (imported.metadata?.accounts) {
                for (const acc of imported.metadata.accounts) {
                    if (!mergedAccounts.some(a => a.name === acc.name)) {
                        mergedAccounts.push(acc);
                    }
                }
            }

            const mergedExpenseCategories = Array.from(new Set([...current.metadata.expenseCategories, ...(imported.metadata?.expenseCategories || [])]));
            const mergedIncomeCategories = Array.from(new Set([...current.metadata.incomeCategories, ...(imported.metadata?.incomeCategories || [])]));

            const newMetadata = {
                accounts: mergedAccounts,
                expenseCategories: mergedExpenseCategories,
                incomeCategories: mergedIncomeCategories
            };

            // Deduplicate Transactions
            const mergedTxs = [...current.transactions];
            if (imported.transactions) {
                for (const tx of imported.transactions) {
                    const isDuplicate = mergedTxs.some(t => 
                        t.id === tx.id || 
                        (t.timestamp === tx.timestamp && 
                         t.amount === tx.amount && 
                         t.account === tx.account && 
                         t.category === tx.category && 
                         t.type === tx.type)
                    );

                    if (isDuplicate) {
                        duplicateCount++;
                    } else {
                        mergedTxs.push(tx as Transaction);
                        addedCount++;
                    }
                }
            }

            // Merge budgets
            const mergedBudgets = [...current.budgets];
            if (imported.budgets) {
                for (const b of imported.budgets) {
                    if (!mergedBudgets.some(currB => currB.category === b.category)) {
                        mergedBudgets.push(b);
                    }
                }
            }

            // Merge goals
            const mergedGoals = [...current.goals];
            if (imported.goals) {
                for (const g of imported.goals) {
                    if (!mergedGoals.some(currG => currG.id === g.id)) {
                        mergedGoals.push(g);
                    }
                }
            }

            // Merge subscriptions
            const mergedSubs = [...current.subscriptions];
            if (imported.subscriptions) {
                for (const s of imported.subscriptions) {
                    if (!mergedSubs.some(currS => currS.id === s.id)) {
                        mergedSubs.push(s);
                    }
                }
            }

            // Merge investments
            const mergedInvs = [...current.investments];
            if (imported.investments) {
                for (const i of imported.investments) {
                    if (!mergedInvs.some(currI => currI.id === i.id)) {
                        mergedInvs.push(i);
                    }
                }
            }

            // Save
            this.saveMetadata(newMetadata);
            this.saveTransactions(mergedTxs);
            this.saveBudgets(mergedBudgets);
            this.saveGoals(mergedGoals);
            this.saveSubscriptions(mergedSubs);
            this.saveInvestments(mergedInvs);

            return { success: true, added: addedCount, duplicates: duplicateCount };
        } catch (err: any) {
            console.error('[localDb] Import JSON failed:', err);
            return { success: false, added: 0, duplicates: 0, error: err.message };
        }
    },

    // 6. Import CSV with auto-column mapping and reconciliation
    importFromCSV(csvStr: string): { success: boolean; added: number; duplicates: number; error?: string } {
        try {
            const current = this.loadAllData();
            const lines = csvStr.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

            if (lines.length === 0) {
                return { success: false, added: 0, duplicates: 0, error: 'File CSV kosong' };
            }

            // Parse helper for quotes (simple CSV parser)
            const parseCSVLine = (line: string): string[] => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current);
                return result.map(v => v.replace(/^"|"$/g, '').trim());
            };

            // Detect delimiter (comma, semicolon, or tab)
            const headerLine = lines[0];
            let delimiter = ',';
            if (headerLine.includes(';')) delimiter = ';';
            else if (headerLine.includes('\t')) delimiter = '\t';

            // Split header
            const headers = headerLine.split(delimiter).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

            // Column Mapping indices
            let idxId = -1;
            let idxDate = -1;
            let idxAccount = -1;
            let idxType = -1;
            let idxCategory = -1;
            let idxAmount = -1;
            let idxDesc = -1;
            let idxStatus = -1;

            for (let i = 0; i < headers.length; i++) {
                const h = headers[i];
                if (h === 'id') idxId = i;
                else if (h.includes('date') || h.includes('tanggal') || h.includes('timestamp') || h.includes('waktu')) idxDate = i;
                else if (h.includes('account') || h.includes('dompet') || h.includes('rekening') || h.includes('sumber') || h.includes('wallet')) idxAccount = i;
                else if (h.includes('type') || h.includes('tipe') || h.includes('jenis')) idxType = i;
                else if (h.includes('category') || h.includes('kategori')) idxCategory = i;
                else if (h.includes('amount') || h.includes('nominal') || h.includes('jumlah') || h.includes('nilai')) idxAmount = i;
                else if (h.includes('desc') || h.includes('memo') || h.includes('keterangan') || h.includes('detail')) idxDesc = i;
                else if (h.includes('status')) idxStatus = i;
            }

            // Fallback: If amount or date column is not matched, error out
            if (idxAmount === -1 || idxDate === -1) {
                return { success: false, added: 0, duplicates: 0, error: 'Gagal mendeteksi kolom Tanggal atau Nominal' };
            }

            let addedCount = 0;
            let duplicateCount = 0;

            const tempAccounts = [...current.metadata.accounts];
            const tempTxs = [...current.transactions];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const cols = delimiter === ',' ? parseCSVLine(line) : line.split(delimiter).map(v => v.replace(/^"|"$/g, '').trim());

                if (cols.length <= Math.max(idxAmount, idxDate)) continue;

                // Extract Amount
                let rawAmount = cols[idxAmount] || '0';
                // Clean Indonesian/English format
                // e.g. "Rp 1.000.000,00" -> "1000000"
                rawAmount = rawAmount.replace(/rp/gi, '').replace(/\s/g, '');
                if (rawAmount.includes(',') && rawAmount.includes('.')) {
                    // Check which is thousand separator
                    if (rawAmount.indexOf('.') < rawAmount.indexOf(',')) {
                        // Indonesian format "1.000.000,00"
                        rawAmount = rawAmount.replace(/\./g, '').replace(/,/g, '.');
                    } else {
                        // English format "1,000,000.00"
                        rawAmount = rawAmount.replace(/,/g, '');
                    }
                } else if (rawAmount.includes(',')) {
                    // Single separator: e.g. "1000000,00" or "1,000"
                    // If it has comma and 2 digits after, it is decimal, else thousand separator
                    const parts = rawAmount.split(',');
                    if (parts[parts.length - 1].length <= 2) {
                        rawAmount = rawAmount.replace(/,/g, '.'); // decimal
                    } else {
                        rawAmount = rawAmount.replace(/,/g, ''); // thousand separator
                    }
                } else if (rawAmount.includes('.')) {
                    // e.g. "1.000" or "1000000.00"
                    const parts = rawAmount.split('.');
                    if (parts[parts.length - 1].length > 2) {
                        rawAmount = rawAmount.replace(/\./g, ''); // thousand separator
                    }
                }
                const amount = Math.abs(parseFloat(rawAmount) || 0);

                // Extract Date & format to ISO
                const rawDate = cols[idxDate];
                let timestamp = new Date().toISOString();
                if (rawDate) {
                    const parsedD = new Date(rawDate);
                    if (!isNaN(parsedD.getTime())) {
                        timestamp = parsedD.toISOString();
                    } else {
                        // Handle formatting like DD/MM/YYYY or DD-MM-YYYY
                        const parts = rawDate.split(/[-/]/);
                        if (parts.length === 3) {
                            // Assume MM/DD/YYYY if first is 1-12 and second is 1-31
                            // Check if first part looks like a day (e.g. >12)
                            const p0 = parseInt(parts[0]);
                            const p1 = parseInt(parts[1]);
                            const p2 = parseInt(parts[2]);
                            if (p0 > 12) {
                                // DD/MM/YYYY -> Date(YYYY, MM-1, DD)
                                timestamp = new Date(p2, p1 - 1, p0).toISOString();
                            } else {
                                // Default MM/DD/YYYY
                                timestamp = new Date(p2, p0 - 1, p1).toISOString();
                            }
                        }
                    }
                }

                // Extract Account & dynamic registration
                let account = idxAccount !== -1 ? cols[idxAccount] : 'Cash';
                if (!account) account = 'Cash';
                if (!tempAccounts.some(a => a.name.toLowerCase() === account.toLowerCase())) {
                    // Register dynamic new account/dompet
                    tempAccounts.push({ name: account, initialBalance: 0 });
                } else {
                    // Match casing
                    const match = tempAccounts.find(a => a.name.toLowerCase() === account.toLowerCase());
                    if (match) account = match.name;
                }

                // Extract Type
                let type = idxType !== -1 ? cols[idxType].toLowerCase() : 'expense';
                if (type !== 'income' && type !== 'expense' && type !== 'transfer') {
                    type = 'expense';
                }

                // Extract Category
                let category = idxCategory !== -1 ? cols[idxCategory] : 'Lainnya';
                if (!category) category = 'Lainnya';

                // Extract Description
                const description = idxDesc !== -1 ? cols[idxDesc] : '';

                // Extract Status
                const status = idxStatus !== -1 ? cols[idxStatus] : 'completed';

                // Extract ID
                const id = idxId !== -1 && cols[idxId] ? cols[idxId] : crypto.randomUUID();

                // Duplication check
                const isDuplicate = tempTxs.some(t => 
                    t.id === id || 
                    (t.timestamp === timestamp && 
                     t.amount === amount && 
                     t.account === account && 
                     t.category === category && 
                     t.type === type)
                );

                if (isDuplicate) {
                    duplicateCount++;
                } else {
                    tempTxs.push({ id, timestamp, account, type, category, amount, description, status } as Transaction);
                    addedCount++;
                }
            }

            // Save
            current.metadata.accounts = tempAccounts;
            this.saveMetadata(current.metadata);
            this.saveTransactions(tempTxs);

            return { success: true, added: addedCount, duplicates: duplicateCount };
        } catch (err: any) {
            console.error('[localDb] Import CSV failed:', err);
            return { success: false, added: 0, duplicates: 0, error: err.message };
        }
    }
};
