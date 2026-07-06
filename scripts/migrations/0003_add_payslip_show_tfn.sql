-- Migration: add per-payslip TFN display flag
-- Run with: psql "$DATABASE_URL" -f 0003_add_payslip_show_tfn.sql

BEGIN;

ALTER TABLE IF EXISTS payslips
  ADD COLUMN IF NOT EXISTS show_tfn boolean NOT NULL DEFAULT false;

COMMIT;
