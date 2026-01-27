/*
    WIWA – Questionnaire JSON generator (v9) – Model 27-01-2026
    ---------------------------------------------------------------------------
    Purpose
    - Generate a single JSON document that contains EVERYTHING a generic GUI
      renderer needs to render and drive a questionnaire 1:1 from data:
        * questionnaire header
        * nested questions/answers/subquestions (conditional)
        * dictionaries (QuestionFormats, SpecificQuestionTypes)
        * QuestionnaireTypeRules
        * referenceMappings (QuestionnaireTypeReferenceTables + QuestionReferenceColumns)
        * referenceTables data (all tables referenced by the QuestionnaireType)

    Changes in v9:
    - Added IsRequired and ValidationPattern to output.
    - Added 'date' to UiControlMap.
    - Deterministic ordering for inputQuestionIds in Computed Rules.

    Notes
    - This script is written for Microsoft SQL Server 2017+ (STRING_AGG, JSON).
    - It is a "pseudocode" generator: you can copy it into a stored procedure.
*/

DECLARE @QuestionnaireTypeID SMALLINT = 3; -- << SET THIS (Default to 3 for active dev)

SET NOCOUNT ON;

-------------------------------------------------------------------------------
-- 0) Helper: map QuestionFormatName -> UiControl (front-end control type)
-------------------------------------------------------------------------------
-- Keep mapping centralized to avoid duplicated CASE expressions.
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
 (N'%Date%',   N'date'),     -- [v9] New
 (N'%Label%',  N'label');    -- [v9] Explicit label support

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

-- Add AlwaysVisible (unconditional) children that are not in mapping (closure)
-- This is critical for computed questions (e.g., building category) where the
-- GUI must render the full child branch defined by Questions.ParentQuestionID.

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
              -- If any needed child subquestion isn't built yet, q is NOT ready
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
              -- If any AlwaysVisible (ParentQuestionID) child isn't built yet, q is NOT ready
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
                
                -- [v9] Validation Columns
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

    IF @@ROWCOUNT = 0
    BEGIN
        BREAK; -- cycle or missing data
    END
END;

-- Hard stop if something couldn't be built
IF EXISTS (
    SELECT 1
    FROM #QQ sel
    LEFT JOIN #SubQJson sq ON sq.[QuestionID] = sel.[QuestionID]
    WHERE sq.[QuestionID] IS NULL
)
BEGIN
    RAISERROR('Cannot build nested JSON: unresolved SubQuestionID dependencies (cycle or missing data).', 16, 1);
    RETURN;
END;

-------------------------------------------------------------------------------
-- 3) Root questions: ParentQuestionID IS NULL AND NOT referenced as SubQuestionID
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
            
            -- [v9] Validation Columns
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
-- 4) Dictionaries (for fully data-driven GUI)
-------------------------------------------------------------------------------
DECLARE @QuestionFormatsJson NVARCHAR(MAX) = (
    SELECT
        qf.QuestionFormatID AS QuestionFormatID,
        qf.Name             AS Name,
        UiControl = (
            SELECT TOP 1 m.UiControl
            FROM @UiControlMap m
            WHERE qf.[Name] LIKE m.Pattern
        )
    FROM dbo.QuestionFormats qf
    ORDER BY qf.QuestionFormatID
    FOR JSON PATH
);

DECLARE @SpecificTypesJson NVARCHAR(MAX) = (
    SELECT
        st.SpecificQuestionTypeID AS SpecificQuestionTypeID,
        st.Name                   AS Name
    FROM dbo.SpecificQuestionTypes st
    ORDER BY st.SpecificQuestionTypeID
    FOR JSON PATH
);

-------------------------------------------------------------------------------
-- 5) QuestionnaireTypeRules (scoring thresholds)
-------------------------------------------------------------------------------
DECLARE @QuestionnaireTypeRulesJson NVARCHAR(MAX) = (
    SELECT
        r.QuestionnaireTypeRuleID,
        r.QuestionnaireTypeID,
        r.TotalStatisticalWeightFrom,
        r.TotalStatisticalWeightTo,
        r.FinalRate,
        r.ContractIssuingBlocker,
        r.Suitable,
        r.TariffID
    FROM dbo.QuestionnaireTypeRules r
    WHERE r.QuestionnaireTypeID = @QuestionnaireTypeID
    ORDER BY r.QuestionnaireTypeRuleID
    FOR JSON PATH
);

-------------------------------------------------------------------------------
-- 6) Reference mappings (QuestionnaireTypeReferenceTables + QuestionReferenceColumns)
-------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#RefMap', 'U') IS NOT NULL DROP TABLE #RefMap;
CREATE TABLE #RefMap
(
    TableName NVARCHAR(200) NOT NULL,
    JsonRow   NVARCHAR(MAX) NULL
);

DECLARE @ReferenceMappingsJson NVARCHAR(MAX) = (
    SELECT
        qrc.QuestionID,
        qtrt.QuestionnaireTypeReferenceTableID,
        qtrt.QuestionnaireTypeID,
        qtrt.TableName,
        qrc.ReferenceColumnName
    FROM dbo.QuestionnaireTypeReferenceTables qtrt
    LEFT JOIN dbo.QuestionReferenceColumns qrc
      ON qrc.QuestionnaireTypeReferenceTableID = qtrt.QuestionnaireTypeReferenceTableID
    WHERE qtrt.QuestionnaireTypeID = @QuestionnaireTypeID
    ORDER BY qtrt.TableName, qrc.QuestionID
    FOR JSON PATH
);

