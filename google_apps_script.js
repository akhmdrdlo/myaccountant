/**
 * Combined Google Apps Script for MyAccountant
 * Supports: Transactions, Goals, Budgets, Setup Data, and SUBSCRIPTIONS
 * RESTORED ORIGINAL VERSION + SAFE HEADER FIX
 */

// --- CONFIGURATION ---
const SHEET_NAMES = ['Transactions', 'transactions'];
const SETUP_SHEET_NAME = 'SETUP_DATA';
const GOAL_SHEET_NAME = 'Goals';
const BUDGET_SHEET_NAME = 'Budgets';
const SUBSCRIPTION_SHEET_NAME = 'Subscriptions';

// --- HELPERS ---
function getSheet(ss, name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
    }
    return sheet;
}

function getTransactionSheet(ss) {
    for (const name of SHEET_NAMES) {
        const sheet = ss.getSheetByName(name);
        if (sheet) return sheet;
    }
    return null;
}

// ORIGINAL WORKING SETUP DATA LOGIC
function getSetupData(ss) {
    const sheet = ss.getSheetByName(SETUP_SHEET_NAME);
    if (!sheet) return {};

    const accountRange = sheet.getRange("A2:B20").getValues();
    const accounts = accountRange
        .filter(r => r[0] !== "")
        .map(r => ({ name: r[0], initialBalance: r[1] || 0 }));

    const expenseRange = sheet.getRange("D2:D30").getValues();
    const expenseCategories = expenseRange.filter(r => r[0] !== "").map(r => r[0]);

    const incomeRange = sheet.getRange("F2:F30").getValues();
    const incomeCategories = incomeRange.filter(r => r[0] !== "").map(r => r[0]);

    return { accounts, expenseCategories, incomeCategories };
}

