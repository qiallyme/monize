import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * Shared MCP tool annotations.
 *
 * Annotations are optional hints (per the MCP spec) that help clients reason
 * about a tool before calling it. Every Monize tool operates over the
 * authenticated user's own closed financial dataset, so `openWorldHint` is
 * always `false` (no external/open-world interaction).
 *
 * Pick the constant that matches the tool's effect:
 * - `READ_ONLY`  -- queries/aggregations that never mutate state.
 * - `CREATE`     -- adds a new record (non-idempotent, non-destructive).
 * - `UPDATE`     -- sets fields to given values (idempotent, non-destructive).
 * - `DELETE`     -- removes a record (destructive; idempotent end-state).
 */

export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: false,
};

export const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export const UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

// Deletes a record. Destructive; idempotent because once the record is gone,
// repeating the call leaves the same end state (it just reports not-found).
export const DELETE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};
