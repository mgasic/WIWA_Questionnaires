import axios from 'axios';
import type { Question } from '../types/api';

const API_BASE_URL = 'http://localhost:5238/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const questionsService = {
    getAll: async (): Promise<Question[]> => {
        const response = await apiClient.get<Question[]>('/questions');
        return response.data;
    },

    getById: async (id: number): Promise<Question> => {
        const response = await apiClient.get<Question>(`/questions/${id}`);
        return response.data;
    },

    create: async (question: Partial<Question>): Promise<Question> => {
        const response = await apiClient.post<Question>('/questions', question);
        return response.data;
    },

    update: async (id: number, question: Partial<Question>): Promise<void> => {
        await apiClient.put(`/questions/${id}`, question);
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/questions/${id}`);
    },
};
