using Microsoft.EntityFrameworkCore;
using Wiwa.Questionnaire.API.Data;
using Wiwa.Questionnaire.API.Domain;
using Wiwa.Questionnaire.API.DTOs;
using System.Linq;

namespace Wiwa.Questionnaire.API.Services;

public class QuestionnaireService : IQuestionnaireService
{
    private readonly WiwaDbContext _context;

    public QuestionnaireService(WiwaDbContext context)
    {
        _context = context;
    }

    public async Task<List<QuestionTypeDto>> GetQuestionnaireTypesAsync()
    {
        return await _context.QuestionnaireTypes
            .Select(t => new QuestionTypeDto
            {
                QuestionnaireTypeID = t.QuestionnaireTypeID,
                Name = t.Name,
                Code = t.Code
            })
            .ToListAsync();
    }

    public async Task<QuestionnaireSchemaDto?> GetQuestionnaireSchemaAsync(string typeCode)
    {
        // 1. Get Type
        var type = await _context.QuestionnaireTypes
            .FirstOrDefaultAsync(t => t.Code == typeCode);

        if (type == null) return null;

        // 2. Load all root questions for this questionnaire type
        var rootQuestionIds = await _context.Questionnaires
            .Where(qn => qn.QuestionnaireTypeID == type.QuestionnaireTypeID)
            .Select(qn => qn.QuestionID)
            .Distinct() // Avoid duplicates
            .ToListAsync();

        if (!rootQuestionIds.Any()) return new QuestionnaireSchemaDto 
        { 
            Questionnaire = new QuestionMetaDto { TypeId = type.QuestionnaireTypeID, TypeName = type.Name } 
        };

        // 3. Load ALL related questions recursively to handle deep branching (e.g., Level 3+)
        var loadedIds = new HashSet<int>();
        await LoadAllQuestionsRecursiveAsync(rootQuestionIds, loadedIds);

        // 4. Load metadata for roots (they are already in context, but let's ensure navigation is pre-fetched nicely)
        var roots = await _context.Questions
            .Include(q => q.QuestionFormat)
            .Include(q => q.PredefinedAnswers)
                .ThenInclude(pa => pa.SubQuestions)
                    .ThenInclude(link => link.SubQuestion)
            .Where(q => rootQuestionIds.Contains(q.QuestionID))
            .OrderBy(q => q.QuestionOrder)
            .ToListAsync();

        // 5. Identify True Roots (questions that are NOT sub-questions of any answer AND have no ParentQuestionID)
        // Root list should only contain top-level entry points.
        var subQuestionIds = await _context.PredefinedAnswerSubQuestions.Select(x => x.SubQuestionID).ToListAsync();
        var subQuestionIdSet = new HashSet<int>(subQuestionIds);
        
        var trueRoots = roots.Where(q => !subQuestionIdSet.Contains(q.QuestionID) && q.ParentQuestionID == null).ToList();

        var visitedIds = new HashSet<int>();
        var dtos = trueRoots.Select(q => MapQuestion(q, subQuestionIdSet, visitedIds, 0)).Where(q => q != null).ToList();

        var rules = await _context.QuestionComputedConfigs
            .Where(c => c.IsActive && loadedIds.Contains(c.QuestionID))
            .OrderBy(c => c.Priority)
            .ToListAsync();

        // 5b. Fetch inputs for computed rules explicitly
        var computedQuestionIds = rules.Select(r => r.QuestionID).ToList();
        var inputsMap = new Dictionary<int, List<int>>();
        
        if (computedQuestionIds.Any())
        {
            var ruleInputs = await _context.Questions
                .Where(q => q.ParentQuestionID != null && computedQuestionIds.Contains(q.ParentQuestionID.Value))
                .Select(q => new { ParentId = q.ParentQuestionID.Value, ChildId = q.QuestionID, Order = q.QuestionOrder })
                .ToListAsync();

            inputsMap = ruleInputs
                .GroupBy(x => x.ParentId)
                .ToDictionary(g => g.Key, g => g.OrderBy(x => x.Order).Select(x => x.ChildId).ToList());
        }

        var ruleDtos = rules.Select(r => new RuleDto
        {
            RuleId = r.QuestionComputedConfigID,
            QuestionId = r.QuestionID,
            Kind = r.ComputeMethodID == 1 ? "MATRIX_LOOKUP" : (r.ComputeMethodID == 2 ? "FORMULA" : "UNKNOWN"),

            RuleName = r.RuleName,
            MatrixName = r.MatrixObjectName ?? string.Empty,
            ResultCodeColumn = r.MatrixOutputColumnName ?? "Value",
            Formula = r.FormulaExpression,
            InputQuestionIds = ExtractInputsFromFormula(r.FormulaExpression, inputsMap, r.QuestionID),
        }).ToList();

        var schemaDto = new QuestionnaireSchemaDto
        {
            Questionnaire = new QuestionMetaDto { TypeId = type.QuestionnaireTypeID, TypeName = type.Name },
            Questions = dtos,
            Rules = ruleDtos
        };

        // 5c. Load Matrices from Configuration (FormulaExpression)
        foreach (var rule in rules)
        {
            // Check if it's a Matrix Lookup (1) and has JSON content in FormulaExpression
            if (rule.ComputeMethodID == 1 && !string.IsNullOrWhiteSpace(rule.FormulaExpression) && rule.FormulaExpression.TrimStart().StartsWith("{"))
            {
                try 
                {
                    var matrix = System.Text.Json.JsonSerializer.Deserialize<MatrixDto>(rule.FormulaExpression, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (matrix != null) 
                    {
                        schemaDto.Matrices.Add(matrix);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error deserializing matrix from config ID {rule.QuestionComputedConfigID}: {ex.Message}");
                }
            }
        }

        // 6. Load Reference Mappings from database
        var refMappings = await _context.QuestionReferenceColumns
            .Include(r => r.QuestionnaireTypeReferenceTable)
            .Where(r => r.QuestionnaireTypeReferenceTable.QuestionnaireTypeID == type.QuestionnaireTypeID)
            .Select(r => new ReferenceMappingDto
            {
                QuestionId = r.QuestionID,
                TableName = r.QuestionnaireTypeReferenceTable.TableName,
                ReferenceColumnName = r.ReferenceColumnName ?? string.Empty
            })
            .ToListAsync();

        schemaDto.ReferenceMappings = refMappings;

        return schemaDto;
    }



    private async Task LoadAllQuestionsRecursiveAsync(List<int> questionIds, HashSet<int> loadedIds)
    {
        var idsToLoad = questionIds.Distinct().Except(loadedIds).ToList();
        if (!idsToLoad.Any()) return;

        // Fetch this batch
        var questions = await _context.Questions
            .Include(q => q.QuestionFormat)
            .Include(q => q.PredefinedAnswers)
                .ThenInclude(pa => pa.SubQuestions)
                    .ThenInclude(link => link.SubQuestion)
                        .ThenInclude(sq => sq.QuestionFormat)
            .Include(q => q.PredefinedAnswers)
                .ThenInclude(pa => pa.SubQuestions)
                    .ThenInclude(link => link.SubQuestion)
                        .ThenInclude(sq => sq.PredefinedAnswers)
            .Include(q => q.SubQuestions) // Load children (ParentQuestionID relationship)
            .Where(q => idsToLoad.Contains(q.QuestionID))
            .ToListAsync();

        foreach (var id in idsToLoad) loadedIds.Add(id);

        // Collect next level IDs (both from branching and from ParentID hierarchy)
        var nextIds = questions
            .SelectMany(q => q.PredefinedAnswers)
            .SelectMany(pa => pa.SubQuestions)
            .Select(link => link.SubQuestionID)
            .Concat(questions.SelectMany(q => q.SubQuestions).Select(c => c.QuestionID))
            .ToList();

        if (nextIds.Any())
        {
            await LoadAllQuestionsRecursiveAsync(nextIds, loadedIds);
        }
    }

    private QuestionDto MapQuestion(Question q, HashSet<int> subQIds, HashSet<int> visitedIds, int depth)
    {
        if (depth > 20) { Console.WriteLine($"[ERR] Max depth reached at QID {q.QuestionID}"); Console.Out.Flush(); return null!; }
        if (visitedIds.Contains(q.QuestionID)) { return null!; }
        
        visitedIds.Add(q.QuestionID);

        var dto = new QuestionDto
        {
            QuestionID = q.QuestionID,
            QuestionText = q.QuestionText,
            QuestionLabel = q.QuestionLabel,
            QuestionOrder = q.QuestionOrder ?? 0,
            UiControl = MapFormat(q.QuestionFormat?.Code),
            SpecificTypeId = q.SpecificQuestionTypeID,
            ParentQuestionID = q.ParentQuestionID,
            ReadOnly = q.ReadOnly ?? false,
            IsRequired = q.IsRequired ?? false,
            ValidationPattern = q.ValidationPattern
        };

        // Answers
        if (q.PredefinedAnswers.Any())
        {
            dto.Answers = q.PredefinedAnswers
                .OrderBy(a => a.DisplayOrder)
                .Select(a => MapAnswer(a, subQIds, visitedIds, depth + 1))
                .ToList();
        }

        // Children (Always Visible subgroups via ParentQuestionID)
        if (q.SubQuestions.Any())
        {
            dto.Children = q.SubQuestions
                .OrderBy(c => c.QuestionOrder)
                .Select(c => MapQuestion(c, subQIds, visitedIds, depth + 1))
                .Where(c => c != null)
                .ToList();
        }
        
        return dto;
    }

    private AnswerDto MapAnswer(PredefinedAnswer a, HashSet<int> subQIds, HashSet<int> visitedIds, int depth)
    {
        var dto = new AnswerDto
        {
            PredefinedAnswerID = a.PredefinedAnswerID,
            Answer = a.Answer,
            Code = a.Code ?? string.Empty,
            PreSelected = a.PreSelected ?? false
        };

        // Branching
        if (a.SubQuestions.Any())
        {
            // a.SubQuestions is PredefinedAnswerSubQuestion (Link table)
            // We need to fetch the actual Question.
            dto.SubQuestions = a.SubQuestions
                .Select(link => link.SubQuestion)
                .Where(q => q != null) // Safety
                .Select(q => MapQuestion(q, subQIds, visitedIds, depth))
                .Where(q => q != null) // Explicit filter
                .ToList();
        }

        return dto;
    }

    public async Task<string?> EvaluateRuleAsync(int ruleId, Dictionary<int, string> inputs)
    {
        var config = await _context.QuestionComputedConfigs.FindAsync(ruleId);
        if (config == null || !inputs.Any()) return null;

        // MATRIX_LOOKUP
        if (config.ComputeMethodID == 1)
        {
            var tableName = config.MatrixObjectName;
            var outputCol = config.MatrixOutputColumnName;
            
            if (string.IsNullOrEmpty(tableName) || string.IsNullOrEmpty(outputCol)) return null;

            // 1. Get Matrix Columns (Ordered)
            var columns = new List<string>();
            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = @tableName 
                    ORDER BY ORDINAL_POSITION";
                
                var p = cmd.CreateParameter();
                p.ParameterName = "@tableName";
                p.Value = tableName;
                cmd.Parameters.Add(p);

                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var colName = reader.GetString(0);
                        // Exclude PK (Assuming TableID pattern) and Output Column
                        if (!colName.Equals(outputCol, StringComparison.OrdinalIgnoreCase) && 
                            !colName.Equals(tableName + "ID", StringComparison.OrdinalIgnoreCase))
                        {
                            columns.Add(colName);
                        }
                    }
                }
            }

            // 2. Get Input Questions (Ordered by QuestionOrder)
            var inputQIds = inputs.Keys.ToList();
            var questions = await _context.Questions
                .Where(q => inputQIds.Contains(q.QuestionID))
                .OrderBy(q => q.QuestionOrder)
                .ToListAsync();

            if (columns.Count != questions.Count)
            {
                // Fallback: If mismatch, try matching by size or log warning. 
                // For now, assume strict mapping.
                Console.WriteLine($"[EvaluateRule] Column/Input mismatch. Cols: {columns.Count}, Inputs: {questions.Count}");
            }

            // 3. Build Dynamic Query
            var sql = $"SELECT TOP 1 [{outputCol}] FROM [{tableName}] WHERE 1=1";
            var parameters = new List<object>(); // For Dapper or EF raw, but here using ADO explicitly for safety
            
            using (var cmd = connection.CreateCommand())
            {
                for (int i = 0; i < Math.Min(columns.Count, questions.Count); i++)
                {
                    var colName = columns[i];
                    var qId = questions[i].QuestionID;
                    var val = inputs[qId];

                    sql += $" AND [{colName}] = @p{i}";
                    
                    var p = cmd.CreateParameter();
                    p.ParameterName = $"@p{i}";
                    // Attempt to handle both numeric and string IDs
                    if (int.TryParse(val, out int intVal))
                        p.Value = intVal;
                    else
                        p.Value = val;
                    
                    cmd.Parameters.Add(p);
                }

                cmd.CommandText = sql;
                var result = await cmd.ExecuteScalarAsync();
                await connection.CloseAsync();

                return result?.ToString();
            }
        }
        
