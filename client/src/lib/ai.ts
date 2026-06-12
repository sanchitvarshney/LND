import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** Whether the server has an AI key configured (drives graceful fallbacks). */
export function useAiStatus() {
  const { data } = useQuery({
    queryKey: ['aiStatus'],
    queryFn: async () => (await api.get('/ai/status')).data.data as { enabled: boolean },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return { enabled: !!data?.enabled, known: data !== undefined };
}

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

export async function askModuleAssistant(moduleId: string, question: string, history: AiChatMessage[]) {
  const r = await api.post(`/ai/modules/${moduleId}/chat`, { question, history });
  return r.data.data.answer as string;
}

export async function getReviewPlan(attemptId: string) {
  const r = await api.post(`/ai/attempts/${attemptId}/review-plan`);
  return r.data.data.plan as string;
}

export async function generateQuestions(assessmentId: string, count = 5, sourceText?: string) {
  const r = await api.post(`/ai/assessments/${assessmentId}/generate-questions`, { count, sourceText });
  return r.data.data.questions as any[];
}

export async function getComplianceDigest() {
  const r = await api.get('/ai/digest');
  return r.data.data as { digest: string; generatedAt: string };
}
