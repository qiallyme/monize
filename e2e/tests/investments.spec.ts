import { test, expect } from '../fixtures';
import {
  createInvestmentAccountPair,
  createSecurity,
  createInvestmentTransaction,
} from '../helpers/factories';
import { uniqueId } from '../helpers/api';

// Investments portfolio view. Preconditions (account pair, security, trades)
// are seeded through the API -- the investment-transaction form is a heavy
// combobox-driven modal, so the UI work here is reserved for asserting that a
// seeded BUY rolls up into the holdings view. The driven-in-UI trade entry is
// deferred (see ROADMAP Phase 2.1).
test.describe('Investments', () => {
  test('shows the investments page chrome', async ({ authedPage: page }) => {
    await page.goto('/investments');

    await expect(
      page.getByRole('heading', { name: 'Investments' }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /\+ New Transaction/i }),
    ).toBeVisible();
  });

  test('rolls a seeded BUY up into the holdings view', async ({
    authedPage: page,
    api,
  }) => {
    const pairName = `Brokerage ${uniqueId()}`;
    const pair = await createInvestmentAccountPair(api, { name: pairName });
    const security = await createSecurity(api, {
      symbol: `Z${uniqueId().slice(-5).toUpperCase()}`,
      name: `Held ${uniqueId()}`,
    });
    await createInvestmentTransaction(api, {
      accountId: pair.brokerageAccount.id,
      fundingAccountId: pair.cashAccount.id,
      securityId: security.id,
      action: 'BUY',
      quantity: 10,
      price: 100,
    });

    await page.goto('/investments');

    // The holdings section and the brokerage account header render with the
    // seeded position even while its rows are collapsed.
    await expect(
      page.getByRole('heading', { name: 'Holdings by Account' }),
    ).toBeVisible({ timeout: 15000 });
    const accountHeader = page.locator('button', {
      hasText: `${pairName} - Brokerage`,
    });
    await expect(accountHeader).toBeVisible();

    // Expand the account (rows start collapsed) and confirm the held symbol.
    await accountHeader.click();
    await expect(page.getByText(security.symbol, { exact: true })).toBeVisible();
  });

  test('keeps holdings after a reload (persistence)', async ({
    authedPage: page,
    api,
  }) => {
    const pairName = `Brokerage ${uniqueId()}`;
    const pair = await createInvestmentAccountPair(api, { name: pairName });
    const security = await createSecurity(api, { name: `Held ${uniqueId()}` });
    await createInvestmentTransaction(api, {
      accountId: pair.brokerageAccount.id,
      fundingAccountId: pair.cashAccount.id,
      securityId: security.id,
      action: 'BUY',
      quantity: 5,
      price: 50,
    });

    await page.goto('/investments');
    await expect(
      page.locator('button', { hasText: `${pairName} - Brokerage` }),
    ).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(
      page.locator('button', { hasText: `${pairName} - Brokerage` }),
    ).toBeVisible({ timeout: 15000 });
  });
});
