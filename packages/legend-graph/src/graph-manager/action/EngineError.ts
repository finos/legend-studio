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

import { ApplicationError } from '@finos/legend-shared';
import type { SourceInformation } from '../action/SourceInformation.js';
import { makeObservable, observable } from 'mobx';

export class EngineError extends ApplicationError {
  sourceInformation?: SourceInformation | undefined;
  trace?: string | undefined;
}

export class ParserError extends EngineError {}

export class CompilationError extends EngineError {
  constructor(message: string | undefined) {
    super(message);
    makeObservable(this, {
      sourceInformation: observable,
    });
  }
}

export class ExternalFormatError extends CompilationError {}
