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

import { observable, action, computed, makeObservable } from 'mobx';
import { uuid } from '@finos/legend-studio-shared';
import { SourceInformation } from '../../../models/metamodels/pure/action/SourceInformation';
import type {
  ParserError,
  CompilationError,
} from '../../../models/metamodels/pure/action/EngineError';

/**
 * This is not strictly meant for lambda. The idea is to create an editor that allows
 * editing _something_ but allows user to edit via text.
 */
export abstract class LambdaEditorState {
  uuid = uuid();
  lambdaPrefix: string;
  lambdaString: string; // value shown in lambda editor which can be edited
  parserError?: ParserError;
  compilationError?: CompilationError;

  constructor(lambdaString: string, lambdaPrefix: string) {
    makeObservable(this, {
      lambdaString: observable,
      parserError: observable,
      compilationError: observable,
      fullLambdaString: computed,
      setLambdaString: action,
      clearErrors: action,
      setCompilationError: action,
      setParserError: action,
    });

    this.lambdaString = lambdaString;
    this.lambdaPrefix = lambdaPrefix;
  }

  // value shown in lambda editor with the prefix, used to send to the server to transformation from text to JSON
  get fullLambdaString(): string {
    return `${this.lambdaPrefix}${this.lambdaString}`;
  }

  setLambdaString(val: string): void {
    this.lambdaString = val;
  }

  clearErrors(): void {
    this.setCompilationError(undefined);
    this.setParserError(undefined);
  }

  setCompilationError(compilationError: CompilationError | undefined): void {
    // account for the lambda prefix offset in source information
    if (compilationError?.sourceInformation) {
      compilationError.setSourceInformation(
        this.processSourceInformation(compilationError.sourceInformation),
      );
    }
    this.compilationError = compilationError;
  }

  setParserError(parserError: ParserError | undefined): void {
    // account for the lambda prefix offset in source information
    if (parserError?.sourceInformation) {
      parserError.setSourceInformation(
        this.processSourceInformation(parserError.sourceInformation),
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
    const columnOffset = this.lambdaPrefix.length;
    return new SourceInformation(
      sourceId,
      startLine + lineOffset,
      startColumn - (startLine === 1 ? columnOffset : 0),
      endLine + lineOffset,
      endColumn - (endLine === 1 ? columnOffset : 0),
    );
  }

  extractLambdaString(fullLambdaString: string): string {
    return fullLambdaString.substring(
      fullLambdaString.indexOf(this.lambdaPrefix) + this.lambdaPrefix.length,
      fullLambdaString.length,
    );
  }

  abstract convertLambdaGrammarStringToObject(): Promise<void>;
  abstract convertLambdaObjectToGrammarString(pretty: boolean): Promise<void>;
}
