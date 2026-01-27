/*
===============================================================
  FIX: Set Mandatory Fields (Smart Defaults)
  Opis: Postavlja IsRequired = 1 pametnije, poštujući logiku "Velikog Upitnika".
  Autor: Antigravity Agent
  Datum: 2026-01-27
===============================================================
*/

USE [WIWA_DB_NEW];
GO

BEGIN TRANSACTION;

-- 1. Standard "Yes/No" Radio Questions (Usually mandatory to answer Yes or No)
--    We identify them by their format (Radio) and typically top-level order or specific phrasing.
UPDATE Questions
SET IsRequired = 1
WHERE QuestionFormatID = 2 -- Radio
  AND IsRequired = 0;      -- Only if not already set

PRINT 'Set IsRequired = 1 for all Radio (Yes/No) questions';

-- 2. "Details" text inputs (Sub-questions that appear on condition)
--    In Veliki Upitnik, if you select a disease, the details input IS mandatory.
--    Pattern: QuestionText starts with 'Detalji' or 'Navedite' or 'Visina'/'Težina'
UPDATE Questions
SET IsRequired = 1
WHERE QuestionFormatID IN (1, 3) -- Text / TextArea
  AND (
       QuestionText LIKE N'Detalji%' OR 
       QuestionText LIKE N'Navedite%' OR 
       QuestionText LIKE N'Visina%' OR 
       QuestionText LIKE N'Težina%' OR
       QuestionText LIKE N'Naziv ustanove%'
      )
  AND IsRequired = 0;

PRINT 'Set IsRequired = 1 for Detalji/Navedite text inputs';

-- 3. Top-Level Checkbox Groups (e.g. Q1 "Da li bolujete...")
--    User feedback: "if he didn't have any disease he doesn't have to check anything".
--    So, Q1 (Format 4, Checkbox) should remain IsRequired = 0 (Optional).
--    We explicitly ensure this just in case.
UPDATE Questions
SET IsRequired = 0
WHERE QuestionFormatID = 4; -- Checkbox List

PRINT 'Ensured IsRequired = 0 for Checkbox Lists (implied "None" if empty)';

-- 4. ReadOnly / Labels -> Always Optional
UPDATE Questions
SET IsRequired = 0
WHERE [ReadOnly] = 1 OR QuestionFormatID = 99; -- 99 = SectionLabel

PRINT 'Ensured ReadOnly/Labels are optional';

COMMIT;
