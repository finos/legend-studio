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

import { hashValue } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { createModelSchema, primitive } from 'serializr';
import type { ExecutionError } from './ExecutionError.js';

export const trimPathLeadingSlash = (path: string): string =>
  path.startsWith('/') ? path.substring(1, path.length) : path;

export class File {
  content!: string;
  RO!: boolean;

  constructor() {
    makeObservable(this, {
      content: observable,
      hashCode: computed,
      setContent: action,
    });
  }

  setContent(value: string): void {
    this.content = value;
  }

  get hashCode(): string {
    return hashValue(this.content);
  }
}

createModelSchema(File, {
  content: primitive(),
  RO: primitive(),
});

export class FileCoordinate {
  readonly file: string;
  readonly line: number;
  readonly column: number;

  constructor(file: string, line: number, column: number) {
    this.file = file;
    this.line = line;
    this.column = column;
  }
}

export class FileErrorCoordinate extends FileCoordinate {
  readonly error: ExecutionError;

  constructor(
    file: string,
    line: number | undefined,
    column: number | undefined,
    error: ExecutionError,
  ) {
    super(file, line ?? 1, column ?? 1);

    this.error = error;
  }
}

export interface FileData {
  path: string;
  code: string;
}
