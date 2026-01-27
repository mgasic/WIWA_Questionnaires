
USE [WIWA_DB_NEW];
GO
SET NOCOUNT ON;

BEGIN TRANSACTION;

-- Helper for new PASQ ID
DECLARE @NewPasqID INT;
SELECT @NewPasqID = ISNULL(MAX(PredefinedAnswerSubQuestionID), 0) + 1 FROM PredefinedAnswerSubQuestions;

SET IDENTITY_INSERT Questions ON;

-- ============================================================
-- 1. Create Sub-Question for Q104 (Bolesti)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Questions WHERE QuestionID = 1041)
BEGIN
    INSERT INTO Questions (QuestionID, QuestionText, QuestionLabel, QuestionOrder, QuestionFormatID, SpecificQuestionTypeID, ParentQuestionID, IsRequired)
    VALUES (1041, N'Koje oboljenje:', N'104.1', 1, 1, 2, 104, 1);
    PRINT 'Created Q1041 (Bolesti Detail)';
END

-- Link Q104 "Da" -> Q1041
DECLARE @AnsYes_104 INT;
SELECT @AnsYes_104 = PredefinedAnswerID FROM PredefinedAnswers WHERE QuestionID = 104 AND Answer LIKE N'Da%';

IF @AnsYes_104 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PredefinedAnswerSubQuestions WHERE PredefinedAnswerID = @AnsYes_104 AND SubQuestionID = 1041)
    BEGIN
        INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerSubQuestionID, PredefinedAnswerID, SubQuestionID)
        VALUES (@NewPasqID, @AnsYes_104, 1041);
        SET @NewPasqID = @NewPasqID + 1;
        PRINT 'Linked Q104-Yes -> Q1041';
    END
END

-- ============================================================
-- 2. Create Sub-Question for Q106 (Invaliditet)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Questions WHERE QuestionID = 1061)
BEGIN
    INSERT INTO Questions (QuestionID, QuestionText, QuestionLabel, QuestionOrder, QuestionFormatID, SpecificQuestionTypeID, ParentQuestionID, IsRequired)
    VALUES (1061, N'Detalji (Invaliditet):', N'106.1', 1, 1, 2, 106, 1);
    PRINT 'Created Q1061 (Invaliditet Detail)';
END

-- Link Q106 "Da" -> Q1061
DECLARE @AnsYes_106 INT;
SELECT @AnsYes_106 = PredefinedAnswerID FROM PredefinedAnswers WHERE QuestionID = 106 AND Answer LIKE N'Da%';

IF @AnsYes_106 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PredefinedAnswerSubQuestions WHERE PredefinedAnswerID = @AnsYes_106 AND SubQuestionID = 1061)
    BEGIN
        INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerSubQuestionID, PredefinedAnswerID, SubQuestionID)
        VALUES (@NewPasqID, @AnsYes_106, 1061);
        SET @NewPasqID = @NewPasqID + 1;
        PRINT 'Linked Q106-Yes -> Q1061';
    END
END

SET IDENTITY_INSERT Questions OFF;

COMMIT;
PRINT 'Completed missing sub-questions for Q104 and Q106.';
