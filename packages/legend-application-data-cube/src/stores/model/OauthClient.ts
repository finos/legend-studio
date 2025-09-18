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

import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  UserManager,
  type UserManagerSettings,
  type User,
} from 'oidc-client-ts';

export class OAuthClient {
  private userManager: UserManager;
  private user: User | null = null;

  constructor(config: UserManagerSettings) {
    this.userManager = new UserManager(config);
  }

  /** Login via popup */
  async loginWithPopup(): Promise<void> {
    this.user = await this.userManager.signinPopup();
  }

  /** Logout via popup */
  async logoutWithPopup(): Promise<void> {
    await this.userManager.signoutPopup();
    this.user = null;
  }

  /** Get current token, refresh if needed */
  public async getToken(): Promise<string> {
    // 1️⃣ Try to get existing user
    this.user = this.user ?? (await this.userManager.getUser());

    // 2️⃣ If user exists and token valid
    if (this.user) {
      const exp = this.user.expires_at ? this.user.expires_at * 1000 : 0;
      if (Date.now() < exp - 10 * 60 * 1000) {
        return this.user.access_token;
      }

      // Token expiring soon → refresh silently
      this.user = await this.userManager.signinSilent();
      return guaranteeNonNullable(this.user?.access_token);
    }

    this.user = await this.userManager.signinPopup();
    return this.user.access_token;
  }
}
