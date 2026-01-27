using Microsoft.AspNetCore.Mvc;
using Wiwa.Questionnaire.API.DTOs;
using Wiwa.Questionnaire.API.Services;

namespace Wiwa.Questionnaire.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionnaireController : ControllerBase
{
    private readonly IQuestionnaireService _service;

    public QuestionnaireController(IQuestionnaireService service)
    {
        _service = service;
    }

    [HttpGet("types")]
    public async Task<ActionResult<List<QuestionTypeDto>>> GetTypes()
    {
        var result = await _service.GetQuestionnaireTypesAsync();
        return Ok(result);
    }

    [HttpGet("schema/{typeCode}")]
    public async Task<ActionResult<QuestionnaireSchemaDto>> GetSchema(string typeCode)
    {
        var result = await _service.GetQuestionnaireSchemaAsync(typeCode);
        if (result == null) return NotFound($"Questionnaire type '{typeCode}' not found.");
        return Ok(result);
    }
}
