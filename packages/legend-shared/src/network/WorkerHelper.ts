/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export function registerServiceWorker(): void {
  console.log('helo');
  console.log(navigator);
  if ('serviceWorker' in navigator) {
    window.addEventListener(
      'load',
      () =>
        navigator.serviceWorker
          .register('./service-worker.js')
          .then((reg) => {
            // eslint-disable-next-line no-console
            console.log('1');
            console.debug('registerServiceWorker', 'registered', reg.scope);
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.log(error);
            console.debug('registerServiceWorker', 'error', error);
          }),
      { once: true },
    );
  }
}

/**
 * @param {string|undefined} [clientUrl]
 * @returns {Promise<ServiceWorker | undefined>}
 */
export function getServiceWorker(
  clientUrl?: string | undefined,
): Promise<ServiceWorker | undefined> {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(
      new Error('Service worker is not available; HTTPS protocol is required.'),
    );
  }

  return navigator.serviceWorker.getRegistration(clientUrl).then((reg) => {
    if (reg === undefined) {
      return undefined;
    }
    const pending = reg.installing || reg.waiting;
    if (pending === null) {
      return undefined;
    }

    return (
      reg.active ||
      new Promise((resolve) => {
        const listener = (): void => {
          if (pending.state === 'activated') {
            pending.removeEventListener('statechange', listener);
            resolve(reg.active ?? undefined);
          }
        };
        pending.addEventListener('statechange', listener);
      })
    );
  });
}
