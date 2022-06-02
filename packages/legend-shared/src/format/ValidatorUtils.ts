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

import { returnUndefOnError } from '../error/ErrorUtils.js';

const VALID_STRING = /^[\w_][\w_$]*$/u;

export const isValidString = (val: string): boolean =>
  Boolean(val.match(VALID_STRING));

export const isValidJSONString = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isValidUrl = (val: string): boolean =>
  Boolean(returnUndefOnError(() => new URL(val)));
