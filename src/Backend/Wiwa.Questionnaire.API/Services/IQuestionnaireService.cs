using Wiwa.Questionnaire.API.DTOs;

namespace Wiwa.Questionnaire.API.Services;

public interface IQuestionnaireService
{
    Task<QuestionnaireSchemaDto?> GetQuestionnaireSchemaAsync(string typeCode);
    Task<List<QuestionTypeDto>> GetQuestionnaireTypesAsync();
    Task<string?> EvaluateRuleAsync(int ruleId, Dictionary<int, string> inputs);
    Task<List<IdentificatorTypeDto>> GetIdentificatorTypesAsync();
    Task SaveMatrixAsync(int questionId, MatrixDto matrix);
}
