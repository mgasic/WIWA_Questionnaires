/* 
    24_Implement_Funkcioner_Questionnaire.sql
    Ažurirano prema originalnoj slici (identičan tekst)
    Korišćen opseg ID-eva od 500 na gore kako bi se izbegli konflikti.
*/

USE [WIWA_Questionnaires_DB];
GO

-- 0) ČIŠĆENJE (Cleanup) - Re-runnable skripta
DELETE FROM [dbo].[ProductQuestionaryTypes] WHERE [QuestionaryTypeID] = 4;
DELETE FROM [dbo].[QuestionnaireTypeRules] WHERE [QuestionnaireTypeID] = 4;
DELETE FROM [dbo].[QuestionReferenceColumns] WHERE [QuestionnaireTypeReferenceTableID] IN (SELECT [QuestionnaireTypeReferenceTableID] FROM [dbo].[QuestionnaireTypeReferenceTables] WHERE [QuestionnaireTypeID] = 4);
DELETE FROM [dbo].[QuestionnaireTypeReferenceTables] WHERE [QuestionnaireTypeID] = 4;
DELETE FROM [dbo].[QuestionnaireAnswers] WHERE [QuestionnaireByQuestionnaireIdentificatorID] IN (SELECT [QuestionnaireByQuestionnaireIdentificatorID] FROM [dbo].[QuestionnaireByQuestionnaireIdentificators] WHERE [QuestionnaireTypeID] = 4);
DELETE FROM [dbo].[FlowLayouts] WHERE [QuestionnaireTypeID] = 4;
DELETE FROM [dbo].[Questionnaires] WHERE [QuestionnaireTypeID] = 4;
DELETE FROM [dbo].[PredefinedAnswerSubQuestions] WHERE [PredefinedAnswerSubQuestionID] BETWEEN 500 AND 599;
DELETE FROM [dbo].[PredefinedAnswers] WHERE [QuestionID] BETWEEN 500 AND 599 OR [PredefinedAnswerID] BETWEEN 500 AND 599;
DELETE FROM [dbo].[Questions] WHERE [QuestionID] BETWEEN 500 AND 599;
DELETE FROM [dbo].[QuestionnaireByQuestionnaireIdentificators] WHERE [QuestionnaireTypeID] = 4;
DELETE FROM [dbo].[QuestionnaireTypes] WHERE [QuestionnaireTypeID] = 4;
GO

-- 1) QuestionnaireTypes
SET IDENTITY_INSERT [dbo].[QuestionnaireTypes] ON;
INSERT [dbo].[QuestionnaireTypes] ([QuestionnaireTypeID], [Name], [Code], [QuestionnaireCategoryID]) 
VALUES (4, N'Upitnik za identifikaciju funkcionera', N'FUNC_QUEST', NULL);
SET IDENTITY_INSERT [dbo].[QuestionnaireTypes] OFF;
GO

-- 1b) QuestionnaireIdentificatorTypes
SET IDENTITY_INSERT [dbo].[QuestionnaireIdentificatorTypes] ON;
IF NOT EXISTS (SELECT 1 FROM [dbo].[QuestionnaireIdentificatorTypes] WHERE [QuestionnaireIdentificatorTypeID] = 2)
BEGIN
    INSERT [dbo].[QuestionnaireIdentificatorTypes] ([QuestionnaireIdentificatorTypeID], [Name]) VALUES (2, N'OIB/JMBG');
END
SET IDENTITY_INSERT [dbo].[QuestionnaireIdentificatorTypes] OFF;
GO

-- 2) Questions
SET IDENTITY_INSERT [dbo].[Questions] ON;

-- Pitanje 1 (ID: 500)
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (500, N'1. Da li ste lice koje obavlja ili je u poslednje četiri godine obavljalo neku od funkcija navedenih u tačkama 1 - 3?', 10, 2, 1, N'1', NULL, 0, 1, NULL);

-- Sub-pitanja za Q1 (Flattened Structure, ParentQuestionID = NULL)
-- Spojen tekst upozorenja i "Funkcija"
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (501, N'Ukoliko ste na prethodno pitanje odgovorili sa DA, prema Zakonu o sprečavanju pranja novca i finansiranja terorizma Vi ste funkcioner. Molimo Vas da navedete funkciju:', 11, 1, 2, N'', NULL, 0, 1, NULL);

-- "od" datum
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (502, N'i period obavljanja funkcije od:', 12, 7, 2, N'', NULL, 0, 1, NULL);

-- "do" datum
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (503, N'do', 13, 7, 2, N'', NULL, 0, 0, NULL); -- "do" nije uvek obavezno (ako je funkcija i dalje u toku?)

-- Pitanje 2 (ID: 510)
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (510, N'2. Da li ste član uže porodice funkcionera?', 20, 2, 1, N'2', NULL, 0, 1, NULL);

INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (511, N'Ukoliko ste na prethodno pitanje odgovorili sa DA molimo Vas da navedete u kom ste srodstvu i sa kojim funkcionerom ( ime, prezime,funkcija):', 21, 6, 2, N'', NULL, 0, 1, NULL);

-- Pitanje 3 (ID: 520)
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (520, N'3. Da li ste bliži saradnik funkcionera?', 30, 2, 1, N'3', NULL, 0, 1, NULL);

INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (521, N'Ukoliko ste na prethodno pitanje odgovorili sa DA molimo Vas da navedete u kakvom ste poslovnom odnosu i sa kojim funkcionerom (ime, prezime, funkcija):', 31, 6, 2, N'', NULL, 0, 1, NULL);

-- Pitanje 4 (ID: 530)
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (530, N'4. Ukoliko ste se izjasnili da ste funkcioner, član uže porodice funkcionera ili bliži saradnik funkcionera, molim Vas navedite podatke o celokupnoj imovini koju posedujete:', 40, 6, 1, N'4', NULL, 0, 1, NULL);

-- Pitanje 5 (ID: 540)
INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (540, N'5. Molim Vas da navedete poreklo sredstava ili imovine koji su ili će biti predmet poslovnog odnosa sa osiguravačem:', 50, 4, 1, N'5', NULL, 0, 1, NULL);

INSERT [dbo].[Questions] ([QuestionID], [QuestionText], [QuestionOrder], [QuestionFormatID], [SpecificQuestionTypeID], [QuestionLabel], [ParentQuestionID], [ReadOnly], [IsRequired], [ValidationPattern]) 
VALUES (541, N'Navesti osnov drugog prihoda:', 51, 1, 2, N'', NULL, 0, 1, NULL);

SET IDENTITY_INSERT [dbo].[Questions] OFF;
GO

-- 3) PredefinedAnswers
SET IDENTITY_INSERT [dbo].[PredefinedAnswers] ON;

-- Q500 Answers (ID: 500, 501)
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) VALUES (500, 500, 0, N'DA', NULL, N'DA', 1);
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) VALUES (501, 500, 0, N'NE', NULL, N'NE', 2);

-- Q510 Answers (ID: 510, 511)
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) VALUES (510, 510, 0, N'DA', NULL, N'DA', 1);
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) VALUES (511, 510, 0, N'NE', NULL, N'NE', 2);

-- Q520 Answers (ID: 520, 521)
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) VALUES (520, 520, 0, N'DA', NULL, N'DA', 1);
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) VALUES (521, 520, 0, N'NE', NULL, N'NE', 2);

-- Q540 Checkbox Options (ID: 540-544)
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) 
VALUES (540, 540, 0, N'lični dohodak (zarada, penzija)', NULL, N'LIČNI', 1);
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) 
VALUES (541, 540, 0, N'prihod od samostalne delatnosti', NULL, N'SAMOSTALNA', 2);
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) 
VALUES (542, 540, 0, N'prihod od imovine i imovinskih prava', NULL, N'IMOVINA', 3);
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) 
VALUES (543, 540, 0, N'prihod od osiguranja (isplata osigurane sume)', NULL, N'OSIGURANJE', 4);
INSERT [dbo].[PredefinedAnswers] ([PredefinedAnswerID], [QuestionID], [PreSelected], [Answer], [StatisticalWeight], [Code], [DisplayOrder]) 
VALUES (544, 540, 0, N'drugi prihod (molimo navesti)', NULL, N'OTHER', 5);

SET IDENTITY_INSERT [dbo].[PredefinedAnswers] OFF;
GO

-- 4) Branching logika
SET IDENTITY_INSERT [dbo].[PredefinedAnswerSubQuestions] ON;

-- Q500 DA (Answer 500) -> 501, 502, 503
INSERT [dbo].[PredefinedAnswerSubQuestions] ([PredefinedAnswerSubQuestionID], [PredefinedAnswerID], [SubQuestionID]) VALUES (500, 500, 501);
INSERT [dbo].[PredefinedAnswerSubQuestions] ([PredefinedAnswerSubQuestionID], [PredefinedAnswerID], [SubQuestionID]) VALUES (501, 500, 502);
INSERT [dbo].[PredefinedAnswerSubQuestions] ([PredefinedAnswerSubQuestionID], [PredefinedAnswerID], [SubQuestionID]) VALUES (502, 500, 503);

-- Q510 DA (Answer 510) -> 511
INSERT [dbo].[PredefinedAnswerSubQuestions] ([PredefinedAnswerSubQuestionID], [PredefinedAnswerID], [SubQuestionID]) VALUES (510, 510, 511);

-- Q520 DA (Answer 520) -> 521
INSERT [dbo].[PredefinedAnswerSubQuestions] ([PredefinedAnswerSubQuestionID], [PredefinedAnswerID], [SubQuestionID]) VALUES (520, 520, 521);

-- Q540 "drugi prihod" (Answer 544) -> 541
INSERT [dbo].[PredefinedAnswerSubQuestions] ([PredefinedAnswerSubQuestionID], [PredefinedAnswerID], [SubQuestionID]) VALUES (540, 544, 541);

SET IDENTITY_INSERT [dbo].[PredefinedAnswerSubQuestions] OFF;
GO

-- 5) Questionnaires
INSERT [dbo].[Questionnaires] ([QuestionnaireTypeID], [QuestionID]) VALUES (4, 500);
INSERT [dbo].[Questionnaires] ([QuestionnaireTypeID], [QuestionID]) VALUES (4, 510);
INSERT [dbo].[Questionnaires] ([QuestionnaireTypeID], [QuestionID]) VALUES (4, 520);
INSERT [dbo].[Questionnaires] ([QuestionnaireTypeID], [QuestionID]) VALUES (4, 530);
INSERT [dbo].[Questionnaires] ([QuestionnaireTypeID], [QuestionID]) VALUES (4, 540);
GO
