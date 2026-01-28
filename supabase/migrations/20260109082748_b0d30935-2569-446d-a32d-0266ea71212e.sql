-- Add owner column to departments table
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS owner TEXT;