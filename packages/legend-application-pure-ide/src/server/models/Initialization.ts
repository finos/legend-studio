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

import { createModelSchema, deserialize, list, primitive } from 'serializr';

export interface InitializationActivity {
  archiveLocked: boolean;
  initializing: boolean;
  text: string;
}

export interface ConceptActivity {
  initializing: boolean;
  text: string;
}

export class InitializationResult {
  cached?: boolean;
  datamarts?: string[];
  text?: string;
}

createModelSchema(InitializationResult, {
  cached: primitive(),
  datamarts: list(primitive()),
  text: primitive(),
});

export class InitializationFailureResult extends InitializationResult {
  declare cached?: boolean;
  declare datamarts?: string[];
  declare text?: string;
  error!: boolean;
  sessionError?: string;
}

createModelSchema(InitializationFailureResult, {
  cached: primitive(),
  datamarts: list(primitive()),
  text: primitive(),
  error: primitive(),
  sessionError: primitive(),
});

export class InitializationFailureWithSourceResult extends InitializationFailureResult {
  declare cached?: boolean;
  declare datamarts?: string[];
  declare text?: string;
  RO!: boolean;
  line!: number;
  column!: number;
  source!: string;
  declare error: boolean;
  declare sessionError?: string;
}

createModelSchema(InitializationFailureWithSourceResult, {
  cached: primitive(),
  datamarts: list(primitive()),
  text: primitive(),
  RO: primitive(),
  line: primitive(),
  column: primitive(),
  source: primitive(),
  error: primitive(),
  sessionError: primitive(),
});

export const deserializeInitializationnResult = (
  value: Record<PropertyKey, unknown>,
): InitializationResult => {
  if (value.error) {
    if (value.source) {
      return deserialize(InitializationFailureWithSourceResult, value);
    }
    return deserialize(InitializationFailureResult, value);
  }
  return deserialize(InitializationResult, value);
};
