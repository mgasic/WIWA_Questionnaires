/*
===============================================================
  FIX: Schema Mismatches for EF Core
  Opis: Dodavanje nedostajućih kolona koje EF Core model očekuje
  Autor: Antigravity Agent
  Datum: 2026-01-26
===============================================================
*/

USE [WIWA_DB_NEW]; -- Prilagodi ako je ime baze drugačije
GO

BEGIN TRANSACTION;

-- 1. QuestionFormats: Dodavanje Code i Description
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QuestionFormats]') AND name = N'Code')
BEGIN
    ALTER TABLE [dbo].[QuestionFormats] ADD [Code] [nvarchar](50) NULL;
    EXEC('UPDATE [dbo].[QuestionFormats] SET [Code] = [Name]');
    ALTER TABLE [dbo].[QuestionFormats] ALTER COLUMN [Code] [nvarchar](50) NOT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QuestionFormats]') AND name = N'Description')
BEGIN
    ALTER TABLE [dbo].[QuestionFormats] ADD [Description] [nvarchar](500) NULL;
END
GO

-- 2. Questions: Dodavanje IsRequired i ValidationPattern
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Questions]') AND name = N'IsRequired')
BEGIN
    ALTER TABLE [dbo].[Questions] ADD [IsRequired] [bit] NOT NULL DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Questions]') AND name = N'ValidationPattern')
BEGIN
    ALTER TABLE [dbo].[Questions] ADD [ValidationPattern] [nvarchar](255) NULL;
END
GO

-- 3. PredefinedAnswers: Dodavanje DisplayOrder i fix StatisticalWeight
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PredefinedAnswers]') AND name = N'DisplayOrder')
BEGIN
    ALTER TABLE [dbo].[PredefinedAnswers] ADD [DisplayOrder] [int] NOT NULL DEFAULT 0;
END

ALTER TABLE [dbo].[PredefinedAnswers] ALTER COLUMN [StatisticalWeight] decimal(18,2) NULL;
GO

-- 4. QuestionnaireTypes: Osiguranje da Code i Name nisu NULL (za EF Core mapping)
UPDATE [dbo].[QuestionnaireTypes] SET [Code] = 'UNKNOWN' WHERE [Code] IS NULL;
UPDATE [dbo].[QuestionnaireTypes] SET [Name] = 'No Name' WHERE [Name] IS NULL;

ALTER TABLE [dbo].[QuestionnaireTypes] ALTER COLUMN [Code] nvarchar(20) NOT NULL;
ALTER TABLE [dbo].[QuestionnaireTypes] ALTER COLUMN [Name] nvarchar(100) NOT NULL;
GO

COMMIT;

-- Provera
SELECT TOP 5 * FROM QuestionFormats;
SELECT TOP 5 * FROM Questions;
SELECT TOP 5 * FROM PredefinedAnswers;
SELECT TOP 5 * FROM QuestionnaireTypes;
