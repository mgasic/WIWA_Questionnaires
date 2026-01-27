namespace Wiwa.Questionnaire.API.DTOs;

public class QuestionnaireSchemaDto
{
    public required QuestionMetaDto Questionnaire { get; set; }
    public List<QuestionDto> Questions { get; set; } = new();
    public List<RuleDto> Rules { get; set; } = new();

}

public class RuleDto
{
    public int RuleId { get; set; }
    public int QuestionId { get; set; } // The question getting the computed value
    public string Kind { get; set; } = string.Empty; // e.g. "BMI_CALC"
    public string RuleName { get; set; } = string.Empty;
    public string MatrixName { get; set; } = string.Empty;
    public string ResultCodeColumn { get; set; } = string.Empty;
    
    // For now, input questions are derived or matrix-based? 
    // Usually rules need inputs. For BMI (9000), inputs are 9100 and 9200 (Height/Weight).
    // The InputQuestionIds logic is not in the SQL table `QuestionComputedConfigs`.
    // It might be inferred by parent/child or hardcoded logic.
    // However, I will add this property for now as list.
    public List<int> InputQuestionIds { get; set; } = new();
}


public class QuestionTypeDto
{
    public short QuestionnaireTypeID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class QuestionMetaDto
{
    public short TypeId { get; set; }
    public string TypeName { get; set; } = string.Empty;
}

public class QuestionDto
{
    public int QuestionID { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string? QuestionLabel { get; set; }
    public string UiControl { get; set; } = string.Empty; // Mapped from Format
    public int QuestionOrder { get; set; }
    public int? ParentQuestionID { get; set; }
    public int? SpecificTypeId { get; set; } // 1=Always, 2=Conditional
    public bool ReadOnly { get; set; }
    public bool IsRequired { get; set; }
    public string? ValidationPattern { get; set; }

    public List<AnswerDto> Answers { get; set; } = new();
    public List<QuestionDto> Children { get; set; } = new(); // Always visible children (ParentQuestionID)
}

public class AnswerDto
{
    public int PredefinedAnswerID { get; set; }
    public string Answer { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool PreSelected { get; set; }
    
    // For SubQuestions (Branching)
    public List<QuestionDto> SubQuestions { get; set; } = new();
}
