export interface QuestionnaireSchemaDto {
    questionnaire: QuestionMetaDto;
    questions: QuestionDto[];
    rules?: RuleDto[];
}

export interface RuleDto {
    ruleId: number;
    questionId: number;
    kind: string; // BMI_CALC, MATRIX_LOOKUP
    ruleName: string;
    inputQuestionIds: number[];
}

export interface QuestionTypeDto {
    questionnaireTypeID: number;
    name: string;
    code: string;
}

export interface QuestionMetaDto {
    typeId: number;
    typeName: string;
}

export interface QuestionDto {
    questionID: number;
    questionText: string;
    questionLabel?: string;
    uiControl: string; // 'radio', 'checkbox', 'text', 'input'
    questionOrder: number;
    readOnly: boolean;
    isRequired: boolean;
    validationPattern?: string;

    answers: AnswerDto[];
    children: QuestionDto[];
}

export interface AnswerDto {
    predefinedAnswerID: number;
    answer: string;
    code: string;
    preSelected: boolean;

    subQuestions: QuestionDto[];
}

// Internal State for Renderer
export interface QuestionnaireState {
    [questionId: number]: {
        value?: string; // For text inputs
        selectedAnswerIds?: number[]; // For radio/checkbox
    }
}
