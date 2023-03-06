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

/**
 * The interface defined here can be extended to browsers like `electron`
 * because it supports storing the user preferences in the form of key
 * value pairs. https://www.npmjs.com/package/electron-store
 */
interface ApplicationStorage {
  /**
   * Sets the value of an item with the given value
   */
  setItem(key: string, value: string): void;

  /**
   * Gets the value of a given item in the storage
   */
  getItem(key: string): string | null;

  /**
   * Checks if an item is present in the storage
   */
  hasItem(key: string): boolean;

  /**
   * Removes the given item stored
   */
  removeItem(key: string): void;

  /**
   * Clears all the key value pairs stored
   */
  clear(): void;
}

export class LocalStorage implements ApplicationStorage {
  private get localStorage(): Storage {
    return guaranteeNonNullable(
      window.localStorage,
      `'window.localStorage' object is not available in non-web environment`,
    );
  }

  setItem(key: string, value: string): void {
    this.localStorage.setItem(key, value);
  }

  getItem(key: string): string | null {
    return this.localStorage.getItem(key);
  }

  removeItem(key: string): void {
    this.localStorage.removeItem(key);
  }

  clear(): void {
    this.localStorage.clear();
  }

  hasItem(key: string): boolean {
    return this.localStorage.hasItem(key);
  }
}
