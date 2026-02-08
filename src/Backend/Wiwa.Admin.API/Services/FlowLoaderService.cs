using Microsoft.EntityFrameworkCore;
using Wiwa.Admin.API.DTOs;
using Wiwa.Questionnaire.API.Data;
using Wiwa.Questionnaire.API.Domain;

namespace Wiwa.Admin.API.Services;

public interface IFlowLoaderService
{
    Task<FlowDto?> LoadFlowAsync(int questionnaireTypeId);
}

public class FlowLoaderService : IFlowLoaderService
{
    private readonly WiwaDbContext _context;
    private readonly ILogger<FlowLoaderService> _logger;

    public FlowLoaderService(WiwaDbContext context, ILogger<FlowLoaderService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<FlowDto?> LoadFlowAsync(int questionnaireTypeId)
    {
        // 1. Find all Questionnaire entries for this type (Multiple Roots)
        var questionnaires = await _context.Questionnaires
            .Include(q => q.QuestionnaireType)
            .Where(q => q.QuestionnaireTypeID == questionnaireTypeId)
            .ToListAsync();

        if (!questionnaires.Any())
        {
            // If no questionnaire entry, check if type exists anyway
            var qType = await _context.QuestionnaireTypes.FirstOrDefaultAsync(t => t.QuestionnaireTypeID == questionnaireTypeId);
            if (qType == null) return null;

            return new FlowDto
            {
                QuestionnaireTypeName = qType.Name,
                QuestionnaireTypeID = qType.QuestionnaireTypeID,
                Nodes = new List<FlowNodeDto>(),
                Edges = new List<FlowEdgeDto>()
            };
        }

        // 2. Load Layouts
        var layouts = await _context.FlowLayouts
            .Where(l => l.QuestionnaireTypeID == (short)questionnaireTypeId)
            .ToListAsync();

        var firstQ = questionnaires.First();

        var flowDto = new FlowDto
        {
            QuestionnaireTypeName = firstQ.QuestionnaireType.Name,
            QuestionnaireTypeID = firstQ.QuestionnaireTypeID,
            Nodes = new List<FlowNodeDto>(),
            Edges = new List<FlowEdgeDto>()
        };

        // Try to find the linked identifcator type
        try
        {
            var mapping = await _context.QuestionnaireByQuestionnaireIdentificators
                .Include(x => x.QuestionnaireIdentificator)
                    .ThenInclude(xi => xi.QuestionnaireIdentificatorType)
                .FirstOrDefaultAsync(x => x.QuestionnaireTypeID == questionnaireTypeId);
            
            if (mapping != null)
            {
                flowDto.ExistingQuestionnaireIdentificatorTypeID = mapping.QuestionnaireIdentificator.QuestionnaireIdentificatorTypeID;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading QuestionnaireIdentificator mapping for QuestionnaireTypeID {QuestionnaireTypeId}. SQL Error: {Message}", questionnaireTypeId, ex.Message);
            // Continue without the identificator type - it's optional
        }

        var visitedQuestions = new HashSet<int>();
        var queue = new Queue<(int questionId, string? childType, int depth, double parentX)>();

        // Seed queue with all root questions
        int rootIndex = 0;
        foreach (var qRecord in questionnaires)
        {
            if (!visitedQuestions.Contains(qRecord.QuestionID))
            {
                // Root questions start at Y=50, X staggered by 600
                queue.Enqueue((qRecord.QuestionID, null, 0, rootIndex * 600)); 
                visitedQuestions.Add(qRecord.QuestionID);
                rootIndex++;
            }
        }

        while (queue.Count > 0)
        {
            var (currentQId, childType, depth, parentX) = queue.Dequeue();

            var question = await _context.Questions
                .Include(q => q.PredefinedAnswers)
                    .ThenInclude(pa => pa.SubQuestions)
                .Include(q => q.SubQuestions)
                .Include(q => q.QuestionReferenceColumns)
                    .ThenInclude(qrc => qrc.QuestionnaireTypeReferenceTable)
                .Include(q => q.QuestionComputedConfigs)
                .FirstOrDefaultAsync(q => q.QuestionID == currentQId);

            if (question == null) continue;

            // 3. Map Question Node
            var qNodeId = $"q-{question.QuestionID}";
            var qNode = MapQuestionToNode(question, qNodeId);
            
            // Set childType for color coding
            qNode.Data.ChildType = childType;
            qNode.Data.IsChild = childType != null;

            // Apply Layout if exists
            var layout = layouts.FirstOrDefault(l => l.ElementType == "Question" && l.ElementID == qNodeId);
            if (layout != null)
            {
                qNode.Position.X = layout.PositionX;
                qNode.Position.Y = layout.PositionY;
            }
            else if (qNode.Position.X == 0 && qNode.Position.Y == 0)
            {
                qNode.Position.X = parentX;
                qNode.Position.Y = depth * 400 + 50;
            }

            flowDto.Nodes.Add(qNode);

            // 4. Handle Answers
            double answerStep = 200;
            double totalAnswerWidth = (question.PredefinedAnswers.Count - 1) * answerStep;
            int answerIndex = 0;

            foreach (var answer in question.PredefinedAnswers.OrderBy(a => a.DisplayOrder))
            {
                var aNodeId = $"a-{answer.PredefinedAnswerID}";
                var aNode = MapAnswerToNode(answer, aNodeId);
                
                // Position answer relative to question if not set
                var aLayout = layouts.FirstOrDefault(l => l.ElementType == "Answer" && l.ElementID == aNodeId);
                if (aLayout != null)
                {
                    aNode.Position.X = aLayout.PositionX;
                    aNode.Position.Y = aLayout.PositionY;
                }
                else if (aNode.Position.X == 0 && aNode.Position.Y == 0)
                {
                    double xOffset = (answerIndex * answerStep) - (totalAnswerWidth / 2.0);
                    aNode.Position.X = qNode.Position.X + xOffset;
                    aNode.Position.Y = qNode.Position.Y + 180;
                }
                answerIndex++;
                
                flowDto.Nodes.Add(aNode);
                
                var qAnswerEdgeId = $"e-{qNodeId}-{aNodeId}";
                var qAnswerEdge = new FlowEdgeDto
                {
                    Id = qAnswerEdgeId,
                    Source = qNodeId,
                    Target = aNodeId,
                    Type = "smoothstep",
                    SourceHandle = GetBottomHandle(answerIndex, question.PredefinedAnswers.Count),
                    TargetHandle = "top"
                };

                // Restore Edge Handles
                var qAnswerELayout = layouts.FirstOrDefault(l => l.ElementType == "Edge" && l.ElementID == qAnswerEdgeId);
                if (qAnswerELayout?.Metadata != null)
                {
                    try {
                        var handles = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(qAnswerELayout.Metadata);
                        if (handles.TryGetProperty("SourceHandle", out var sh)) qAnswerEdge.SourceHandle = sh.GetString();
                        if (handles.TryGetProperty("TargetHandle", out var th)) qAnswerEdge.TargetHandle = th.GetString();
                    } catch {}
                }

                flowDto.Edges.Add(qAnswerEdge);

                // Answer -> SubQuestions (Branching - Orange)
                int sqIndex = 0;
                foreach (var pasq in answer.SubQuestions)
                {
                    var targetQId = pasq.SubQuestionID;
                    var targetNodeId = $"q-{targetQId}";

                    var sqEdgeId = $"e-{aNodeId}-{targetNodeId}";
                    var sqEdge = new FlowEdgeDto
                    {
                        Id = sqEdgeId,
                        Source = aNodeId,
                        Target = targetNodeId,
                        Type = "smoothstep",
                        SourceHandle = GetBottomHandle(sqIndex, answer.SubQuestions.Count),
                        TargetHandle = "top"
                    };

                    // Restore Edge Handles
                    var sqELayout = layouts.FirstOrDefault(l => l.ElementType == "Edge" && l.ElementID == sqEdgeId);
                    if (sqELayout?.Metadata != null)
                    {
                        try {
                            var handles = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(sqELayout.Metadata);
                            if (handles.TryGetProperty("SourceHandle", out var sh)) sqEdge.SourceHandle = sh.GetString();
                            if (handles.TryGetProperty("TargetHandle", out var th)) sqEdge.TargetHandle = th.GetString();
                        } catch {}
                    }

                    flowDto.Edges.Add(sqEdge);

                    if (!visitedQuestions.Contains(targetQId))
                    {
                        visitedQuestions.Add(targetQId);
                        // Subquestions from answers go DIRECTLY below the answer
                        // If multiple subquestions for one answer, we stagger them slightly horizontally
                        double sqX = aNode.Position.X + (sqIndex * 250); 
                        queue.Enqueue((targetQId, "subquestion", depth + 1, sqX)); 
                        sqIndex++;
                    }
                }
            }

            // 5. Direct Question -> Question (Parent-Child - Purple)
            int childIndex = 0;
            foreach (var subQ in question.SubQuestions.OrderBy(sq => sq.QuestionOrder))
            {
                var targetQId = subQ.QuestionID;
                var targetNodeId = $"q-{targetQId}";

                var nextEdgeId = $"e-group-{qNodeId}-{targetNodeId}";
                var nextEdge = new FlowEdgeDto
                {
                    Id = nextEdgeId,
                    Source = qNodeId,
                    Target = targetNodeId,
                    Label = "Next",
                    Type = "smoothstep",
                    SourceHandle = "bottom",
                    TargetHandle = "top"
                };

                // Restore Edge Handles
                var nextELayout = layouts.FirstOrDefault(l => l.ElementType == "Edge" && l.ElementID == nextEdgeId);
                if (nextELayout?.Metadata != null)
                {
                    try {
                        var handles = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(nextELayout.Metadata);
                        if (handles.TryGetProperty("SourceHandle", out var sh)) nextEdge.SourceHandle = sh.GetString();
                        if (handles.TryGetProperty("TargetHandle", out var th)) nextEdge.TargetHandle = th.GetString();
                    } catch {}
                }

                flowDto.Edges.Add(nextEdge);

                if (!visitedQuestions.Contains(targetQId))
                {
                    visitedQuestions.Add(targetQId);
                    // Direct children go below the question
                    // We offset them further horizontally if multiple to avoid overlapping subquestions from answers
                    double childX = qNode.Position.X + (childIndex * 400); 
                    queue.Enqueue((targetQId, "parent-child", depth + 1, childX));
                    childIndex++;
                }
            }
        }

        return flowDto;
    }

    private FlowNodeDto MapQuestionToNode(Question q, string nodeId)
    {
        // Resolve Reference Table/Column
        string? refTable = null;
        string? refColumn = null;
        var refData = q.QuestionReferenceColumns.FirstOrDefault();
        if (refData != null)
        {
            refTable = refData.QuestionnaireTypeReferenceTable?.TableName;
            refColumn = refData.ReferenceColumnName;
        }

        // Resolve Computed Config
        var compConfig = q.QuestionComputedConfigs.FirstOrDefault();

        return new FlowNodeDto
        {
            Id = nodeId,
            Type = "questionNode", 
            Position = new FlowPositionDto { X = 0, Y = 0 }, 
            Data = new FlowNodeDataDto
            {
                QuestionText = q.QuestionText,
                QuestionLabel = q.QuestionLabel,
                QuestionOrder = q.QuestionOrder ?? 0,
                QuestionFormatID = q.QuestionFormatID,
                SpecificQuestionTypeID = q.SpecificQuestionTypeID,
                ReadOnly = q.ReadOnly,
                IsRequired = q.IsRequired,
                ValidationPattern = q.ValidationPattern,
                
                // Reference Data
                ReferenceTable = refTable,
                ReferenceColumn = refColumn,

                // Computed
                IsComputed = compConfig != null,
                RuleName = compConfig?.RuleName,
                MatrixObjectName = compConfig?.MatrixObjectName,
                MatrixOutputColumnName = compConfig?.MatrixOutputColumnName,
                FormulaExpression = compConfig?.FormulaExpression,
                OutputTarget = compConfig?.OutputTarget,
                
                // Generic visual props
                Label = q.QuestionLabel ?? (q.QuestionText.Length > 20 ? q.QuestionText.Substring(0, 20) + "..." : q.QuestionText)
            }
        };
    }

    private FlowNodeDto MapAnswerToNode(PredefinedAnswer a, string nodeId)
    {
        return new FlowNodeDto
        {
            Id = nodeId,
            Type = "answerNode",
            Position = new FlowPositionDto { X = 0, Y = 0 },
            Data = new FlowNodeDataDto
            {
                AnswerText = a.Answer,
                Code = a.Code,
                StatisticalWeight = a.StatisticalWeight,
                IsPreSelected = a.PreSelected,
                DisplayOrder = a.DisplayOrder,
                Label = a.Answer
            }
        };
    }

    private string GetBottomHandle(int index, int total)
    {
        if (total <= 1) return "bottom";
        
        int[] available = { 5, 20, 35, 50, 65, 80, 95 };
        double step = 90.0 / (total - 1);
        int target = (int)(5 + index * step);
        
        int closest = available.OrderBy(x => System.Math.Abs(x - target)).First();
        
        if (closest == 50) return "bottom";
        return $"bottom-{closest}";
    }
}