-------------------------------------------------------------------------------
-- 7) Reference tables DATA (dynamic export of each referenced table)
-------------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#RefTables', 'U') IS NOT NULL DROP TABLE #RefTables;
CREATE TABLE #RefTables
(
    TableName NVARCHAR(200) NOT NULL PRIMARY KEY,
    Json      NVARCHAR(MAX) NULL
);

INSERT INTO #RefTables(TableName)
SELECT DISTINCT qtrt.TableName
FROM dbo.QuestionnaireTypeReferenceTables qtrt
WHERE qtrt.QuestionnaireTypeID = @QuestionnaireTypeID;

DECLARE @tbl NVARCHAR(200);
DECLARE @sql NVARCHAR(MAX);
DECLARE @json NVARCHAR(MAX);

DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT TableName FROM #RefTables ORDER BY TableName;
OPEN cur;
FETCH NEXT FROM cur INTO @tbl;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Export full table as JSON array.
    -- IMPORTANT: TableName comes from configuration, so keep it controlled/whitelisted in DB.
    SET @sql = N'SET @jsonOUT = (SELECT * FROM dbo.' + QUOTENAME(@tbl) + N' FOR JSON PATH);';
    SET @json = NULL;
    EXEC sp_executesql @sql, N'@jsonOUT NVARCHAR(MAX) OUTPUT', @jsonOUT = @json OUTPUT;

    UPDATE #RefTables
      SET Json = COALESCE(@json, N'[]')
    WHERE TableName = @tbl;

    FETCH NEXT FROM cur INTO @tbl;
END

CLOSE cur;
DEALLOCATE cur;

DECLARE @ReferenceTablesJson NVARCHAR(MAX);
SELECT @ReferenceTablesJson =
    CASE WHEN COUNT(*) = 0 THEN N'{}'
         ELSE N'{' + STRING_AGG(
                    N'"' + REPLACE(TableName, N'"', N'\\"') + N'":' + COALESCE(Json, N'[]'),
                    N','
              ) + N'}'
    END
FROM #RefTables;

-------------------------------------------------------------------------------
-- 7.5) Computed Rules (QuestionComputedConfigs)
-------------------------------------------------------------------------------
DECLARE @RulesJson NVARCHAR(MAX) = (
    SELECT
        qcc.QuestionID             AS questionId,
        cm.Code                    AS kind,
        qcc.MatrixObjectName       AS matrixName,
        qcc.MatrixOutputColumnName AS resultCodeColumn,
        qcc.RuleName               AS ruleName,
        qcc.QuestionComputedConfigID AS ruleId,
        
        -- Infer inputs: Generic logic assumes inputs are children of the computed question.
        -- We explicitly list them for the renderer to bind easily.
        inputQuestionIds = JSON_QUERY((
             SELECT '[' + STRING_AGG(c.QuestionID, ',') 
                -- [v9] Deterministic ordering
                WITHIN GROUP (ORDER BY c.QuestionOrder, c.QuestionID) 
             + ']'
             FROM dbo.Questions c
             WHERE c.ParentQuestionID = qcc.QuestionID
        )),
        
        outputCode = NULL -- Default output if needed
        
    FROM dbo.QuestionComputedConfigs qcc
    JOIN dbo.ComputeMethods cm ON qcc.ComputeMethodID = cm.ComputeMethodID
    -- We filter rules relevant to this QuestionnaireType questions
    WHERE EXISTS (
        SELECT 1 
        FROM dbo.Questionnaires qn 
        WHERE qn.QuestionID = qcc.QuestionID 
          AND qn.QuestionnaireTypeID = @QuestionnaireTypeID
    )
    FOR JSON PATH
);

-------------------------------------------------------------------------------
-- 8) Final JSON document
-------------------------------------------------------------------------------
SELECT
    [Json] =
    (
        SELECT
            meta = JSON_QUERY((
                SELECT
                    schemaVersion        = N'v9_MODEL_27_01_2026',
                    dbModel              = N'WIWA_DB_NEW_MODEL_18_01_2026.sql',
                    generatedAt          = CONVERT(VARCHAR(33), SYSUTCDATETIME(), 126) + 'Z',
                    questionnaireTypeId  = @QuestionnaireTypeID
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            )),

            questionnaire = JSON_QUERY((
                SELECT
                    id                    = @QuestionnaireTypeID,
                    qt.QuestionnaireTypeID AS typeId,
                    qt.Name                AS typeName,
                    qt.Code                AS typeCode,
                    qt.QuestionnaireCategoryID AS questionnaireCategoryId
                FROM dbo.QuestionnaireTypes qt
                WHERE qt.QuestionnaireTypeID = @QuestionnaireTypeID
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            )),

            dictionaries = JSON_QUERY((
                SELECT
                    questionFormats       = JSON_QUERY(COALESCE(@QuestionFormatsJson, N'[]')),
                    specificQuestionTypes = JSON_QUERY(COALESCE(@SpecificTypesJson, N'[]'))
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            )),

            questionnaireTypeRules = JSON_QUERY(COALESCE(@QuestionnaireTypeRulesJson, N'[]')),

            -- Computed Rules
            rules = JSON_QUERY(COALESCE(@RulesJson, N'[]')),

            referenceMappings = JSON_QUERY(COALESCE(@ReferenceMappingsJson, N'[]')),
            referenceTables   = JSON_QUERY(COALESCE(@ReferenceTablesJson, N'{}')),

            questions = JSON_QUERY(COALESCE((
                SELECT
                    JSON_QUERY(r.Json) AS [*]
                FROM #RootQJson r
                ORDER BY r.QuestionOrder, r.QuestionID
                FOR JSON PATH
            ), N'[]'))

        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );
