export interface SyncStatusResponse {
  lastSyncAt: string;
  lastCreated: number;
  lastUpdated: number;
  lastCritical: number;
  lastRecovered: number;
}
