
USE [WIWA_DB_NEW];
GO
SET NOCOUNT ON;

BEGIN TRANSACTION;

-- 1. Enable Validation for BMI Inputs (Height, Weight) and Calculation (Q8)
UPDATE Questions
SET IsRequired = 1
WHERE QuestionID IN (9000, 9100, 9200);

PRINT 'Enabled validation for BMI (9000), Height (9100), Weight (9200)';

-- 2. Enable Validation for Detail Questions
-- Usually hidden until triggered. If shown, they MUST be filled.
UPDATE Questions
SET IsRequired = 1
WHERE QuestionText LIKE N'Detalji (%'
   OR QuestionText LIKE N'Koje bolesti % (oznacite):'
   OR QuestionText LIKE N'Koje bolesti % (označite):';

PRINT 'Enabled validation for all "Detalji" and "Koje bolesti" sub-questions';

-- 3. Enable Validation for Diopter Height
UPDATE Questions SET IsRequired = 1 WHERE QuestionID = 2010;
PRINT 'Enabled validation for Visina dioptrije (2010)';

-- 4. Enable Validation for Q6000 and Q10000 top-levels if not already set (just to be safe)
UPDATE Questions SET IsRequired = 1 WHERE QuestionID IN (6000, 8000, 10000);
PRINT 'Ensured Q5 (6000), Q7 (8000), Q9 (10000) are required';

COMMIT;
