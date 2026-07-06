-- Migration: add TFN to employees and tax fields to payslips
-- Run with: psql "$DATABASE_URL" -f 0002_add_tfn_and_tax.sql

BEGIN;

ALTER TABLE IF EXISTS employees
  ADD COLUMN IF NOT EXISTS tfn text;

ALTER TABLE IF EXISTS payslips
  ADD COLUMN IF NOT EXISTS tax_name text;

ALTER TABLE IF EXISTS payslips
  ADD COLUMN IF NOT EXISTS tax_percentage numeric(5,2);

COMMIT;
