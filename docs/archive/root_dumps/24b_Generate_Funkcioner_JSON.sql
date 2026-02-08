/*
    WIWA – Questionnaire JSON generator (v9) – Model 27-01-2026
    ---------------------------------------------------------------------------
    Targeted for Type 4: Upitnik za identifikaciju funkcionera
*/

DECLARE @QuestionnaireTypeID SMALLINT = 4; -- << TARGETING NEW TYPE

SET NOCOUNT ON;

-------------------------------------------------------------------------------
-- 0) Helper: map QuestionFormatName -> UiControl (front-end control type)
-------------------------------------------------------------------------------
DECLARE @UiControlMap TABLE (
    Pattern NVARCHAR(100) NOT NULL,
    UiControl NVARCHAR(50) NOT NULL
);
INSERT INTO @UiControlMap(Pattern, UiControl)
VALUES
 (N'%Radio%',  N'radio'),
 (N'%Select%', N'select'),
 (N'%Check%',  N'checkbox'),
 (N'%Text%',   N'textarea'),
 (N'%Input%',  N'input'),
 (N'%Hidden%', N'hidden'),
 (N'%Date%',   N'date'),
 (N'%Label%',  N'label');

-------------------------------------------------------------------------------
-- 1) Select questions by QuestionnaireType + closure over SubQuestionID links
-------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#QQ', 'U') IS NOT NULL DROP TABLE #QQ;
CREATE TABLE #QQ
(
    [QuestionnaireID] INT NULL,
    [QuestionID]      INT NOT NULL PRIMARY KEY
);

INSERT INTO #QQ ([QuestionnaireID], [QuestionID])
SELECT qn.[QuestionnaireID], qn.[QuestionID]
FROM [dbo].[Questionnaires] qn
WHERE qn.[QuestionnaireTypeID] = @QuestionnaireTypeID;

-- Add any referenced SubQuestions that are not in mapping (closure)
WHILE 1 = 1
BEGIN
    ;WITH Missing AS
    (
        SELECT DISTINCT pasq.[SubQuestionID] AS [QuestionID]
        FROM [dbo].[PredefinedAnswers] pa
        JOIN [dbo].[PredefinedAnswerSubQuestions] pasq
          ON pasq.[PredefinedAnswerID] = pa.[PredefinedAnswerID]
        JOIN #QQ sel
          ON sel.[QuestionID] = pa.[QuestionID]
        LEFT JOIN #QQ already
          ON already.[QuestionID] = pasq.[SubQuestionID]
        WHERE already.[QuestionID] IS NULL
    )
    INSERT INTO #QQ ([QuestionnaireID], [QuestionID])
    SELECT NULL, m.[QuestionID]
    FROM Missing m;

    IF @@ROWCOUNT = 0 BREAK;
END;

-- Add AlwaysVisible (unconditional) children
WHILE 1 = 1
BEGIN
    ;WITH MissingChildren AS
    (
        SELECT DISTINCT c.[QuestionID]
        FROM [dbo].[Questions] c
        JOIN #QQ parentSel
          ON parentSel.[QuestionID] = c.[ParentQuestionID]
        LEFT JOIN #QQ already
          ON already.[QuestionID] = c.[QuestionID]
        WHERE already.[QuestionID] IS NULL
    )
    INSERT INTO #QQ ([QuestionnaireID], [QuestionID])
    SELECT NULL, mc.[QuestionID]
    FROM MissingChildren mc;

    IF @@ROWCOUNT = 0 BREAK;
END;

-------------------------------------------------------------------------------
-- 2) Build nested SubQuestion JSON bottom-up
-------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#SubQJson', 'U') IS NOT NULL DROP TABLE #SubQJson;
CREATE TABLE #SubQJson
(
    [QuestionID] INT NOT NULL PRIMARY KEY,
    [Json]       NVARCHAR(MAX) NOT NULL
);

