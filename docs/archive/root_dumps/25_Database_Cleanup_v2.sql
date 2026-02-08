/*
    25_Database_Cleanup_v2.sql
    Čišćenje redundantnih podataka - sa CASCADE logikom
*/

USE [WIWA_Questionnaires_DB];
GO

PRINT 'Starting Database Cleanup v2...';
GO

-- 1. Remove Test Type (ID=5) and cascade delete
PRINT 'Step 1: Removing Test Type (ID=5) with cascade...';
DECLARE @TestTypeID SMALLINT = 5;

-- First remove all dependent data
DELETE FROM [dbo].[QuestionnaireAnswers] 
WHERE [QuestionnaireByQuestionnaireIdentificatorID] IN (
    SELECT [QuestionnaireByQuestionnaireIdentificatorID] 
    FROM [dbo].[QuestionnaireByQuestionnaireIdentificators] 
    WHERE [QuestionnaireTypeID] = @TestTypeID
);

DELETE FROM [dbo].[QuestionnaireByQuestionnaireIdentificators] WHERE [QuestionnaireTypeID] = @TestTypeID;
DELETE FROM [dbo].[FlowLayouts] WHERE [QuestionnaireTypeID] = @TestTypeID;

-- Get all questions for this type
DECLARE @QuestionsToDelete TABLE (QuestionID INT);
INSERT INTO @QuestionsToDelete
SELECT DISTINCT q.QuestionID
FROM [dbo].[Questionnaires] qn
JOIN [dbo].[Questions] q ON qn.QuestionID = q.QuestionID
WHERE qn.QuestionnaireTypeID = @TestTypeID;

-- Delete root mappings
DELETE FROM [dbo].[Questionnaires] WHERE [QuestionnaireTypeID] = @TestTypeID;

-- Delete the type
DELETE FROM [dbo].[QuestionnaireTypes] WHERE [QuestionnaireTypeID] = @TestTypeID;

PRINT 'Test Type removed.';
GO

-- 2. Build complete tree of valid questions (from all remaining types)
PRINT 'Step 2: Building valid question tree...';

IF OBJECT_ID('tempdb..#ValidQuestions') IS NOT NULL DROP TABLE #ValidQuestions;
CREATE TABLE #ValidQuestions (QuestionID INT PRIMARY KEY);

-- Start with root questions
INSERT INTO #ValidQuestions (QuestionID)
SELECT DISTINCT QuestionID FROM [dbo].[Questionnaires];

-- Expand tree iteratively
DECLARE @Added INT = 1;
WHILE @Added > 0
BEGIN
    -- Add children via ParentQuestionID
    INSERT INTO #ValidQuestions (QuestionID)
    SELECT DISTINCT q.QuestionID
    FROM [dbo].[Questions] q
    JOIN #ValidQuestions v ON q.ParentQuestionID = v.QuestionID
    WHERE q.QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);
    
    SET @Added = @@ROWCOUNT;
    
    -- Add children via SubQuestions
    INSERT INTO #ValidQuestions (QuestionID)
    SELECT DISTINCT pasq.SubQuestionID
    FROM [dbo].[PredefinedAnswers] pa
    JOIN [dbo].[PredefinedAnswerSubQuestions] pasq ON pa.PredefinedAnswerID = pasq.PredefinedAnswerID
    JOIN #ValidQuestions v ON pa.QuestionID = v.QuestionID
    WHERE pasq.SubQuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);
    
    SET @Added = @Added + @@ROWCOUNT;
END

PRINT 'Valid question tree built: ' + CAST((SELECT COUNT(*) FROM #ValidQuestions) AS VARCHAR(10)) + ' questions.';
GO

-- 3. Delete orphaned PredefinedAnswers (answers for invalid questions)
PRINT 'Step 3: Removing orphaned PredefinedAnswers...';

-- First remove SubQuestion links
DELETE FROM [dbo].[PredefinedAnswerSubQuestions]
WHERE [PredefinedAnswerID] IN (
    SELECT pa.PredefinedAnswerID 
    FROM [dbo].[PredefinedAnswers] pa
    WHERE pa.QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions)
);

-- Then remove the answers themselves
DELETE FROM [dbo].[PredefinedAnswers]
WHERE QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);

PRINT 'Orphaned Answers removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 4. Delete orphaned Questions
PRINT 'Step 4: Removing orphaned Questions...';

DELETE FROM [dbo].[Questions]
WHERE QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);

PRINT 'Orphaned Questions removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 5. Clean up orphaned FlowLayouts
PRINT 'Step 5: Removing orphaned FlowLayouts...';
DELETE FROM [dbo].[FlowLayouts]
WHERE [QuestionnaireTypeID] NOT IN (SELECT [QuestionnaireTypeID] FROM [dbo].[QuestionnaireTypes]);
PRINT 'Orphaned Layouts removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 6. Clean up orphaned QuestionReferenceColumns
PRINT 'Step 6: Removing orphaned QuestionReferenceColumns...';
DELETE FROM [dbo].[QuestionReferenceColumns]
WHERE [QuestionID] NOT IN (SELECT [QuestionID] FROM [dbo].[Questions]);
PRINT 'Orphaned Reference Columns removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 7. Clean up orphaned QuestionComputedConfigs
PRINT 'Step 7: Removing orphaned QuestionComputedConfigs...';
DELETE FROM [dbo].[QuestionComputedConfigs]
WHERE [QuestionID] NOT IN (SELECT [QuestionID] FROM [dbo].[Questions]);
PRINT 'Orphaned Computed Configs removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 8. Summary Report
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

PRINT '';
PRINT 'Remaining QuestionnaireTypes:';
SELECT [QuestionnaireTypeID], [Name], [Code] FROM [dbo].[QuestionnaireTypes] ORDER BY [QuestionnaireTypeID];
GO

-- Cleanup temp table
IF OBJECT_ID('tempdb..#ValidQuestions') IS NOT NULL DROP TABLE #ValidQuestions;
GO
