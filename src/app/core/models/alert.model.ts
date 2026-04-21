export type AlertType = 'EMAIL' | 'PUSH';
export type AlertStatus = 'SENT' | 'FAILED';

export interface AlertResponse {
  id: string;
  productName: string;
  type: AlertType;
  destination: string;
  status: AlertStatus;
  triggeredAt: string;
}

export interface AlertConfigResponse {
  id: string;
  type: AlertType;
  destination: string;
  active: boolean;
}

export interface AlertConfigRequest {
  type: AlertType;
  destination: string;
}
