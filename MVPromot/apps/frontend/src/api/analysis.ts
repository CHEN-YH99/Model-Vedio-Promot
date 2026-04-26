import { http } from './http';
import type {
  AnalysisDeleteResponse,
  AnalysisExportFormat,
  AnalysisFrameMutationResponse,
  AnalysisHistoryResponse,
  AnalysisQuotaResponse,
  AnalysisResultResponse,
  AnalysisShareCreateResponse,
  AnalysisStartPayload,
  AnalysisStatusResponse,
  PromptLanguage,
  PromptPlatform,
  UpdateFramePromptPayload,
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

export async function updateFramePromptRequest(
  analysisId: string,
  frameId: string,
  payload: UpdateFramePromptPayload,
) {
  const { data } = await http.put<AnalysisFrameMutationResponse>(
    `/api/analysis/${analysisId}/frames/${frameId}/prompt`,
    payload,
  );

  return data;
}

export async function regenerateFramePromptRequest(analysisId: string, frameId: string) {
  const { data } = await http.post<AnalysisFrameMutationResponse>(
    `/api/analysis/${analysisId}/frames/${frameId}/regenerate`,
  );

  return data;
}

function parseFilenameFromDisposition(contentDisposition: string | undefined) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const fallbackMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return fallbackMatch?.[1] ?? null;
}

export async function exportAnalysisRequest(input: {
  analysisId: string;
  format: AnalysisExportFormat;
  platform?: PromptPlatform;
  language?: PromptLanguage;
}) {
  const { analysisId, format, platform, language } = input;
  const params = new URLSearchParams();
  params.set('format', format);

  if (platform) {
    params.set('platform', platform);
  }

  if (language) {
    params.set('language', language);
  }

  const response = await http.get<Blob>(`/api/analysis/${analysisId}/export?${params.toString()}`, {
    responseType: 'blob',
  });

  return {
    blob: response.data,
    fileName:
      parseFilenameFromDisposition(response.headers['content-disposition']) ??
      `analysis-${analysisId}.${format}`,
  };
}

export async function createAnalysisShareRequest(analysisId: string) {
  const { data } = await http.post<AnalysisShareCreateResponse>(`/api/analysis/${analysisId}/share`);
  return data;
}

export async function getAnalysisQuotaRequest() {
  const { data } = await http.get<AnalysisQuotaResponse>('/api/analysis/quota');
  return data;
}

export async function getAnalysisHistoryRequest(input: { page: number; limit: number }) {
  const params = new URLSearchParams();
  params.set('page', String(input.page));
  params.set('limit', String(input.limit));

  const { data } = await http.get<AnalysisHistoryResponse>(`/api/analysis/history?${params.toString()}`);
  return data;
}

export async function deleteAnalysisRequest(analysisId: string) {
  const { data } = await http.delete<AnalysisDeleteResponse>(`/api/analysis/${analysisId}`);
  return data;
}
