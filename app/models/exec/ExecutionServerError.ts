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

import { serializable, object } from 'serializr';
import { SourceInformation } from 'EXEC/SourceInformation';
import { assertTrue, ApplicationError, isString } from 'Utilities/GeneralUtil';
import { observable, action } from 'mobx';
import { NetworkClientError } from 'API/NetworkClient';

export enum ExecutionServerErrorType {
  COMPILATION = 'COMPILATION',
  PARSER = 'PARSER',
}

/**
 * FIXME: This is a hack. Since the execution server right now does not have a good error reporting strategy, it is hard to know the type of error we
 * get back. So this is a very hacky way to `guess` if the error returned is a compilation error (by confirming that source information is provided in the error)
 */
export const HACKY_isServerResponseCompilationError = (response: unknown): boolean => response instanceof NetworkClientError && !isString(response.payload) && Boolean(response.payload?.sourceInformation);

class ElementCoordinates {
  elementPath: string;
  coordinates: string[];

  constructor(elementPath: string, coordinates: string[]) {
    this.elementPath = elementPath;
    this.coordinates = coordinates;
  }
}

export const getElementCoordinates = (sourceInformation: SourceInformation | undefined): ElementCoordinates | undefined => {
  if (!sourceInformation) { return undefined }
  const elementCoordinateInfo = sourceInformation.sourceId.split('-');
  assertTrue(Boolean(elementCoordinateInfo.length), 'Source ID must be a dash-separated string with the first token being the element path');
  return new ElementCoordinates(elementCoordinateInfo[0], elementCoordinateInfo.slice(1));
};

export class ExecutionServerError extends ApplicationError {
  @serializable @observable message = '';
  @serializable errorType?: ExecutionServerErrorType;
  @serializable(object(SourceInformation)) @observable sourceInformation?: SourceInformation;
  @observable elementCoordinates?: ElementCoordinates;

  @action setSourceInformation(sourceInformation: SourceInformation | undefined): void { this.sourceInformation = sourceInformation }
}

export class ParserError extends ExecutionServerError {
  @serializable errorType = ExecutionServerErrorType.PARSER;
}

export class CompilationError extends ExecutionServerError {
  @serializable errorType = ExecutionServerErrorType.COMPILATION;
}
