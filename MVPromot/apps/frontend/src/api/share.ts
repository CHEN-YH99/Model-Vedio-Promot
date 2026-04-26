import { http } from './http';
import type { SharedAnalysisResultResponse } from '@/types/analysis';

export async function getSharedAnalysisResultRequest(token: string) {
  const { data } = await http.get<SharedAnalysisResultResponse>(`/api/share/${token}`);
  return data;
}
