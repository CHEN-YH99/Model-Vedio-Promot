import { http } from './http';
import type {
  AnalysisResultResponse,
  AnalysisStartPayload,
  AnalysisStatusResponse,
} from '@/types/analysis';

export async function startAnalysisRequest(payload: AnalysisStartPayload) {
  const { data } = await http.post<{ analysisId: string }>('/api/analysis/start', payload);
  return data;
}

export async function getAnalysisStatusRequest(analysisId: string) {
  const { data } = await http.get<AnalysisStatusResponse>(`/api/analysis/${analysisId}/status`);
  return data;
}

export async function getAnalysisResultRequest(analysisId: string) {
  const { data } = await http.get<AnalysisResultResponse>(`/api/analysis/${analysisId}/result`);
  return data;
}
