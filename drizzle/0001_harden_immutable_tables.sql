CREATE OR REPLACE FUNCTION prevent_update_or_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable table cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_immutable_update
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER ledger_transactions_immutable_update
BEFORE UPDATE OR DELETE ON ledger_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER audit_logs_immutable_update
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
