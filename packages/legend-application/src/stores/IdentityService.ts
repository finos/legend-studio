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

import { action, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

const UNKNOWN_USER_ID = '(unknown)';

export class IdentityService {
  readonly applicationStore: GenericLegendApplicationStore;

  currentUser = UNKNOWN_USER_ID;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      currentUser: observable,
      setCurrentUser: action,
    });

    this.applicationStore = applicationStore;
  }

  get isAnonymous(): boolean {
    return this.currentUser === UNKNOWN_USER_ID;
  }

  setCurrentUser(val: string): void {
    this.currentUser = val;
  }
}
