
USE [WIWA_DB_NEW];
GO
SET NOCOUNT ON;

BEGIN TRANSACTION;

-- 1. Insert BMI Rule for Short Questionnaire (QuestionID = 102)
IF NOT EXISTS (SELECT 1 FROM QuestionComputedConfigs WHERE QuestionID = 102)
BEGIN
    INSERT INTO QuestionComputedConfigs (
        QuestionID, 
        ComputeMethodID, 
        RuleName, 
        RuleDescription, 
        OutputMode, 
        OutputTarget, 
        Priority, 
        IsActive
    )
    VALUES (
        102,             -- BMI Index (Short)
        2,               -- BMI_CALC
        'BMI Calculation Short',
        'Auto-calculate BMI from Visina (100) and Tezina (101)',
        1,               -- Value
        NULL,
        50,
        1
    );
    PRINT 'Inserted BMI Rule for QuestionID 102';
END

-- 2. Enable Validation (IsRequired=1) for Short Questionnaire
-- Update all questions linked to QuestionnaireTypeID = 2 (Short Questionnaire)
UPDATE Questions
SET IsRequired = 1
WHERE QuestionID IN (
    SELECT q.QuestionID
    FROM Questionnaires x
    JOIN Questions q ON x.QuestionID = q.QuestionID
    WHERE x.QuestionnaireTypeID = 2
);

-- Note: Ensure 100 (Visina) and 101 (Tezina) are required too
-- They are children of 102, so might not be directly in Questionnaires table mapping?
-- Let's check if they are mapped. If not, update them explicitly.
-- The query above uses JOIN on Questionnaires. If 100/101 are children, they might not be in Questionnaires directly.
-- So let's update explicitly.

UPDATE Questions
SET IsRequired = 1
WHERE QuestionID IN (100, 101, 102);

-- Update all other top-level questions for Short Questionnaire if not caught
UPDATE Questions
SET IsRequired = 1
WHERE QuestionID IN (
    SELECT QuestionID FROM Questionnaires WHERE QuestionnaireTypeID = 2
);

PRINT 'Enabled Validation for Short Questionnaire questions';

COMMIT;
