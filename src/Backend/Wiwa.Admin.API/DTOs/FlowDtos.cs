namespace Wiwa.Admin.API.DTOs;

public class FlowDto
{
    public string QuestionnaireTypeName { get; set; } = string.Empty;
    public int QuestionnaireTypeID { get; set; }
    public int? ExistingQuestionnaireIdentificatorTypeID { get; set; }
    public List<FlowNodeDto> Nodes { get; set; } = new();
    public List<FlowEdgeDto> Edges { get; set; } = new();
}

public class FlowNodeDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public FlowPositionDto Position { get; set; } = new();
    public FlowNodeDataDto Data { get; set; } = new();
}

public class FlowPositionDto
{
    public double X { get; set; }
    public double Y { get; set; }
}

public class FlowNodeDataDto
{
    public string? Label { get; set; }
    public string? QuestionText { get; set; }
    public string? QuestionLabel { get; set; }
    public int? QuestionOrder { get; set; }
    public string? QuestionFormat { get; set; }
    public short? QuestionFormatID { get; set; }
    public int? SpecificQuestionTypeID { get; set; }
    public bool? IsRequired { get; set; }
    public bool? ReadOnly { get; set; }
    public string? ValidationPattern { get; set; }
    public bool? IsChild { get; set; }
    public string? ChildType { get; set; }
    
    // Answer node data
    public string? AnswerText { get; set; }
    public string? Code { get; set; }
    public bool? IsPreSelected { get; set; }
    public decimal? StatisticalWeight { get; set; }
    public int? DisplayOrder { get; set; }
    
    // Computed config
    public bool? IsComputed { get; set; }
    public short? ComputeMethodID { get; set; }
    public string? RuleName { get; set; }
    public string? RuleDescription { get; set; }
    public string? MatrixObjectName { get; set; }
    public byte? OutputMode { get; set; }
    public string? OutputTarget { get; set; }
    public string? MatrixOutputColumnName { get; set; }
    public string? FormulaExpression { get; set; }
    public short? Priority { get; set; }
    public bool? IsActive { get; set; }
    
    // Reference table/column
    public string? ReferenceTable { get; set; }
    public string? ReferenceColumn { get; set; }
}

public class FlowEdgeDto
{
    public string Id { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? SourceHandle { get; set; }
    public string? TargetHandle { get; set; }
    public string? Type { get; set; }
    public string? Label { get; set; }
}

public class SaveFlowDto
{
    public List<FlowNodeDto> Nodes { get; set; } = new();
    public List<FlowEdgeDto> Edges { get; set; } = new();
    
    // Metadata
    public string QuestionnaireTypeName { get; set; } = string.Empty;
    public string? QuestionnaireTypeCode { get; set; }
    public short? ExistingQuestionnaireTypeID { get; set; }
    public bool IsUpdate { get; set; }
    
    public string QuestionnaireIdentificatorTypeName { get; set; } = string.Empty;
    public int? ExistingQuestionnaireIdentificatorTypeID { get; set; }
}

public class SaveFlowResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int? QuestionnaireID { get; set; }
    public short? QuestionnaireTypeID { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class AdminMatrixDefinitionDto
{
    public List<string> KeyColumns { get; set; } = new();
    public List<string> ValueColumns { get; set; } = new();
}

public class AdminMatrixDto
{
    public string MatrixName { get; set; } = string.Empty;
    public AdminMatrixDefinitionDto Definition { get; set; } = new();
    public List<Dictionary<string, object>> Data { get; set; } = new();
}
