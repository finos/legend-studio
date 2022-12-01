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
import { createModelSchema, primitive } from 'serializr';

export const trimPathLeadingSlash = (path: string): string =>
  path.startsWith('/') ? path.substring(1, path.length) : path;

export class PureFile {
  content!: string;

  constructor() {
    makeObservable(this, {
      content: observable,
      setContent: action,
    });
  }

  setContent(value: string): void {
    this.content = value;
  }
}

createModelSchema(PureFile, {
  content: primitive(),
});

export class FileCoordinate {
  file: string;
  line: number;
  column: number;
  errorMessage?: string | undefined; // we might need to support different level of severity like warning

  constructor(
    file: string,
    line: number,
    column: number,
    errorMessage?: string,
  ) {
    makeObservable(this, {
      file: observable,
      line: observable,
      column: observable,
      errorMessage: observable,
      setErrorMessage: action,
    });

    this.file = file;
    this.line = line;
    this.column = column;
    this.errorMessage = errorMessage;
  }

  setErrorMessage(value: string | undefined): void {
    this.errorMessage = value;
  }
}

export interface FileData {
  path: string;
  code: string;
}
