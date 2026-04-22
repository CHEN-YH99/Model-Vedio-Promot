import { http } from './http';
import type {
  DownloadVideoUrlResponse,
  ParseVideoUrlPayload,
  ParsedVideoUrlResponse,
} from '@/types/url-upload';

export async function parseVideoUrlRequest(payload: ParseVideoUrlPayload) {
  const { data } = await http.post<ParsedVideoUrlResponse>('/api/upload/url', payload);
  return data;
}

export async function downloadVideoUrlRequest(payload: ParseVideoUrlPayload) {
  const { data } = await http.post<DownloadVideoUrlResponse>('/api/upload/url/download', payload);
  return data;
}
