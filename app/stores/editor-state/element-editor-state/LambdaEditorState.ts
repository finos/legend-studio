/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { ParserError, CompilationError } from 'EXEC/ExecutionServerError';
import { RenderStyle } from 'EXEC/grammar/RenderStyle';
import { uuid } from 'Utilities/GeneralUtil';
import { SourceInformation } from 'EXEC/SourceInformation';

export abstract class LambdaEditorState {
  uuid = uuid();
  lambdaPrefix: string;
  @observable lambdaString: string; // value shown in lambda editor which can be editted
  @observable parserError?: ParserError;
  @observable compilationError?: CompilationError;

  constructor(lambdaString: string, lambdaPrefix: string) {
    this.lambdaString = lambdaString;
    this.lambdaPrefix = lambdaPrefix;
  }

  // value shown in lambda editor with the prefix, used to send to the server to transformation from text to JSON
  @computed get fullLambdaString(): string { return `${this.lambdaPrefix}${this.lambdaString}` }

  @action setLambdaString(val: string): void { this.lambdaString = val }

  @action clearErrors(): void {
    this.setCompilationError(undefined);
    this.setParserError(undefined);
  }

  @action setCompilationError(compilationError: CompilationError | undefined): void {
    // account for the lambda prefix offset in source information
    if (compilationError?.sourceInformation) {
      compilationError.setSourceInformation(this.processSourceInformation(compilationError.sourceInformation));
    }
    this.compilationError = compilationError;
  }

  @action setParserError(parserError: ParserError | undefined): void {
    // account for the lambda prefix offset in source information
    if (parserError?.sourceInformation) {
      parserError.setSourceInformation(this.processSourceInformation(parserError.sourceInformation));
    }
    this.parserError = parserError;
  }

  processSourceInformation(sourceInformation: SourceInformation): SourceInformation {
    const { sourceId, startLine, startColumn, endLine, endColumn } = sourceInformation;
    const lineOffset = 0;
    const columnOffset = this.lambdaPrefix.length;
    return new SourceInformation(sourceId,
      startLine + lineOffset,
      startColumn - (startLine === 1 ? columnOffset : 0),
      endLine + lineOffset,
      endColumn - (endLine === 1 ? columnOffset : 0)
    );
  }

  extractLambdaString(fullLambdaString: string): string { return fullLambdaString.substring(fullLambdaString.indexOf(this.lambdaPrefix) + this.lambdaPrefix.length, fullLambdaString.length) }

  abstract convertLambdaGrammarStringToObject(): Promise<void>;
  abstract convertLambdaObjectToGrammarString(renderStyle: RenderStyle): Promise<void>;
}
