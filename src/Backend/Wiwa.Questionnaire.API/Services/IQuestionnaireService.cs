using Wiwa.Questionnaire.API.DTOs;

namespace Wiwa.Questionnaire.API.Services;

public interface IQuestionnaireService
{
    Task<QuestionnaireSchemaDto?> GetQuestionnaireSchemaAsync(string typeCode);
    Task<List<QuestionTypeDto>> GetQuestionnaireTypesAsync();
}
