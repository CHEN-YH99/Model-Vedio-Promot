import { http } from './http';
import type {
  DataDeletionRequestPayload,
  DataDeletionRequestResponse,
  DataDeletionStatusResponse,
} from '@/types/account';

export async function createDataDeletionRequestRequest(payload: DataDeletionRequestPayload) {
  const { data } = await http.post<DataDeletionRequestResponse>('/api/account/deletion-request', payload);
  return data;
}

export async function getDataDeletionRequestStatusRequest() {
  const { data } = await http.get<DataDeletionStatusResponse>('/api/account/deletion-request');
  return data;
}

export async function cancelDataDeletionRequestRequest() {
  const { data } = await http.delete<DataDeletionRequestResponse>('/api/account/deletion-request');
  return data;
}
