
USE [WIWA_DB_NEW];
GO
SET NOCOUNT ON;

BEGIN TRANSACTION;

-- ç (c with caron) -> č
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(141), N'č');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(141), N'č');

-- ć
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(135), N'ć');
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(8225), N'ć');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(135), N'ć');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(8225), N'ć');

-- ž
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(190), N'ž');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(190), N'ž');

-- š
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(161), N'š');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(161), N'š');

-- đ
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(145), N'đ');
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(8216), N'đ');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(145), N'đ');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(8216), N'đ');

-- Č
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(140), N'Č');
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(338), N'Č');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(140), N'Č');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(338), N'Č');

-- Ć
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(134), N'Ć');
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(8224), N'Ć');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(134), N'Ć');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(8224), N'Ć');

-- Ž
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(189), N'Ž');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(189), N'Ž');

-- Š
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(160), N'Š');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(160), N'Š');

-- Đ
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(144), N'Đ');
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(144), N'Đ');

COMMIT;
PRINT 'All Mojibake encoding issues corrected.';
