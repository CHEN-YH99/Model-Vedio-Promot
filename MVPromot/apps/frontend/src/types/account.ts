export type DataDeletionStatus = 'PENDING' | 'COMPLETED' | 'CANCELED' | 'FAILED';

export interface DataDeletionRequestPayload {
  reason?: string;
}

export interface DataDeletionRequestResponse {
  requestId: string;
  status: DataDeletionStatus;
  requestedAt: string;
  executeAfter: string;
  processedAt: string | null;
  failureReason: string | null;
  reason: string | null;
  alreadyPending?: boolean;
}

export interface DataDeletionStatusResponse {
  request: DataDeletionRequestResponse | null;
}
