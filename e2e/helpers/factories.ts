import { ApiClient, uniqueId } from './api';

// Typed factories that seed data through the real backend API. Payload shapes
// mirror the frontend lib modules (e.g. frontend/src/lib/tags.ts). Each returns
// the created record (with id) so specs can reference it. New entities are
// added here as their specs are written.

export interface CreatedTag {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export function createTag(
  api: ApiClient,
  data: { name?: string; color?: string; icon?: string } = {},
): Promise<CreatedTag> {
  return api.post<CreatedTag>('/tags', {
    name: data.name ?? `E2E Tag ${uniqueId()}`,
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.icon !== undefined ? { icon: data.icon } : {}),
  });
}

export interface CreatedCategory {
  id: string;
  name: string;
  isIncome: boolean;
  parentId: string | null;
}

export function createCategory(
  api: ApiClient,
  data: {
    name?: string;
    isIncome?: boolean;
    parentId?: string;
    description?: string;
  } = {},
): Promise<CreatedCategory> {
  return api.post<CreatedCategory>('/categories', {
    name: data.name ?? `E2E Category ${uniqueId()}`,
    isIncome: data.isIncome ?? false,
    ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
  });
}

export interface CreatedPayee {
  id: string;
  name: string;
  defaultCategoryId: string | null;
  notes: string | null;
}

export function createPayee(
  api: ApiClient,
  data: { name?: string; defaultCategoryId?: string; notes?: string } = {},
): Promise<CreatedPayee> {
  return api.post<CreatedPayee>('/payees', {
    name: data.name ?? `E2E Payee ${uniqueId()}`,
    ...(data.defaultCategoryId !== undefined
      ? { defaultCategoryId: data.defaultCategoryId }
      : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
  });
}
