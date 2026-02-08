/*
    25_Database_Cleanup.sql
    Čišćenje redundantnih podataka i orphaned records
*/

USE [WIWA_Questionnaires_DB];
GO

PRINT 'Starting Database Cleanup...';
GO

-- 1. Remove Test Type (ID=5) and all associated data
PRINT 'Step 1: Removing Test Type (ID=5)...';
DECLARE @TestTypeID INT = 5;

DELETE FROM [dbo].[FlowLayouts] WHERE [QuestionnaireTypeID] = @TestTypeID;
DELETE FROM [dbo].[QuestionnaireByQuestionnaireIdentificators] WHERE [QuestionnaireTypeID] = @TestTypeID;
DELETE FROM [dbo].[Questionnaires] WHERE [QuestionnaireTypeID] = @TestTypeID;
DELETE FROM [dbo].[QuestionnaireTypes] WHERE [QuestionnaireTypeID] = @TestTypeID;
PRINT 'Test Type removed.';
GO

-- 2. Clean up broken SubQuestion links
PRINT 'Step 2: Cleaning broken SubQuestion links...';
DELETE FROM [dbo].[PredefinedAnswerSubQuestions] 
WHERE [PredefinedAnswerID] NOT IN (SELECT [PredefinedAnswerID] FROM [dbo].[PredefinedAnswers]);
PRINT 'Broken links removed.';
GO

-- 3. Iteratively delete orphaned Questions
PRINT 'Step 3: Removing orphaned Questions...';
DECLARE @DeletedCount INT = 1;
DECLARE @TotalDeleted INT = 0;

WHILE @DeletedCount > 0
BEGIN
    DELETE FROM [dbo].[Questions]
    WHERE [QuestionID] NOT IN (
        -- Not a root question
        SELECT [QuestionID] FROM [dbo].[Questionnaires]
        UNION
        -- Not a sub-question from branching
        SELECT [SubQuestionID] FROM [dbo].[PredefinedAnswerSubQuestions]
        UNION
        -- Not a child question (ParentQuestionID hierarchy)
        SELECT [QuestionID] FROM [dbo].[Questions] WHERE [ParentQuestionID] IS NOT NULL
    );
    
    SET @DeletedCount = @@ROWCOUNT;
    SET @TotalDeleted = @TotalDeleted + @DeletedCount;
    PRINT 'Iteration: Deleted ' + CAST(@DeletedCount AS VARCHAR(10)) + ' orphaned questions.';
END

PRINT 'Total orphaned Questions removed: ' + CAST(@TotalDeleted AS VARCHAR(10));
GO

-- 4. Clean up orphaned PredefinedAnswers
PRINT 'Step 4: Removing orphaned PredefinedAnswers...';
DELETE FROM [dbo].[PredefinedAnswers] 
WHERE [QuestionID] NOT IN (SELECT [QuestionID] FROM [dbo].[Questions]);
PRINT 'Orphaned Answers removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 5. Clean up orphaned FlowLayouts
PRINT 'Step 5: Removing orphaned FlowLayouts...';
DELETE FROM [dbo].[FlowLayouts]
WHERE [QuestionnaireTypeID] NOT IN (SELECT [QuestionnaireTypeID] FROM [dbo].[QuestionnaireTypes]);
PRINT 'Orphaned Layouts removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 6. Summary Report
PRINT '========================================';
PRINT 'Cleanup Complete. Current Database State:';
PRINT '========================================';

SELECT 'QuestionnaireTypes' AS TableName, COUNT(*) AS [Count] FROM [dbo].[QuestionnaireTypes]
UNION ALL
SELECT 'Questionnaires', COUNT(*) FROM [dbo].[Questionnaires]
UNION ALL
SELECT 'Questions', COUNT(*) FROM [dbo].[Questions]
UNION ALL
SELECT 'PredefinedAnswers', COUNT(*) FROM [dbo].[PredefinedAnswers]
UNION ALL
SELECT 'PredefinedAnswerSubQuestions', COUNT(*) FROM [dbo].[PredefinedAnswerSubQuestions]
UNION ALL
SELECT 'FlowLayouts', COUNT(*) FROM [dbo].[FlowLayouts];

PRINT '========================================';
PRINT 'Remaining QuestionnaireTypes:';
SELECT [QuestionnaireTypeID], [Name], [Code] FROM [dbo].[QuestionnaireTypes] ORDER BY [QuestionnaireTypeID];
GO
