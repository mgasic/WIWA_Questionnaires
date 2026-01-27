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
            Kind = r.ComputeMethodID == 2 ? "BMI_CALC" : (r.ComputeMethodID == 1 ? "MATRIX_LOOKUP" : "UNKNOWN"),
            RuleName = r.RuleName,
            MatrixName = r.MatrixObjectName ?? string.Empty,
            ResultCodeColumn = r.MatrixOutputColumnName ?? "Value",
            InputQuestionIds = r.ComputeMethodID == 2 && inputsMap.ContainsKey(r.QuestionID)
                ? inputsMap[r.QuestionID]
                : new List<int>()
        }).ToList();

        return new QuestionnaireSchemaDto
        {
            Questionnaire = new QuestionMetaDto { TypeId = type.QuestionnaireTypeID, TypeName = type.Name },
            Questions = dtos,
            Rules = ruleDtos
        };
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

    private string MapFormat(string? code)
    {
        return code?.ToLower() ?? "text";
    }
}
