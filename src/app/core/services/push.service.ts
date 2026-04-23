import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PushStatus =
  | 'unsupported'
  | 'denied'
  | 'not-subscribed'
  | 'subscribing'
  | 'subscribed';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  readonly supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;

  readonly status = signal<PushStatus>(this.initialStatus());

  /** Checa se já há uma subscription ativa e atualiza o signal. */
  async init(): Promise<void> {
    if (!this.supported || this.status() === 'unsupported' || this.status() === 'denied') return;
    try {
      const reg = await this.getRegistration();
      if (!reg) { this.status.set('not-subscribed'); return; }
      const sub = await reg.pushManager.getSubscription();
      this.status.set(sub ? 'subscribed' : 'not-subscribed');
    } catch {
      this.status.set('not-subscribed');
    }
  }

  /** Solicita permissão, cria subscription e registra no backend. */
  async subscribe(): Promise<void> {
    if (!this.supported) return;

    this.status.set('subscribing');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.status.set('denied');
        return;
      }

      const { publicKey } = await lastValueFrom(
        this.http.get<{ publicKey: string }>(`${this.base}/api/v1/push/vapid-key`)
      );

      const reg = await this.registerSW();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const json    = sub.toJSON();
      const device  = this.deviceName();

      await lastValueFrom(
        this.http.post(`${this.base}/api/v1/push/subscribe`, {
          endpoint:   sub.endpoint,
          p256dh:     json.keys?.['p256dh'],
          auth:       json.keys?.['auth'],
          deviceName: device
        })
      );

      await lastValueFrom(
        this.http.post(`${this.base}/api/v1/alerts/config`, {
          type:        'PUSH',
          destination: device
        })
      );

      this.status.set('subscribed');
    } catch {
      // Se falhou depois de pedir permissão, preserva o estado de permissão real
      const perm = Notification.permission;
      this.status.set(perm === 'denied' ? 'denied' : 'not-subscribed');
      throw new Error('Falha ao ativar notificações push.');
    }
  }

  /** Cancela a subscription no browser e remove do backend. */
  async unsubscribe(): Promise<void> {
    if (!this.supported) return;
    try {
      const reg = await this.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!sub) { this.status.set('not-subscribed'); return; }

      await lastValueFrom(
        this.http.delete(`${this.base}/api/v1/push/subscribe`, {
          params: { endpoint: sub.endpoint }
        })
      );

      await sub.unsubscribe();
      this.status.set('not-subscribed');
    } catch {
      throw new Error('Falha ao desativar notificações push.');
    }
  }

  /** Registra o SW se ainda não estiver registrado e aguarda ficar ativo. */
  private async registerSW(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!existing) {
      await navigator.serviceWorker.register('/sw.js');
    }
    return navigator.serviceWorker.ready;
  }

  /** Retorna o registration existente sem registrar um novo. */
  private async getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    return navigator.serviceWorker.getRegistration('/sw.js');
  }

  private initialStatus(): PushStatus {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'denied') return 'denied';
    return 'not-subscribed';
  }

  private deviceName(): string {
    const ua = navigator.userAgent;
    if (/Chrome/.test(ua))  return 'Chrome';
    if (/Firefox/.test(ua)) return 'Firefox';
    if (/Safari/.test(ua))  return 'Safari';
    if (/Edg/.test(ua))     return 'Edge';
    return 'Navegador';
  }
}
