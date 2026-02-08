/*
    26_Remove_Orphaned_Data.sql
    Finalno čišćenje orphaned pitanja i odgovora
*/

USE [WIWA_Questionnaires_DB];
GO

PRINT 'Removing orphaned data...';
GO

-- Step 1: Build valid question tree
PRINT 'Building valid question tree...';

WITH ValidTree AS (
    SELECT QuestionID FROM Questionnaires
    UNION ALL
    SELECT Q.QuestionID 
    FROM ValidTree T 
    JOIN Questions Q ON Q.ParentQuestionID = T.QuestionID
    UNION ALL
    SELECT PASQ.SubQuestionID 
    FROM ValidTree T 
    JOIN PredefinedAnswers PA ON T.QuestionID = PA.QuestionID 
    JOIN PredefinedAnswerSubQuestions PASQ ON PA.PredefinedAnswerID = PASQ.PredefinedAnswerID
)
SELECT QuestionID INTO #ValidQuestions FROM ValidTree;

PRINT 'Valid questions: ' + CAST((SELECT COUNT(*) FROM #ValidQuestions) AS VARCHAR(10));
GO

-- Step 2: Delete SubQuestion links for orphaned answers
PRINT 'Removing orphaned SubQuestion links...';
DELETE FROM PredefinedAnswerSubQuestions
WHERE PredefinedAnswerID IN (
    SELECT pa.PredefinedAnswerID 
    FROM PredefinedAnswers pa
    WHERE pa.QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions)
);
PRINT 'Removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- Step 3: Delete orphaned answers
PRINT 'Removing orphaned PredefinedAnswers...';
DELETE FROM PredefinedAnswers
WHERE QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);
PRINT 'Removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- Step 4: Delete orphaned QuestionReferenceColumns
PRINT 'Removing orphaned QuestionReferenceColumns...';
DELETE FROM QuestionReferenceColumns
WHERE QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);
PRINT 'Removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- Step 5: Delete orphaned QuestionComputedConfigs
PRINT 'Removing orphaned QuestionComputedConfigs...';
DELETE FROM QuestionComputedConfigs
WHERE QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);
PRINT 'Removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- Step 6: Delete orphaned Questions
PRINT 'Removing orphaned Questions...';
DELETE FROM Questions
WHERE QuestionID NOT IN (SELECT QuestionID FROM #ValidQuestions);
PRINT 'Removed: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- Step 7: Summary
PRINT '========================================';
PRINT 'Final Database State:';
PRINT '========================================';

SELECT 'QuestionnaireTypes' AS TableName, COUNT(*) AS [Count] FROM QuestionnaireTypes
UNION ALL
SELECT 'Questionnaires', COUNT(*) FROM Questionnaires
UNION ALL
SELECT 'Questions', COUNT(*) FROM Questions
UNION ALL
SELECT 'PredefinedAnswers', COUNT(*) FROM PredefinedAnswers
UNION ALL
SELECT 'PredefinedAnswerSubQuestions', COUNT(*) FROM PredefinedAnswerSubQuestions
UNION ALL
SELECT 'FlowLayouts', COUNT(*) FROM FlowLayouts;

PRINT '';
PRINT 'Active QuestionnaireTypes:';
SELECT qt.QuestionnaireTypeID, qt.Name, qt.Code, COUNT(q.QuestionID) as RootQuestions
FROM QuestionnaireTypes qt
LEFT JOIN Questionnaires q ON qt.QuestionnaireTypeID = q.QuestionnaireTypeID
GROUP BY qt.QuestionnaireTypeID, qt.Name, qt.Code
ORDER BY qt.QuestionnaireTypeID;
GO

DROP TABLE #ValidQuestions;
GO
