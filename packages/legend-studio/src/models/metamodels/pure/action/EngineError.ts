/**
 * Copyright 2020 Goldman Sachs
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

import { assertTrue, ApplicationError } from '@finos/legend-studio-shared';
import { observable, action, makeObservable } from 'mobx';
import type { SourceInformation } from '../action/SourceInformation';

class ElementCoordinates {
  elementPath: string;
  coordinates: string[];

  constructor(elementPath: string, coordinates: string[]) {
    this.elementPath = elementPath;
    this.coordinates = coordinates;
  }
}

export const getElementCoordinates = (
  sourceInformation: SourceInformation | undefined,
): ElementCoordinates | undefined => {
  if (!sourceInformation) {
    return undefined;
  }
  const elementCoordinateInfo = sourceInformation.sourceId.split('-');
  assertTrue(
    Boolean(elementCoordinateInfo.length),
    'Source ID must be a dash-separated string with the first token being the element path',
  );
  return new ElementCoordinates(
    elementCoordinateInfo[0],
    elementCoordinateInfo.slice(1),
  );
};

export class EngineError extends ApplicationError {
  sourceInformation?: SourceInformation;

  // TODO: remove this since we should have an MM equivalent
  constructor() {
    super();
    makeObservable(this, {
      message: observable,
      sourceInformation: observable,
      setSourceInformation: action,
    });
  }

  setSourceInformation(sourceInformation: SourceInformation | undefined): void {
    this.sourceInformation = sourceInformation;
  }
}

export class ParserError extends EngineError {}

export class CompilationError extends EngineError {}
