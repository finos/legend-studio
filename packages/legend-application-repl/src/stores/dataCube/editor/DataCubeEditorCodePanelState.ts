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

import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { DataCubeState } from '../DataCubeState.js';
import {
  HttpStatus,
  NetworkClientError,
  assertErrorThrown,
  uuid,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  ParserError,
  SourceInformation,
  V1_ParserError,
} from '@finos/legend-graph';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

class DataCubeQueryEditorState {
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

export class DataCubeEditorCodePanelState {
  readonly dataCube!: DataCubeState;
  readonly editor: DataCubeEditorState;

  queryEditorState!: DataCubeQueryEditorState;
  currentSubQuery?: string | undefined;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      currentSubQuery: observable,
      queryEditorState: observable,
      setCurrentSubQuery: action,
      parseQuery: flow,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.queryEditorState = new DataCubeQueryEditorState('');
  }

  setCurrentSubQuery(val: string | undefined): void {
    this.currentSubQuery = val;
  }

  *parseQuery(): GeneratorFn<void> {
    try {
      this.queryEditorState.setParserError(undefined);
      yield flowResult(
        this.dataCube.repl.client.parseQuery({
          code: `|${this.queryEditorState.query}`,
        }),
      );
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        const protocol = V1_ParserError.serialization.fromJson(
          error.payload as PlainObject<V1_ParserError>,
        );
        const parserError = new ParserError(protocol.message);
        if (protocol.sourceInformation) {
          parserError.sourceInformation = new SourceInformation(
            protocol.sourceInformation.sourceId,
            protocol.sourceInformation.startLine,
            protocol.sourceInformation.startColumn,
            protocol.sourceInformation.endLine,
            protocol.sourceInformation.endColumn,
          );
        }
        this.queryEditorState.setParserError(parserError);
      }
    }
  }

  // async getTypeaheadResults(
  //   position: IPosition,
  //   model: monacoEditorAPI.ITextModel,
  // ): Promise<monacoLanguagesAPI.CompletionItem[]> {
  //   try {
  //     const textUntilPosition = model.getValueInRange({
  //       startLineNumber: 1,
  //       startColumn: 1,
  //       endLineNumber: position.lineNumber,
  //       endColumn: position.column,
  //     });
  //     const resultObj =
  //       await this.editorStore.client.getTypeaheadResults(textUntilPosition);
  //     const result = resultObj.map((res) =>
  //       CompletionItem.serialization.fromJson(res),
  //     );
  //     const currentWord = model.getWordUntilPosition(position);
  //     return result.map((res) => ({
  //       label: res.display,
  //       kind: monacoLanguagesAPI.CompletionItemKind.Text,
  //       range: {
  //         startLineNumber: position.lineNumber,
  //         startColumn: currentWord.startColumn + 1,
  //         endLineNumber: position.lineNumber,
  //         endColumn: currentWord.endColumn + 1,
  //       },
  //       insertText: res.completion,
  //     })) as monacoLanguagesAPI.CompletionItem[];
  //   } catch (e) {
  //     return [];
  //   }
  // }
}
