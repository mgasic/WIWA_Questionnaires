-- Cleanup Duplicates for QuestionnaireTypeID = 2
-- Script identifies duplicates by QuestionText and deletes all but the oldest (min ID).

USE WIWA_Questionnaires_DB;
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Identify IDs to Keep (Min ID per QuestionText)
    DECLARE @KeepIDs TABLE (KeepID INT);
    INSERT INTO @KeepIDs
    SELECT MIN(q.QuestionID)
    FROM Questionnaires qm 
    JOIN Questions q ON qm.QuestionID = q.QuestionID 
    WHERE qm.QuestionnaireTypeID = 2 
    GROUP BY q.QuestionText;

    -- 2. Identify IDs to Delete (All others for Type 2)
    DECLARE @DeleteIDs TABLE (DeleteID INT);
    INSERT INTO @DeleteIDs
    SELECT q.QuestionID
    FROM Questionnaires qm 
    JOIN Questions q ON qm.QuestionID = q.QuestionID 
    WHERE qm.QuestionnaireTypeID = 2
    AND q.QuestionID NOT IN (SELECT KeepID FROM @KeepIDs);

    DECLARE @Count INT = (SELECT COUNT(*) FROM @DeleteIDs);
    PRINT 'Found ' + CAST(@Count AS NVARCHAR(10)) + ' duplicate questions to delete.';

    IF @Count > 0 
    BEGIN
        -- 3. Delete links where Deleted Question is the SubQuestion
        DELETE FROM PredefinedAnswerSubQuestions 
        WHERE SubQuestionID IN (SELECT DeleteID FROM @DeleteIDs);

        -- 3.5 Delete from QuestionComputedConfigs
        DELETE FROM QuestionComputedConfigs 
        WHERE QuestionID IN (SELECT DeleteID FROM @DeleteIDs);

        -- 4. Delete links where Answer (Parent) belongs to Deleted Question
        DELETE FROM PredefinedAnswerSubQuestions 
        WHERE PredefinedAnswerID IN (
            SELECT PredefinedAnswerID 
            FROM PredefinedAnswers 
            WHERE QuestionID IN (SELECT DeleteID FROM @DeleteIDs)
        );

        -- 5. Delete Answers of the Deleted Questions
        DELETE FROM PredefinedAnswers 
        WHERE QuestionID IN (SELECT DeleteID FROM @DeleteIDs);

        -- 6. Delete from Questionnaires (Type Link)
        DELETE FROM Questionnaires 
        WHERE QuestionID IN (SELECT DeleteID FROM @DeleteIDs);

        -- 7. Delete the Questions themselves
        DELETE FROM Questions 
        WHERE QuestionID IN (SELECT DeleteID FROM @DeleteIDs);

        PRINT 'Deletion successful.';
    END
    ELSE
    BEGIN
        PRINT 'No duplicates found or nothing to delete.';
    END

    COMMIT TRANSACTION;
    PRINT 'Transaction Committed.';
END TRY
BEGIN CATCH
    PRINT 'Error occurred: ' + ERROR_MESSAGE();
    ROLLBACK TRANSACTION;
    PRINT 'Transaction Rolled Back.';
END CATCH;
GO