WHILE EXISTS (
    SELECT 1
    FROM #QQ sel
    LEFT JOIN #SubQJson done ON done.[QuestionID] = sel.[QuestionID]
    WHERE done.[QuestionID] IS NULL
)
BEGIN
    ;WITH Ready AS
    (
        SELECT q.[QuestionID]
        FROM [dbo].[Questions] q
        JOIN #QQ sel ON sel.[QuestionID] = q.[QuestionID]
        LEFT JOIN #SubQJson done ON done.[QuestionID] = q.[QuestionID]
        WHERE done.[QuestionID] IS NULL
          AND NOT EXISTS
          (
              SELECT 1
              FROM [dbo].[PredefinedAnswers] pa
              JOIN [dbo].[PredefinedAnswerSubQuestions] pasq
                ON pasq.[PredefinedAnswerID] = pa.[PredefinedAnswerID]
              JOIN #QQ selChild
                ON selChild.[QuestionID] = pasq.[SubQuestionID]
              LEFT JOIN #SubQJson childDone
                ON childDone.[QuestionID] = pasq.[SubQuestionID]
              WHERE pa.[QuestionID] = q.[QuestionID]
                AND childDone.[QuestionID] IS NULL
          )
          AND NOT EXISTS
          (
              SELECT 1
              FROM [dbo].[Questions] ch
              JOIN #QQ selCh
                ON selCh.[QuestionID] = ch.[QuestionID]
              LEFT JOIN #SubQJson chDone
                ON chDone.[QuestionID] = ch.[QuestionID]
              WHERE ch.[ParentQuestionID] = q.[QuestionID]
                AND chDone.[QuestionID] IS NULL
          )
    )
    INSERT INTO #SubQJson ([QuestionID], [Json])
    SELECT
        q.[QuestionID],
        (
            SELECT
                q.[QuestionID]       AS [QuestionID],
                q.[QuestionLabel]    AS [QuestionLabel],
                q.[QuestionText]     AS [QuestionText],
                q.[QuestionFormatID] AS [QuestionFormatID],
                qf.[Name]            AS [SubQuestionFormat],
                q.[IsRequired]       AS [isRequired],
                q.[ValidationPattern] AS [validationPattern],
                q.[SpecificQuestionTypeID] AS [SpecificQuestionTypeID],
                sqt.[Name]                 AS [SpecificQuestionTypeName],
                q.[ReadOnly]               AS [ReadOnly],
                q.[ParentQuestionID]       AS [ParentQuestionID],
                Children = JSON_QUERY(COALESCE((
                    SELECT
                        N'[' + STRING_AGG(ch.[Json], N',')
                              WITHIN GROUP (ORDER BY qc2.[QuestionOrder], qc2.[QuestionID]) + N']'
                    FROM [dbo].[Questions] qc2
                    JOIN #SubQJson ch
                      ON ch.[QuestionID] = qc2.[QuestionID]
                    WHERE qc2.[ParentQuestionID] = q.[QuestionID]
                ), N'[]')),
                SubAnswers = JSON_QUERY(COALESCE((
                    SELECT
                        pa.[PredefinedAnswerID]  AS [PredefinedAnswerID],
                        pa.[Answer]              AS [Answer],
                        pa.[Code]                AS [Code],
                        pa.[PreSelected]         AS [PreSelected],
                        pa.[StatisticalWeight]   AS [StatisticalWeight],
                        SubQuestions = JSON_QUERY(COALESCE((
                            SELECT
                                N'[' + STRING_AGG(sq.[Json], N',')
                                      WITHIN GROUP (ORDER BY qc.[QuestionOrder], qc.[QuestionID]) + N']'
                            FROM [dbo].[PredefinedAnswerSubQuestions] pasq2
                            JOIN #SubQJson sq
                              ON sq.[QuestionID] = pasq2.[SubQuestionID]
                            JOIN [dbo].[Questions] qc
                              ON qc.[QuestionID] = pasq2.[SubQuestionID]
                            WHERE pasq2.[PredefinedAnswerID] = pa.[PredefinedAnswerID]
                        ), N'[]'))
                    FROM [dbo].[PredefinedAnswers] pa
                    WHERE pa.[QuestionID] = q.[QuestionID]
                    ORDER BY pa.[PredefinedAnswerID]
                    FOR JSON PATH
                ), N'[]'))
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) AS [Json]
    FROM [dbo].[Questions] q
    JOIN Ready r
      ON r.[QuestionID] = q.[QuestionID]
    LEFT JOIN [dbo].[QuestionFormats] qf
      ON qf.[QuestionFormatID] = q.[QuestionFormatID]
    LEFT JOIN [dbo].[SpecificQuestionTypes] sqt
      ON sqt.[SpecificQuestionTypeID] = q.[SpecificQuestionTypeID];

    IF @@ROWCOUNT = 0 BREAK;
END;

-------------------------------------------------------------------------------
-- 3) Root questions
-------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#RootQJson', 'U') IS NOT NULL DROP TABLE #RootQJson;
CREATE TABLE #RootQJson
(
    [QuestionID]    INT NOT NULL PRIMARY KEY,
    [QuestionOrder] INT NOT NULL,
    [Json]          NVARCHAR(MAX) NOT NULL
);

