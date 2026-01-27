/*
===============================================================
  FIX: Question 1900 Format
  Opis: Promena formata pitanja 1900 (Nervne bolesti sub-pitanje)
         sa Autocomplete (4) na Checkbox input (5).
  Autor: Antigravity Agent
  Datum: 2026-01-26
===============================================================
*/

USE [WIWA_DB_NEW];
GO

BEGIN TRANSACTION;

-- Provera pre izmene
SELECT QuestionID, QuestionFormatID FROM Questions WHERE QuestionID = 1900;

-- Ažuriranje
UPDATE Questions 
SET QuestionFormatID = 5 -- Checkbox input
WHERE QuestionID = 1900;

-- Provera nakon izmene
SELECT QuestionID, QuestionFormatID FROM Questions WHERE QuestionID = 1900;

COMMIT;