        // BMI is handled on Frontend usually, but we could support it here too if needed.
        return null;
    }

    private List<int> ExtractInputsFromFormula(string? formula, Dictionary<int, List<int>> inputsMap, int parentQId)
    {
        // 1. If Explicit Formula with {ID} placeholders exists
        if (!string.IsNullOrEmpty(formula))
        {
            var matches = System.Text.RegularExpressions.Regex.Matches(formula, @"\{(\d+)\}");
            if (matches.Count > 0)
            {
                return matches.Select(m => int.Parse(m.Groups[1].Value)).Distinct().ToList();
            }
        }

        // 2. Fallback to classic Parent->Child mapping (for Matrix or old BMI)
        if (inputsMap.ContainsKey(parentQId))
        {
            return inputsMap[parentQId];
        }

        return new List<int>();
    }

    public async Task<List<IdentificatorTypeDto>> GetIdentificatorTypesAsync()
    {
        return await _context.QuestionnaireIdentificatorTypes
            .Select(t => new IdentificatorTypeDto
            {
                QuestionnaireIdentificatorTypeID = t.QuestionnaireIdentificatorTypeID,
                Name = t.Name
            })
            .ToListAsync();
    }

    public async Task SaveMatrixAsync(int questionId, MatrixDto matrix)
    {
        var config = await _context.QuestionComputedConfigs
            .FirstOrDefaultAsync(c => c.QuestionID == questionId);

        if (config == null)
        {
            config = new QuestionComputedConfig
            {
                QuestionID = questionId,
                IsActive = true,
                Priority = 1,
                ComputeMethodID = 1, // MATRIX_LOOKUP
                RuleName = $"Matrix for Q{questionId}",
                MatrixObjectName = matrix.MatrixName ?? "DynamicMatrix",
                MatrixOutputColumnName = matrix.Definition?.ValueColumns?.FirstOrDefault() ?? "Value",
                OutputMode = 1
            };
            _context.QuestionComputedConfigs.Add(config);
        }
        else
        {
            config.ComputeMethodID = 1; // Ensure it's Matrix
            config.MatrixObjectName = matrix.MatrixName ?? "DynamicMatrix";
            // Keep existing RuleName if consistent, or update? Let's just update the matrix fields.
            if (matrix.Definition?.ValueColumns?.Any() == true)
            {
                config.MatrixOutputColumnName = matrix.Definition.ValueColumns.First();
            }
        }

        var json = System.Text.Json.JsonSerializer.Serialize(matrix, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        config.FormulaExpression = json;

        await _context.SaveChangesAsync();
    }

    private string MapFormat(string? code)
    {
        return code?.ToLower() ?? "text";
    }
}
