/*
    27_Add_Unique_Constraint.sql
    Dodavanje UNIQUE ograničenja za sprečavanje duplikata u mapiranju tipova upitnika i identifikatora
*/

USE [WIWA_Questionnaires_DB];
GO

PRINT 'Adding UNIQUE constraint to QuestionnaireByQuestionnaireIdentificators...';
GO

-- 1. Check for duplicates before adding constraint
PRINT 'Checking for existing duplicates...';
SELECT [QuestionnaireTypeID], [QuestionnaireIdentificatorID], COUNT(*) as Count
FROM [dbo].[QuestionnaireByQuestionnaireIdentificators]
GROUP BY [QuestionnaireTypeID], [QuestionnaireIdentificatorID]
HAVING COUNT(*) > 1;

IF @@ROWCOUNT > 0
BEGIN
    PRINT 'WARNING: Duplicates found! Constraint cannot be added until they are removed.';
    -- Optional: Logic to remove duplicates if found (keeping the latest one)
    -- WITH Duplicates AS (
    --     SELECT *, ROW_NUMBER() OVER (PARTITION BY QuestionnaireTypeID, QuestionnaireIdentificatorID ORDER BY QuestionnaireByQuestionnaireIdentificatorID DESC) as rn
    --     FROM QuestionnaireByQuestionnaireIdentificators
    -- )
    -- DELETE FROM Duplicates WHERE rn > 1;
END
ELSE
BEGIN
    PRINT 'No duplicates found. Proceeding with constraint creation.';
    
    -- 2. Add Unique Constraint
    -- We use a named constraint so it's easier to manage later
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UK_QuestionnaireByQuestionnaireIdentificators_Type_Identificator')
    BEGIN
        ALTER TABLE [dbo].[QuestionnaireByQuestionnaireIdentificators]
        ADD CONSTRAINT [UK_QuestionnaireByQuestionnaireIdentificators_Type_Identificator] 
        UNIQUE ([QuestionnaireTypeID], [QuestionnaireIdentificatorID]);
        
        PRINT 'Constraint UK_QuestionnaireByQuestionnaireIdentificators_Type_Identificator added successfully.';
    END
    ELSE
    BEGIN
        PRINT 'Constraint already exists.';
    END
END
GO
