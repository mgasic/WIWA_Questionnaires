/*
===============================================================
  FIX: Question Formats Codes
  Opis: Standardizacija kodova za formate pitanja radi lakšeg mapiranja u Frontendu.
         Multiple Choice -> checkbox
         Boolean -> radio
  Autor: Antigravity Agent
  Datum: 2026-01-26
===============================================================
*/

USE [WIWA_DB_NEW];
GO

BEGIN TRANSACTION;

-- 1. Set Multiple Choice to 'checkbox'
-- Ovo osigurava da Backend mapper (code.ToLower()) vrati 'checkbox'
UPDATE QuestionFormats 
SET Code = 'checkbox'
WHERE Name = 'Multiple Choice';

-- 2. Set Boolean to 'radio' (ili 'boolean', ali 'radio' je direktniji za UI)
UPDATE QuestionFormats 
SET Code = 'radio'
WHERE Name = 'Boolean';

-- 3. Set Dropdown to 'select'
UPDATE QuestionFormats 
SET Code = 'select'
WHERE Name = 'Dropdown';

-- 4. Set Autocomplete to 'autocomplete'
UPDATE QuestionFormats 
SET Code = 'autocomplete'
WHERE Name = 'Autocomplete';

-- 5. Set Date to 'date'
UPDATE QuestionFormats 
SET Code = 'date'
WHERE Name = 'Date';

-- 6. Set Integer/String/Decimal to 'input'
UPDATE QuestionFormats 
SET Code = 'input'
WHERE Name IN ('Integer', 'String', 'Decimal');

COMMIT;

-- Provera
SELECT * FROM QuestionFormats;
