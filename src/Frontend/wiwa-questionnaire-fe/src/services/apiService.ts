import axios from 'axios';
import type { QuestionnaireSchemaDto, QuestionTypeDto, QuestionnaireSubmissionDto, IdentificatorTypeDto } from '../types/api';

const API_BASE_URL = 'http://localhost:5000/api'; // Correct port for Questionnaire Backend

export const questionnaireApi = {
    getSchema: async (typeCode: string): Promise<QuestionnaireSchemaDto> => {
        const response = await axios.get<QuestionnaireSchemaDto>(`${API_BASE_URL}/Questionnaire/schema/${typeCode}`);
        return response.data;
    },
    getTypes: async (): Promise<QuestionTypeDto[]> => {
        const response = await axios.get<QuestionTypeDto[]>(`${API_BASE_URL}/Questionnaire/types`);
        return response.data;
    },
    getIdentificatorTypes: async (): Promise<IdentificatorTypeDto[]> => {
        const response = await axios.get<IdentificatorTypeDto[]>(`${API_BASE_URL}/Questionnaire/identificator-types`);
        return response.data;
    },
    evaluateRule: async (ruleId: number, inputs: Record<number, string>): Promise<{ value: string | null }> => {
        // Convert input map to generic dictionary if needed, but JS object works usually for JSON
        const response = await axios.post<{ value: string | null }>(`${API_BASE_URL}/Questionnaire/evaluate-rule`, {
            ruleId,
            inputs
        });
        return response.data;
    },
    submitQuestionnaire: async (submission: QuestionnaireSubmissionDto): Promise<{ message: string, instanceID: number }> => {
        const response = await axios.post<{ message: string, instanceID: number }>(`${API_BASE_URL}/QuestionnaireSubmission`, submission);
        return response.data;
    },
    updateQuestionnaire: async (submission: QuestionnaireSubmissionDto): Promise<{ message: string, instanceID: number }> => {
        const response = await axios.put<{ message: string, instanceID: number }>(`${API_BASE_URL}/QuestionnaireSubmission`, submission);
        return response.data;
    },
    getExistingSubmission: async (typeId: number, idTypeId: number, idValue: string): Promise<QuestionnaireSubmissionDto | null> => {
        try {
            const response = await axios.get<QuestionnaireSubmissionDto>(`${API_BASE_URL}/QuestionnaireSubmission/existing/${typeId}/${idTypeId}/${idValue}`);
            return response.data;
        } catch (err) {
            return null;
        }
    }
};
