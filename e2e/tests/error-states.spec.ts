import { test, expect } from '../fixtures';

// Error-path coverage: when a backing API call fails, the page should surface a
// friendly message rather than crash or hang. We intercept the list endpoint
// and force a 500 with no body, so getErrorMessage falls back to the page's
// default copy. Interception is installed after the authedPage fixture has
// registered, so only the page-under-test's load is affected.
test.describe('Error handling', () => {
  test('shows a friendly error when categories fail to load', async ({
    authedPage: page,
  }) => {
    await page.route('**/api/v1/categories**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/categories');

    await expect(page.getByText('Failed to load categories')).toBeVisible();
  });

  test('shows a friendly error when securities fail to load', async ({
    authedPage: page,
  }) => {
    await page.route('**/api/v1/securities**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/securities');

    await expect(page.getByText('Failed to load securities')).toBeVisible();
  });
});
