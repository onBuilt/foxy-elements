import { API, Graph } from '@foxy.io/sdk/customer';

import { API as CoreAPI } from '@foxy.io/sdk/core';
import { FetchEvent } from '../../public/NucleonElement/FetchEvent';

export class DemoAPI extends CoreAPI<Graph> {
  static AuthError = API.AuthError;

  static SESSION = '@foxy.io/elements::session';

  static BASE = 'https://demo.foxycart.com/s/customer';

  static readonly FetchEvent = FetchEvent;

  constructor(target: EventTarget) {
    super({
      base: new URL(DemoAPI.BASE),
      fetch: (...args: Parameters<Window['fetch']>): Promise<Response> =>
        new Promise<Response>((resolve, reject) => {
          const request = new API.WHATWGRequest(...args);
          const session = localStorage.getItem(DemoAPI.SESSION);

          request.headers.set('Content-Type', 'application/json');
          request.headers.set('FOXY-API-VERSION', '1');

          if (session) {
            const token = JSON.parse(session).session_token;
            request.headers.set('Authorization', `Bearer ${token}`);
          }

          const event = new FetchEvent('fetch', {
            cancelable: true,
            composed: true,
            bubbles: true,
            request,
            resolve,
            reject,
          });

          target.dispatchEvent(event);
          if (!event.defaultPrevented) fetch(request).then(resolve).catch(reject);
        }),
    });
  }

  async signOut(): Promise<void> {
    const response = await this.fetch(`${DemoAPI.BASE}/authenticate`, { method: 'DELETE' });
    if (!response.ok) throw new DemoAPI.AuthError({ code: 'UNKNOWN' });
    localStorage.removeItem(DemoAPI.SESSION);
  }

  async signIn(credential: Record<'email' | 'password', string>): Promise<void> {
    const response = await this.fetch(`${DemoAPI.BASE}/authenticate`, {
      method: 'POST',
      body: JSON.stringify(credential),
    });

    if (response.status === 401) throw new DemoAPI.AuthError({ code: 'UNAUTHORIZED' });
    if (!response.ok) throw new DemoAPI.AuthError({ code: 'UNKNOWN' });

    localStorage.setItem(DemoAPI.SESSION, await response.text());
  }

  async sendPasswordResetEmail(detail: Record<'email', string>): Promise<void> {
    const response = await this.fetch(`${DemoAPI.BASE}/forgot_password`, {
      method: 'POST',
      body: JSON.stringify(detail),
    });

    if (!response.ok) throw new DemoAPI.AuthError({ code: 'UNKNOWN' });
  }
}
