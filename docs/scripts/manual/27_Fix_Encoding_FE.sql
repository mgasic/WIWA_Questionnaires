/*
===============================================================
  FIX: Mojibake Encoding
  Opis: Popravka loše enkodovanih karaktera u bazi
  Autor: Antigravity Agent
  Datum: 2026-01-26
===============================================================
*/

USE [WIWA_DB_NEW];
GO

BEGIN TRANSACTION;

-- 1. Popravka Questionnaire Types
UPDATE QuestionnaireTypes
SET Name = N'Skraćeni upitnik'
WHERE Name LIKE N'Skra%eni upitnik';

UPDATE QuestionnaireTypes
SET Name = N'Veliki upitnik'
WHERE Name LIKE N'Veliki upitnik%'; 
-- (Preventive, though Veliki usually safe, but check for weird chars)

-- 2. Popravka Questions (Težina, Povišen...)
UPDATE Questions
SET QuestionText = REPLACE(QuestionText, N'TeÅ¾ina', N'Težina')
WHERE QuestionText LIKE N'%TeÅ¾ina%';

UPDATE Questions
SET QuestionText = REPLACE(QuestionText, N'PoviÅ¡en', N'Povišen')
WHERE QuestionText LIKE N'%PoviÅ¡en%';

-- General fix for 'SkraÄ‡eni' if present
UPDATE QuestionnaireTypes
SET Name = REPLACE(Name, N'SkraÄ‡eni', N'Skraćeni')
WHERE Name LIKE N'%SkraÄ‡eni%';

-- Još neki česti patterni ako su nastali
-- Ä‡ -> ć
-- Ä -> č
-- Å¾ -> ž
-- Å¡ -> š
-- Ä‘ -> đ

-- Oprezno ažuriranje
UPDATE Questions
SET QuestionText = REPLACE(QuestionText, N'Ä‡', N'ć')
WHERE QuestionText LIKE N'%Ä‡%';

UPDATE Questions
SET QuestionText = REPLACE(QuestionText, N'Ä', N'č')
WHERE QuestionText LIKE N'%Ä%';

UPDATE Questions
SET QuestionText = REPLACE(QuestionText, N'Å¾', N'ž')
WHERE QuestionText LIKE N'%Å¾%';

UPDATE Questions
SET QuestionText = REPLACE(QuestionText, N'Å¡', N'š')
WHERE QuestionText LIKE N'%Å¡%';

COMMIT;

-- Provera
SELECT * FROM QuestionnaireTypes;
SELECT TOP 20 QuestionID, QuestionText FROM Questions ORDER BY QuestionID;
