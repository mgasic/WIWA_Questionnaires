
USE [WIWA_DB_NEW];
GO
SET NOCOUNT ON;

-- 1. č (U+010D = 269) from C4 8D (196, 141)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(141), NCHAR(269)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(141) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(141), NCHAR(269)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(141) + '%';

-- 2. ć (U+0107 = 263) from C4 87 (196, 135 or 8225)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(135), NCHAR(263)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(135) + '%';
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(8225), NCHAR(263)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(8225) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(135), NCHAR(263)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(135) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(8225), NCHAR(263)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(8225) + '%';

-- 3. ž (U+017E = 382) from C5 BE (197, 190)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(190), NCHAR(382)) WHERE QuestionText LIKE '%' + NCHAR(197) + NCHAR(190) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(190), NCHAR(382)) WHERE Answer LIKE '%' + NCHAR(197) + NCHAR(190) + '%';

-- 4. š (U+0161 = 353) from C5 A1 (197, 161)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(161), NCHAR(353)) WHERE QuestionText LIKE '%' + NCHAR(197) + NCHAR(161) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(161), NCHAR(353)) WHERE Answer LIKE '%' + NCHAR(197) + NCHAR(161) + '%';

-- 5. đ (U+0111 = 273) from C4 91 (196, 145 or 8216)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(145), NCHAR(273)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(145) + '%';
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(8216), NCHAR(273)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(8216) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(145), NCHAR(273)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(145) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(8216), NCHAR(273)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(8216) + '%';

-- 6. Č (U+010C = 268) from C4 8C (196, 140 or 338)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(140), NCHAR(268)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(140) + '%';
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(338), NCHAR(268)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(338) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(140), NCHAR(268)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(140) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(338), NCHAR(268)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(338) + '%';

-- 7. Ć (U+0106 = 262) from C4 86 (196, 134 or 8224)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(134), NCHAR(262)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(134) + '%';
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(8224), NCHAR(262)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(8224) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(134), NCHAR(262)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(134) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(8224), NCHAR(262)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(8224) + '%';

-- 8. Ž (U+017D = 381) from C5 BD (197, 189)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(189), NCHAR(381)) WHERE QuestionText LIKE '%' + NCHAR(197) + NCHAR(189) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(189), NCHAR(381)) WHERE Answer LIKE '%' + NCHAR(197) + NCHAR(189) + '%';

-- 9. Š (U+0160 = 352) from C5 A0 (197, 160)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(197) + NCHAR(160), NCHAR(352)) WHERE QuestionText LIKE '%' + NCHAR(197) + NCHAR(160) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(197) + NCHAR(160), NCHAR(352)) WHERE Answer LIKE '%' + NCHAR(197) + NCHAR(160) + '%';

-- 10. Đ (U+0110 = 272) from C4 90 (196, 144)
UPDATE Questions SET QuestionText = REPLACE(QuestionText, NCHAR(196) + NCHAR(144), NCHAR(272)) WHERE QuestionText LIKE '%' + NCHAR(196) + NCHAR(144) + '%';
UPDATE PredefinedAnswers SET Answer = REPLACE(Answer, NCHAR(196) + NCHAR(144), NCHAR(272)) WHERE Answer LIKE '%' + NCHAR(196) + NCHAR(144) + '%';

PRINT 'Character encoding repair complete.';