INSERT INTO #RootQJson ([QuestionID], [QuestionOrder], [Json])
SELECT
    q.[QuestionID],
    ISNULL(q.[QuestionOrder], 0) AS [QuestionOrder],
    (
        SELECT
            q.[QuestionID]       AS [QuestionID],
            q.[QuestionLabel]    AS [QuestionLabel],
            q.[QuestionText]     AS [QuestionText],
            q.[QuestionOrder]    AS [QuestionOrder],
            q.[QuestionFormatID] AS [QuestionFormatID],
            qf.[Name]            AS [QuestionFormatName],
            q.[IsRequired]        AS [isRequired],
            q.[ValidationPattern] AS [validationPattern],
            UiControl = (
                SELECT TOP 1 m.UiControl
                FROM @UiControlMap m
                WHERE qf.[Name] LIKE m.Pattern
            ),
            q.[SpecificQuestionTypeID] AS [SpecificQuestionTypeID],
            sqt.[Name]                 AS [SpecificQuestionTypeName],
            q.[ReadOnly]               AS [ReadOnly],
            q.[ParentQuestionID]       AS [ParentQuestionID],
            Children = JSON_QUERY(COALESCE((
                SELECT
                    N'[' + STRING_AGG(ch.[Json], N',')
                          WITHIN GROUP (ORDER BY qc2.[QuestionOrder], qc2.[QuestionID]) + N']'
                FROM [dbo].[Questions] qc2
                JOIN #SubQJson ch
                  ON ch.[QuestionID] = qc2.[QuestionID]
                WHERE qc2.[ParentQuestionID] = q.[QuestionID]
            ), N'[]')),
            Answers = JSON_QUERY(COALESCE((
                SELECT
                    pa.[PredefinedAnswerID]  AS [PredefinedAnswerID],
                    pa.[Answer]              AS [Answer],
                    pa.[Code]                AS [Code],
                    pa.[PreSelected]         AS [PreSelected],
                    pa.[StatisticalWeight]   AS [StatisticalWeight],
                    SubQuestions = JSON_QUERY(COALESCE((
                        SELECT
                            N'[' + STRING_AGG(sq.[Json], N',')
                                  WITHIN GROUP (ORDER BY qc.[QuestionOrder], qc.[QuestionID]) + N']'
                        FROM [dbo].[PredefinedAnswerSubQuestions] pasq2
                        JOIN #SubQJson sq
                          ON sq.[QuestionID] = pasq2.[SubQuestionID]
                        JOIN [dbo].[Questions] qc
                          ON qc.[QuestionID] = pasq2.[SubQuestionID]
                        WHERE pasq2.[PredefinedAnswerID] = pa.[PredefinedAnswerID]
                    ), N'[]'))
                FROM [dbo].[PredefinedAnswers] pa
                WHERE pa.[QuestionID] = q.[QuestionID]
                ORDER BY pa.[PredefinedAnswerID]
                FOR JSON PATH
            ), N'[]'))
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS [Json]
FROM [dbo].[Questions] q
JOIN #QQ sel
  ON sel.[QuestionID] = q.[QuestionID]
LEFT JOIN [dbo].[QuestionFormats] qf
  ON qf.[QuestionFormatID] = q.[QuestionFormatID]
LEFT JOIN [dbo].[SpecificQuestionTypes] sqt
  ON sqt.[SpecificQuestionTypeID] = q.[SpecificQuestionTypeID]
WHERE q.[ParentQuestionID] IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM [dbo].[PredefinedAnswerSubQuestions] x
      WHERE x.[SubQuestionID] = q.[QuestionID]
  );

-------------------------------------------------------------------------------
-- 4) Final Export
-------------------------------------------------------------------------------
SELECT
    [Json] =
    (
        SELECT
            meta = JSON_QUERY((
                SELECT
                    schemaVersion        = N'v9_MODEL_27_01_2026',
                    generatedAt          = CONVERT(VARCHAR(33), SYSUTCDATETIME(), 126) + 'Z',
                    questionnaireTypeId  = @QuestionnaireTypeID
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            )),
            questionnaire = JSON_QUERY((
                SELECT
                    id                    = @QuestionnaireTypeID,
                    qt.Name                AS typeName,
                    qt.Code                AS typeCode
                FROM dbo.QuestionnaireTypes qt
                WHERE qt.QuestionnaireTypeID = @QuestionnaireTypeID
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            )),
            questions = JSON_QUERY(COALESCE((
                SELECT
                    JSON_QUERY(r.Json) AS [*]
                FROM #RootQJson r
                ORDER BY r.QuestionOrder, r.QuestionID
                FOR JSON PATH
            ), N'[]'))
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );
GO
