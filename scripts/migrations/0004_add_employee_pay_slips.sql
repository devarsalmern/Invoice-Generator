-- Separate storage for the detailed employee pay-slip format and its public QR verification token.
-- Run with: psql "$DATABASE_URL" -f 0004_add_employee_pay_slips.sql

BEGIN;

CREATE TABLE IF NOT EXISTS employee_pay_slips (
  id serial PRIMARY KEY,
  verification_token text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

COMMIT;
