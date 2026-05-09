-- Allow a transaction split to embed an investment action (BUY/SELL/DIVIDEND/etc).
-- Lets a single split transaction represent paycheck-with-equity-grant style entries:
-- gross income (+), tax withholding (-), and BUY shares (-) all in one balanced post.

-- 1) Discriminator column for split kind.
ALTER TABLE transaction_splits
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20);

UPDATE transaction_splits SET kind = 'transfer'
  WHERE kind IS NULL AND transfer_account_id IS NOT NULL;
UPDATE transaction_splits SET kind = 'category'
  WHERE kind IS NULL;

ALTER TABLE transaction_splits
  ALTER COLUMN kind SET NOT NULL;

ALTER TABLE transaction_splits
  ALTER COLUMN kind SET DEFAULT 'category';

-- 2) Back-link from investment_transactions to the owning split (when embedded).
ALTER TABLE investment_transactions
  ADD COLUMN IF NOT EXISTS transaction_split_id UUID
    REFERENCES transaction_splits(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_investment_transactions_split_id
  ON investment_transactions(transaction_split_id);

-- 3) Mutual-exclusion check: exactly one of category / transfer / investment per split.
ALTER TABLE transaction_splits
  DROP CONSTRAINT IF EXISTS chk_split_kind_exclusive;

ALTER TABLE transaction_splits
  ADD CONSTRAINT chk_split_kind_exclusive CHECK (
    (kind = 'category'   AND category_id IS NOT NULL AND transfer_account_id IS NULL) OR
    (kind = 'transfer'   AND transfer_account_id IS NOT NULL AND category_id IS NULL) OR
    (kind = 'investment' AND category_id IS NULL AND transfer_account_id IS NULL)
  );
