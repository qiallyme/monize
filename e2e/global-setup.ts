import { request, type FullConfig } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

// The first user ever registered becomes an admin (AuthService: role is "admin"
// when userCount === 0). The e2e stack starts with a fresh DB, so registering
// here -- before any test runs -- yields a known admin account. Its credentials
// are written to a gitignored file for the admin fixture to load. (Not under
// test-results/, which Playwright clears around run setup.)
export const ADMIN_CREDS_PATH = join(__dirname, '.admin-creds.json');

export interface AdminCreds {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ||
    process.env.BASE_URL ||
    'http://localhost:3001';

  const admin: AdminCreds = {
    email: `e2e-admin-${Date.now().toString(36)}@test.example.com`,
    password: 'E2eAdminPass123!',
    firstName: 'E2E',
    lastName: 'Admin',
  };

  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/v1/auth/register', { data: admin });
  if (!res.ok()) {
    throw new Error(
      `Admin registration failed (${res.status()}): ${await res.text()}`,
    );
  }
  await ctx.dispose();

  writeFileSync(ADMIN_CREDS_PATH, JSON.stringify(admin), 'utf8');
}

export default globalSetup;
