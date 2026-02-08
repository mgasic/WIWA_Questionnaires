using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Wiwa.Questionnaire.API.Data;
using Wiwa.Questionnaire.API.Domain;

namespace Wiwa.Admin.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionsController : ControllerBase
{
    private readonly WiwaDbContext _context;
    private readonly ILogger<QuestionsController> _logger;

    public QuestionsController(WiwaDbContext context, ILogger<QuestionsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/Questions
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Question>>> GetQuestions()
    {
        return await _context.Questions
            .Include(q => q.QuestionFormat)
            .Include(q => q.ParentQuestion)
            .Include(q => q.PredefinedAnswers)
            .ToListAsync();
    }

    // GET: api/Questions/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Question>> GetQuestion(int id)
    {
        var question = await _context.Questions
            .Include(q => q.QuestionFormat)
            .Include(q => q.ParentQuestion)
            .Include(q => q.PredefinedAnswers)
            .FirstOrDefaultAsync(q => q.QuestionID == id);

        if (question == null)
        {
            return NotFound();
        }

        return question;
    }

    // POST: api/Questions
    [HttpPost]
    public async Task<ActionResult<Question>> CreateQuestion(Question question)
    {
        _context.Questions.Add(question);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuestion), new { id = question.QuestionID }, question);
    }

    // PUT: api/Questions/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestion(int id, Question question)
    {
        if (id != question.QuestionID)
        {
            return BadRequest();
        }

        _context.Entry(question).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!QuestionExists(id))
            {
                return NotFound();
            }
            throw;
        }

        return NoContent();
    }

    // DELETE: api/Questions/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuestion(int id)
    {
        var question = await _context.Questions.FindAsync(id);
        if (question == null)
        {
            return NotFound();
        }

        _context.Questions.Remove(question);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/Questions/5/matrix
    [HttpPost("{id}/matrix")]
    public async Task<IActionResult> SaveMatrix(int id, [FromBody] Wiwa.Admin.API.DTOs.AdminMatrixDto matrix)
    {
        var question = await _context.Questions
            .Include(q => q.QuestionComputedConfigs)
            .FirstOrDefaultAsync(q => q.QuestionID == id);

        if (question == null)
        {
            return NotFound();
        }

        // Logic: Find the computed config to update. 
        // For now, we update the first active one, or create new if none.
        // Or if the matrix name matches?
        // Let's assume one matrix per question for now as per requirement context.

        var config = question.QuestionComputedConfigs.FirstOrDefault();
        if (config == null)
        {
            // If no config exists, we should probably create one, but that requires more info (rule name etc)
            // However, the frontend usually creates a default config when "IsComputed" is checked?
            // If not, we can create a basic one.
            config = new QuestionComputedConfig
            {
                QuestionID = id,
                IsActive = true,
                Priority = 1,
                RuleName = matrix.MatrixName ?? "Matrix Rule",
                OutputMode = 1, // Default or derive
                ComputeMethodID = 2 // Assuming 2 is Matrix Lookup based on earlier analysis?
            };
            _context.QuestionComputedConfigs.Add(config);
        }

        // Update Matrix details
        if (!string.IsNullOrEmpty(matrix.MatrixName))
        {
            config.MatrixObjectName = matrix.MatrixName;
        }

        // Serialize MatrixDto to FormulaExpression
        // We need System.Text.Json
        config.FormulaExpression = System.Text.Json.JsonSerializer.Serialize(matrix);

        await _context.SaveChangesAsync();

        return Ok(config);
    }

    private bool QuestionExists(int id)
    {
        return _context.Questions.Any(e => e.QuestionID == id);
    }
}
