namespace Wiwa.Questionnaire.API.Domain;

using System.Collections.Generic;

public class QuestionnaireType
{
    public short QuestionnaireTypeID { get; set; }
    public string Name { get; set; } = string.Empty;
    // Description column does not exist in DB
    // public string Description { get; set; } = string.Empty; 
    public string Code { get; set; } = string.Empty;

    // Navigation
    public ICollection<Questionnaire> Questionnaires { get; set; } = new List<Questionnaire>();
}

public class Questionnaire
{
    public int QuestionnaireID { get; set; }
    public short QuestionnaireTypeID { get; set; }
    public int QuestionID { get; set; }

    // Navigation
    public QuestionnaireType QuestionnaireType { get; set; } = null!;
    public Question Question { get; set; } = null!;
}

public class Question
{
    public int QuestionID { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string? QuestionLabel { get; set; }
    public int? QuestionOrder { get; set; }
    public short? QuestionFormatID { get; set; }
    public int? ParentQuestionID { get; set; }
    public int? SpecificQuestionTypeID { get; set; }
    public bool? ReadOnly { get; set; }
    public bool? IsRequired { get; set; }
    public string? ValidationPattern { get; set; }

    // Navigation
    public QuestionFormat QuestionFormat { get; set; } = null!;
    public ICollection<PredefinedAnswer> PredefinedAnswers { get; set; } = new List<PredefinedAnswer>();
    
    public Question? ParentQuestion { get; set; }
    public ICollection<Question> SubQuestions { get; set; } = new List<Question>();
}

public class SpecificQuestionType
{
    public int SpecificQuestionTypeID { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class QuestionFormat
{
    public short QuestionFormatID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Code { get; set; } = string.Empty;
}

public class PredefinedAnswer
{
    public int PredefinedAnswerID { get; set; }
    public int QuestionID { get; set; }
    public string Answer { get; set; } = string.Empty;
    public string? Code { get; set; }
    public bool? PreSelected { get; set; }
    public decimal? StatisticalWeight { get; set; }
    public int DisplayOrder { get; set; }

    // Navigation
    public Question Question { get; set; } = null!;
    public ICollection<PredefinedAnswerSubQuestion> SubQuestions { get; set; } = new List<PredefinedAnswerSubQuestion>();
}

public class PredefinedAnswerSubQuestion
{
    public int PredefinedAnswerSubQuestionID { get; set; }
    public int PredefinedAnswerID { get; set; }
    public int SubQuestionID { get; set; }

    // Navigation
    public PredefinedAnswer PredefinedAnswer { get; set; } = null!;
    public Question SubQuestion { get; set; } = null!;
}


public class QuestionComputedConfig
{
    public int QuestionComputedConfigID { get; set; }
    public int QuestionID { get; set; }
    public short ComputeMethodID { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string? RuleDescription { get; set; } // Missing before
    public string? MatrixObjectName { get; set; }
    public byte OutputMode { get; set; } // Fixed to byte (tinyint)
    public string? OutputTarget { get; set; } // Missing before
    public string? MatrixOutputColumnName { get; set; }
    public short Priority { get; set; }
    public bool IsActive { get; set; }

    // Navigation
    public Question Question { get; set; } = null!;
}
