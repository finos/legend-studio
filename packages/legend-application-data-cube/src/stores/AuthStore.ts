// authStore.ts
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
import { makeAutoObservable } from 'mobx';
import type { UserManagerSettings } from 'oidc-client-ts';

class AuthStore {
  accessToken: string | undefined = undefined;
  userManagerSettings: UserManagerSettings | undefined = undefined;
  constructor() {
    makeAutoObservable(this);
  }
  setAccessToken(token?: string) {
    this.accessToken = token;
  }
  getAccessToken(): string | undefined {
    return this.accessToken;
  }
  setUserManagerSettings(settings?: UserManagerSettings) {
    this.userManagerSettings = this.userManagerSettings;
  }
  getUserManagerSettings(): UserManagerSettings | undefined {
    return this.userManagerSettings;
  }
}

export const authStore = new AuthStore();
