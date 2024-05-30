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

import { SourceInformation, type ParserError } from '@finos/legend-graph';
import { uuid } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export class DataCubeQueryEditorState {
  uuid = uuid();
  query: string;
  parserError?: ParserError | undefined;

  constructor(query: string) {
    makeObservable(this, {
      query: observable,
      parserError: observable,
      setQuery: action,
      setParserError: action,
    });

    this.query = query;
  }

  setQuery(val: string): void {
    this.query = val;
  }

  setParserError(parserError: ParserError | undefined): void {
    // account for the lambda prefix offset in source information
    if (parserError?.sourceInformation) {
      parserError.sourceInformation = this.processSourceInformation(
        parserError.sourceInformation,
      );
    }
    this.parserError = parserError;
  }

  processSourceInformation(
    sourceInformation: SourceInformation,
  ): SourceInformation {
    const { sourceId, startLine, startColumn, endLine, endColumn } =
      sourceInformation;
    const lineOffset = 0;
    const columnOffset = 0;
    return new SourceInformation(
      sourceId,
      startLine + lineOffset,
      startColumn - (startLine === 1 ? columnOffset : 0),
      endLine + lineOffset,
      endColumn - (endLine === 1 ? columnOffset : 0),
    );
  }
}
