import { http } from './http';
import type {
  DownloadVideoUrlStatusResponse,
  ParseVideoUrlPayload,
  ParsedVideoUrlResponse,
  StartDownloadVideoUrlResponse,
} from '@/types/url-upload';

export async function parseVideoUrlRequest(payload: ParseVideoUrlPayload) {
  const { data } = await http.post<ParsedVideoUrlResponse>('/api/upload/url', payload);
  return data;
}

export async function startDownloadVideoUrlRequest(payload: ParseVideoUrlPayload) {
  const { data } = await http.post<StartDownloadVideoUrlResponse>('/api/upload/url/download', payload);
  return data;
}

export async function getDownloadVideoUrlStatusRequest(taskId: string) {
  const { data } = await http.get<DownloadVideoUrlStatusResponse>(
    `/api/upload/url/download/${taskId}/status`,
  );
  return data;
}