// --- GET REQUEST (Fetch All Data) ---
function doGet(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const result = { status: 'success', data: [], goals: [], budgets: [], subscriptions: [], metadata: {} };

        // 1. Fetch Transactions
        const tSheet = getTransactionSheet(ss);
        if (tSheet) {
            const data = tSheet.getDataRange().getValues();
            if (data.length > 1) {
                const headers = data[0];
                result.data = data.slice(1).map(row => {
                    const obj = {};
                    // FIX: Normalize headers to lowercase_snake_case
                    headers.forEach((h, i) => {
                        const key = h.toString().toLowerCase().replace(/\s+/g, '_');
                        obj[key] = row[i];
                    });
                    return obj;
                }).filter(item => item.amount);
            }
        }

        // 2. Fetch Goals
        const gSheet = getSheet(ss, GOAL_SHEET_NAME);
        if (gSheet) {
            const data = gSheet.getDataRange().getValues();
            if (data.length > 1) {
                const headers = data[0];
                result.goals = data.slice(1).map(row => {
                    const obj = {};
                    // FIX: Normalize headers
                    headers.forEach((h, i) => {
                        const key = h.toString().toLowerCase().replace(/\s+/g, '_');
                        obj[key] = row[i];
                    });
                    return obj;
                });
            }
        }

        // 3. Fetch Budgets
        const bSheet = getSheet(ss, BUDGET_SHEET_NAME);
        if (bSheet) {
            const data = bSheet.getDataRange().getValues();
            if (data.length > 1) {
                const headers = data[0];
                result.budgets = data.slice(1).map(row => {
                    const obj = {};
                    // FIX: Normalize headers
                    headers.forEach((h, i) => {
                        const key = h.toString().toLowerCase().replace(/\s+/g, '_');
                        obj[key] = row[i];
                    });
                    return obj;
                });
            }
        }

        // 4. Fetch Subscriptions
        const sSheet = getSheet(ss, SUBSCRIPTION_SHEET_NAME);
        if (sSheet) {
            const data = sSheet.getDataRange().getValues();
            if (data.length > 1) {
                const headers = data[0];
                result.subscriptions = data.slice(1).map(row => {
                    const obj = {};
                    // FIX: Normalize headers
                    headers.forEach((h, i) => {
                        const key = h.toString().toLowerCase().replace(/\s+/g, '_');
                        obj[key] = row[i];
                    });
                    return obj;
                });
            } else {
                // Initialize if empty
                sSheet.appendRow(['id', 'name', 'amount', 'billing_date', 'category']);
            }
        }

        // 5. Fetch Metadata (CRITICAL: Uses Original Logic)
        result.metadata = getSetupData(ss);

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

// --- POST REQUEST (Restored Original Logic) ---
function doPost(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let action = e.parameter.action;
        let payload = e.parameter;

        if (e.postData && e.postData.type === 'application/json') {
            const json = JSON.parse(e.postData.contents);
            action = json.action || action;
            payload = json;
        } else if (payload.data) {
            try {
                const dataObj = JSON.parse(payload.data);
                payload = { ...payload, ...dataObj };
            } catch (e) { }
        }
        if (!action) {
            if (payload.type && payload.amount) action = 'addTransaction';
            else throw new Error("Unknown Action");
        }

        // --- HANDLERS ---

        if (action === 'addTransaction') {
            const sheet = getTransactionSheet(ss);
            if (!sheet) throw new Error("Transactions sheet not found");

            const uuid = payload.id || Utilities.getUuid();
            const timestamp = payload.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
            const status = 'completed';

            sheet.appendRow([
                payload.account || 'Cash',
                payload.type,
                payload.category || 'Uncategorized',
                payload.amount,
                timestamp,
                payload.description || '',
                uuid,
                status
            ]);

            return ContentService.createTextOutput(JSON.stringify({ status: 'success', id: uuid }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        else if (action === 'addGoal') {
            const goal = payload.name ? payload : JSON.parse(e.parameter.data || '{}');

            let sheet = getSheet(ss, GOAL_SHEET_NAME);
            if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'name', 'target_amount', 'current_amount', 'deadline', 'color']);

            sheet.appendRow([
                goal.id || Utilities.getUuid(),
                goal.name,
                goal.targetAmount,
                goal.currentAmount,
                goal.deadline,
                goal.color
            ]);

            return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        else if (action === 'updateGoal') {
            const goal = payload.name ? payload : JSON.parse(e.parameter.data || '{}');
            const sheet = getSheet(ss, GOAL_SHEET_NAME);
            const data = sheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] == goal.id) {
                    sheet.getRange(i + 1, 2).setValue(goal.name);
                    sheet.getRange(i + 1, 3).setValue(goal.targetAmount);
                    sheet.getRange(i + 1, 4).setValue(goal.currentAmount);
                    sheet.getRange(i + 1, 5).setValue(goal.deadline);
                    sheet.getRange(i + 1, 6).setValue(goal.color);
                    break;
                }
            }
            return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        else if (action === 'deleteGoal') {
            const id = payload.id;
            const sheet = getSheet(ss, GOAL_SHEET_NAME);
            deleteRowById(sheet, id);
            return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
        }

        else if (action === 'saveBudgets') {
            const budgets = Array.isArray(payload) ? payload : JSON.parse(e.parameter.data || '[]');
            let sheet = getSheet(ss, BUDGET_SHEET_NAME);
            sheet.clearContents();
            sheet.appendRow(['category', 'limit']);
            if (Array.isArray(budgets)) {
                budgets.forEach(b => sheet.appendRow([b.category, b.limit]));
            }
            return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
        }

        else if (action === 'addSubscription') {
            const sub = payload.name ? payload : JSON.parse(e.parameter.data || '{}');
            let sheet = getSheet(ss, SUBSCRIPTION_SHEET_NAME);
            if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'name', 'amount', 'billing_date', 'category']);
            sheet.appendRow([
                sub.id || Utilities.getUuid(),
                sub.name,
                sub.amount,
                sub.billingDate,
                sub.category || 'General'
            ]);
            return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
        }
        else if (action === 'deleteSubscription') {
            const id = payload.id;
            const sheet = getSheet(ss, SUBSCRIPTION_SHEET_NAME);
            deleteRowById(sheet, id);
            return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
        }
        else {
            throw new Error(`Invalid Action: ${action}`);
        }
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

function deleteRowById(sheet, id) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
            sheet.deleteRow(i + 1);
            return;
        }
    }
}
