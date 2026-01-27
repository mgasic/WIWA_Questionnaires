
USE [WIWA_DB_NEW];
GO
SET NOCOUNT ON;

BEGIN TRANSACTION;

-- ============================================================
-- helper variables
-- ============================================================
DECLARE @NewPasqID INT;
SELECT @NewPasqID = ISNULL(MAX(PredefinedAnswerSubQuestionID), 0) + 1 FROM PredefinedAnswerSubQuestions;

DECLARE @SurveyTypeID INT = 2; -- Small Questionnaire
DECLARE @Q10000_ID INT = 10000; -- Health Card Yes/No
DECLARE @Q103_ID INT = 103; -- Health Card Name (Text)

-- ============================================================
-- 1. Q103 Logic Fix (Connect Q10000 -> Q103)
-- ============================================================
-- Remove Q103 from Questionnaires (Type 2) if still there
DELETE FROM Questionnaires WHERE QuestionnaireTypeID = @SurveyTypeID AND QuestionID = @Q103_ID;

-- Add Q10000 (Parent) if missing
IF NOT EXISTS (SELECT 1 FROM Questionnaires WHERE QuestionnaireTypeID = @SurveyTypeID AND QuestionID = @Q10000_ID)
BEGIN
    INSERT INTO Questionnaires (QuestionnaireTypeID, QuestionID) VALUES (@SurveyTypeID, @Q10000_ID);
    PRINT 'Added Q10000 (Health Card Yes/No) to Small Questionnaire';
END

-- Link Q10000 "Da" -> Q103 (SubQuestion)
DECLARE @AnsYes_10000 INT;
SELECT @AnsYes_10000 = PredefinedAnswerID FROM PredefinedAnswers WHERE QuestionID = @Q10000_ID AND Answer LIKE N'Da%';

IF @AnsYes_10000 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PredefinedAnswerSubQuestions WHERE PredefinedAnswerID = @AnsYes_10000 AND SubQuestionID = @Q103_ID)
    BEGIN
        INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerSubQuestionID, PredefinedAnswerID, SubQuestionID)
        VALUES (@NewPasqID, @AnsYes_10000, @Q103_ID);
        SET @NewPasqID = @NewPasqID + 1;
        PRINT 'Linked Q10000-Yes -> Q103';
    END
END

-- ============================================================
-- 2. Create Sub-Questions (1051, 1071, 1081, 1091)
-- ============================================================
SET IDENTITY_INSERT Questions ON;

-- Q1051
IF NOT EXISTS (SELECT 1 FROM Questions WHERE QuestionID = 1051)
BEGIN
    INSERT INTO Questions (QuestionID, QuestionText, QuestionLabel, QuestionOrder, QuestionFormatID, SpecificQuestionTypeID, ParentQuestionID, IsRequired)
    VALUES (1051, N'Detalji (Lista bolesti):', N'105.1', 1, 1, 2, 105, 1);
    PRINT 'Created Q1051';
END

-- Q1071
IF NOT EXISTS (SELECT 1 FROM Questions WHERE QuestionID = 1071)
BEGIN
    INSERT INTO Questions (QuestionID, QuestionText, QuestionLabel, QuestionOrder, QuestionFormatID, SpecificQuestionTypeID, ParentQuestionID, IsRequired)
    VALUES (1071, N'Detalji (Sport):', N'107.1', 1, 1, 2, 107, 1);
    PRINT 'Created Q1071';
END

-- Q1081
IF NOT EXISTS (SELECT 1 FROM Questions WHERE QuestionID = 1081)
BEGIN
    INSERT INTO Questions (QuestionID, QuestionText, QuestionLabel, QuestionOrder, QuestionFormatID, SpecificQuestionTypeID, ParentQuestionID, IsRequired)
    VALUES (1081, N'Detalji (Rizik povređivanja):', N'108.1', 1, 1, 2, 108, 1);
    PRINT 'Created Q1081';
END

-- Q1091
IF NOT EXISTS (SELECT 1 FROM Questions WHERE QuestionID = 1091)
BEGIN
    INSERT INTO Questions (QuestionID, QuestionText, QuestionLabel, QuestionOrder, QuestionFormatID, SpecificQuestionTypeID, ParentQuestionID, IsRequired)
    VALUES (1091, N'Detalji (Odbijena ponuda):', N'109.1', 1, 1, 2, 109, 1);
    PRINT 'Created Q1091';
END

SET IDENTITY_INSERT Questions OFF;

-- ============================================================
-- 3. Link Sub-Questions (PredefinedAnswerSubQuestions)
-- ============================================================

-- Link Q105 "Da" -> Q1051
DECLARE @AnsYes_105 INT;
SELECT @AnsYes_105 = PredefinedAnswerID FROM PredefinedAnswers WHERE QuestionID = 105 AND Answer LIKE N'Da%';

IF @AnsYes_105 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PredefinedAnswerSubQuestions WHERE PredefinedAnswerID = @AnsYes_105 AND SubQuestionID = 1051)
    BEGIN
        INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerSubQuestionID, PredefinedAnswerID, SubQuestionID)
        VALUES (@NewPasqID, @AnsYes_105, 1051);
        SET @NewPasqID = @NewPasqID + 1;
        PRINT 'Linked Q105-Yes -> Q1051';
    END
END

-- Link Q107 "Da" -> Q1071
DECLARE @AnsYes_107 INT;
SELECT @AnsYes_107 = PredefinedAnswerID FROM PredefinedAnswers WHERE QuestionID = 107 AND Answer LIKE N'Da%';

IF @AnsYes_107 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PredefinedAnswerSubQuestions WHERE PredefinedAnswerID = @AnsYes_107 AND SubQuestionID = 1071)
    BEGIN
        INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerSubQuestionID, PredefinedAnswerID, SubQuestionID)
        VALUES (@NewPasqID, @AnsYes_107, 1071);
        SET @NewPasqID = @NewPasqID + 1;
        PRINT 'Linked Q107-Yes -> Q1071';
    END
END

-- Link Q108 "Da" -> Q1081
DECLARE @AnsYes_108 INT;
SELECT @AnsYes_108 = PredefinedAnswerID FROM PredefinedAnswers WHERE QuestionID = 108 AND Answer LIKE N'Da%';

IF @AnsYes_108 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PredefinedAnswerSubQuestions WHERE PredefinedAnswerID = @AnsYes_108 AND SubQuestionID = 1081)
    BEGIN
        INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerSubQuestionID, PredefinedAnswerID, SubQuestionID)
        VALUES (@NewPasqID, @AnsYes_108, 1081);
        SET @NewPasqID = @NewPasqID + 1;
        PRINT 'Linked Q108-Yes -> Q1081';
    END
END

-- Link Q109 "Da" -> Q1091
DECLARE @AnsYes_109 INT;
SELECT @AnsYes_109 = PredefinedAnswerID FROM PredefinedAnswers WHERE QuestionID = 109 AND Answer LIKE N'Da%';

IF @AnsYes_109 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PredefinedAnswerSubQuestions WHERE PredefinedAnswerID = @AnsYes_109 AND SubQuestionID = 1091)
    BEGIN
        INSERT INTO PredefinedAnswerSubQuestions (PredefinedAnswerSubQuestionID, PredefinedAnswerID, SubQuestionID)
        VALUES (@NewPasqID, @AnsYes_109, 1091);
        SET @NewPasqID = @NewPasqID + 1;
        PRINT 'Linked Q109-Yes -> Q1091';
    END
END

COMMIT;
PRINT 'Small Quest Branching Complete.';
