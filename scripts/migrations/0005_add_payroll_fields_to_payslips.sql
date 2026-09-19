-- Persist the detailed payroll statement fields on the standard payslip record.
-- Run with: psql "$DATABASE_URL" -f 0005_add_payroll_fields_to_payslips.sql

BEGIN;

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_abn text,
  ADD COLUMN IF NOT EXISTS employee_name text,
  ADD COLUMN IF NOT EXISTS employee_number text,
  ADD COLUMN IF NOT EXISTS employee_address text,
  ADD COLUMN IF NOT EXISTS period_start text,
  ADD COLUMN IF NOT EXISTS period_end text,
  ADD COLUMN IF NOT EXISTS date_paid text,
  ADD COLUMN IF NOT EXISTS pay_rate numeric(12, 2),
  ADD COLUMN IF NOT EXISTS hours numeric(10, 2),
  ADD COLUMN IF NOT EXISTS earnings_name text,
  ADD COLUMN IF NOT EXISTS earnings_note text,
  ADD COLUMN IF NOT EXISTS ytd_earnings numeric(12, 2),
  ADD COLUMN IF NOT EXISTS payg numeric(12, 2),
  ADD COLUMN IF NOT EXISTS ytd_payg numeric(12, 2),
  ADD COLUMN IF NOT EXISTS super_fund text,
  ADD COLUMN IF NOT EXISTS super_name text,
  ADD COLUMN IF NOT EXISTS super_type text,
  ADD COLUMN IF NOT EXISTS super_member_number text,
  ADD COLUMN IF NOT EXISTS super_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS ytd_super numeric(12, 2),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS bank_account text;

COMMIT;
