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

import { observable, action, computed, makeObservable, flow } from 'mobx';
import { type GeneratorFn, uuid } from '@finos/legend-shared';
import {
  type ParserError,
  type CompilationError,
  SourceInformation,
  CodeCompletionResult,
} from '@finos/legend-graph';

/**
 * This is not strictly meant for lambda. The idea is to create an editor that allows
 * editing _something_ but allows user to edit via text.
 */
export abstract class LambdaEditorState {
  readonly uuid = uuid();

  lambdaPrefix: string;
  lambdaString: string; // value shown in lambda editor which can be edited
  parserError?: ParserError | undefined;
  compilationError?: CompilationError | undefined;
  typeAheadEnabled = false;

  constructor(
    lambdaString: string,
    lambdaPrefix: string,
    options?: { typeAheadEnabled?: boolean | undefined },
  ) {
    makeObservable(this, {
      lambdaString: observable,
      parserError: observable,
      compilationError: observable,
      typeAheadEnabled: observable,
      lambdaId: computed,
      fullLambdaString: computed,
      setLambdaString: action,
      setTypeAhead: action,
      clearErrors: action,
      setCompilationError: action,
      setParserError: action,
      convertLambdaGrammarStringToObject: flow,
      convertLambdaObjectToGrammarString: flow,
    });

    this.lambdaString = lambdaString;
    this.lambdaPrefix = lambdaPrefix;
    this.typeAheadEnabled = options?.typeAheadEnabled ?? false;
  }

  abstract get lambdaId(): string;

  // value shown in lambda editor with the prefix, used to send to the server to transformation from text to JSON
  get fullLambdaString(): string {
    return `${this.lambdaPrefix}${this.lambdaString}`;
  }

  setLambdaString(val: string): void {
    this.lambdaString = val;
  }

  setTypeAhead(val: boolean): void {
    this.typeAheadEnabled = val;
  }

  clearErrors(options?: {
    preserveCompilationError?: boolean | undefined;
  }): void {
    this.setParserError(undefined);
    if (options?.preserveCompilationError && this.compilationError) {
      this.compilationError.sourceInformation = undefined;
    } else {
      this.setCompilationError(undefined);
    }
  }

  setCompilationError(compilationError: CompilationError | undefined): void {
    // account for the lambda prefix offset in source information
    if (compilationError?.sourceInformation) {
      compilationError.sourceInformation = this.processSourceInformation(
        compilationError.sourceInformation,
      );
    }
    this.compilationError = compilationError;
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

  abstract convertLambdaGrammarStringToObject(): GeneratorFn<void>;
  abstract convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void>;

  async getCodeComplete(input: string): Promise<CodeCompletionResult> {
    return Promise.resolve(new CodeCompletionResult());
  }
}
