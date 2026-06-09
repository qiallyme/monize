import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/render';
import { AccountInfoWidget } from './AccountInfoWidget';
import { Account } from '@/types/account';

vi.mock('@/hooks/useNumberFormat', () => ({
  useNumberFormat: () => ({
    formatCurrency: (val: number, currency: string) => `${currency} ${val.toFixed(2)}`,
    formatNumber: (val: number) => String(val),
  }),
}));

const makeAccount = (overrides: Partial<Account> = {}): Account =>
  ({
    id: 'a-1',
    name: 'Everyday Chequing',
    accountType: 'CHEQUING',
    accountSubType: null,
    linkedAccountId: null,
    description: null,
    currencyCode: 'CAD',
    accountNumber: null,
    institution: null,
    institutionId: null,
    currentBalance: 1234.5,
    creditLimit: null,
    interestRate: null,
    isClosed: false,
    ...overrides,
  }) as Account;

describe('AccountInfoWidget', () => {
  it('shows the account name, balance and type', () => {
    render(<AccountInfoWidget account={makeAccount()} onEdit={vi.fn()} />);
    expect(screen.getByText('Everyday Chequing')).toBeInTheDocument();
    expect(screen.getByText('CAD 1234.50')).toBeInTheDocument();
    expect(screen.getByText('Chequing')).toBeInTheDocument();
  });

  it('calls onEdit when the pencil button is clicked', () => {
    const onEdit = vi.fn();
    render(<AccountInfoWidget account={makeAccount()} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Edit account settings'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders optional fields and a closed badge when present', () => {
    render(
      <AccountInfoWidget
        account={makeAccount({
          accountType: 'CREDIT_CARD',
          institution: 'TD',
          accountNumber: '****1234',
          creditLimit: 5000,
          interestRate: 19.99,
          isClosed: true,
        })}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('TD')).toBeInTheDocument();
    expect(screen.getByText('****1234')).toBeInTheDocument();
    expect(screen.getByText('CAD 5000.00')).toBeInTheDocument();
    expect(screen.getByText('19.99%')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('omits optional fields that are absent', () => {
    render(<AccountInfoWidget account={makeAccount()} onEdit={vi.fn()} />);
    expect(screen.queryByText('Institution')).not.toBeInTheDocument();
    expect(screen.queryByText('Account Number')).not.toBeInTheDocument();
    expect(screen.queryByText('Credit Limit')).not.toBeInTheDocument();
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
  });
});
