// API Response Types
export interface QuestionnaireType {
    questionnaireTypeID: number;
    name: string;
    code: string;
    questionnaireCount?: number;
}
/**
 * Response from /api/Flow/GetFlow/{id}
 */
export interface FlowResponse {
    questionnaireTypeName: string;
    questionnaireTypeID: number;
    existingQuestionnaireIdentificatorTypeID?: number | null;
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export interface QuestionnaireIdentificatorType {
    questionnaireIdentificatorTypeID: number;
    name: string;
}

export interface QuestionFormat {
    questionFormatID: number;
    name: string;
}

export interface SpecificQuestionType {
    specificQuestionTypeID: number;
    name: string;
    code: string;
}

// Flow Types
export interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: FlowNodeData;
}

export interface FlowNodeData {
    label?: string;
    questionText?: string;
    questionLabel?: string;
    questionOrder?: number;
    questionFormat?: string;
    questionFormatID?: number;
    specificQuestionTypeID?: number;
    isRequired?: boolean;
    readOnly?: boolean;
    validationPattern?: string;
    isChild?: boolean; // Auto-detected from edges
    childType?: 'parent-child' | 'subquestion' | null; // Type of child relationship

    // Answer data
    answerText?: string;
    code?: string;
    isPreSelected?: boolean;
    statisticalWeight?: number;
    displayOrder?: number;

    // Computed config
    isComputed?: boolean;
    computeMethodID?: number;
    ruleName?: string;
    ruleDescription?: string;
    matrixObjectName?: string;
    outputMode?: number;
    outputTarget?: string;
    matrixOutputColumnName?: string;
    formulaExpression?: string;
    priority?: number;
    isActive?: boolean;

    // Reference table
    referenceTable?: string;
    referenceColumn?: string;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
}

export interface SaveFlowData {
    nodes: FlowNode[];
    edges: FlowEdge[];
    questionnaireTypeName: string;
    questionnaireTypeCode?: string;
    existingQuestionnaireTypeID?: number;
    questionnaireIdentificatorTypeName: string;
    existingQuestionnaireIdentificatorTypeID?: number;
    isUpdate?: boolean;
}

export interface MatrixDefinitionDto {
    keyColumns: string[];
    valueColumns: string[];
}

export interface MatrixDto {
    matrixName: string;
    definition: MatrixDefinitionDto;
    data: Record<string, any>[];
}
