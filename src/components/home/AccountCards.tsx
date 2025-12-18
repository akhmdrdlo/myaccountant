import { useFinanceStore } from '../../store/useFinanceStore';
import { BalanceCard } from './BalanceCard';

export const AccountCards = () => {
    const { balance, loading, getAccountBalances } = useFinanceStore();
    const accounts = getAccountBalances();

    return (
        <div className="w-full overflow-x-auto pb-4 pt-2 px-1 snap-x snap-mandatory scrollbar-hide">
            <div className="flex gap-4 w-max px-1">
                {/* Main/Total Balance Card */}
                <div className="w-[85vw] max-w-sm snap-center">
                    <BalanceCard
                        name="Total Saldo"
                        balance={balance}
                        loading={loading}
                        color="from-brimo-primary to-brimo-secondary"
                    />
                </div>

                {/* Individual Account Cards */}
                {accounts.map((acc: { name: string; balance: number; color: string }) => (
                    <div key={acc.name} className="w-[85vw] max-w-sm snap-center">
                        <BalanceCard
                            name={acc.name}
                            balance={acc.balance}
                            loading={loading}
                            color={acc.color}
                        />
                    </div>
                ))}
            </div>

            {/* Pagination Indicators (Optional/Simple) */}
            <div className="flex justify-center gap-1.5 mt-[-15px] mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-brimo-primary opacity-50"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brimo-primary opacity-20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brimo-primary opacity-20"></div>
            </div>
        </div>
    );
};
