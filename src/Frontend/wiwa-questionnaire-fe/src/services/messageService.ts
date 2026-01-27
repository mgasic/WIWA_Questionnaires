export interface WiwaInitPayload {
    questionnaireType: string; // The code of the questionnaire type (e.g. 'GREAT_QUEST')
    questionnaireId?: number; // Optional: ID for loading saved state (future use)
    contextData?: Record<string, any>; // Optional: Arbitrary host context
}

export interface WiwaOutputPayload {
    questionnaireType: string;
    answers: Record<string, any>;
    isComplete: boolean;
}

export const MSG_TYPES = {
    INIT: 'WIWA_INIT',
    COMPLETE: 'WIWA_COMPLETE',
    RESIZE: 'WIWA_RESIZE',
    READY: 'WIWA_READY'
} as const;

export const sendToHost = (type: string, payload: any) => {
    // Check if we are actually in an iframe
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, payload }, '*');
    } else {
        // Debug logging for standalone mode
        console.debug(`[WiwaEmbedded] Outgoing Message: ${type}`, payload);
    }
};
