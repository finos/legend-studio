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

import { toJS } from 'mobx';

/**
 * Converts MobX observable objects to plain JavaScript objects for use in React components.
 * This helps prevent issues with reference equality in React components that maintain internal state.
 */
export const toJSForReact = <T>(value: T): T => {
  return toJS(value);
};

/**
 * Generates a unique key for a component based on an object's identity.
 * This forces React to recreate the component when the object reference changes.
 */
export const getObjectIdentityKey = (obj: unknown): string => {
  if (!obj || typeof obj !== 'object') {
    return String(obj);
  }
  // Use a combination of properties to create a unique identity
  if ('id' in obj && obj.id) {
    return `id-${String(obj.id)}`;
  }
  if ('name' in obj && obj.name) {
    return `name-${String(obj.name)}-${Date.now()}`;
  }
  // Fallback to timestamp
  return `obj-${Date.now()}`;
};
