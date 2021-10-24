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

import { observable, computed, makeObservable, action } from 'mobx';
import {
  addUniqueEntry,
  deleteEntry,
  guaranteeType,
  hashArray,
} from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../ESService_ModelUtils';
import { ServiceStoreElement } from './ServiceStoreElement';
import { ServiceParameter } from './ServiceParameter';
import type { SecurityScheme } from './SecurityScheme';
import type { TypeReference, ComplexTypeReference } from './TypeReference';

export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST',
}

export class ServiceStoreService
  extends ServiceStoreElement
  implements Hashable
{
  requestBody?: TypeReference | undefined;
  method!: HTTP_METHOD;
  parameters: ServiceParameter[] = [];
  response!: ComplexTypeReference;
  security: SecurityScheme[] = [];

  constructor() {
    super();

    makeObservable(this, {
      requestBody: observable,
      method: observable,
      parameters: observable,
      response: observable,
      security: observable,
      setRequestBody: action,
      setMethod: action,
      addParameter: action,
      deleteParameter: action,
      setResponse: action,
      addSecurity: action,
      deleteSecurity: action,
      hashCode: computed,
    });
  }

  setRequestBody(value: TypeReference): void {
    this.requestBody = value;
  }

  setMethod(value: HTTP_METHOD): void {
    this.method = value;
  }

  addParameter(value: ServiceParameter): void {
    addUniqueEntry(this.parameters, value);
  }

  deleteParameter(value: ServiceParameter): void {
    deleteEntry(this.parameters, value);
  }

  setResponse(value: ComplexTypeReference): void {
    this.response = value;
  }

  addSecurity(value: SecurityScheme): void {
    addUniqueEntry(this.security, value);
  }

  deleteSecurity(value: SecurityScheme): void {
    deleteEntry(this.security, value);
  }

  getParameter = (value: string): ServiceParameter =>
    guaranteeType(
      this.parameters.find(
        (parameter: ServiceParameter): ServiceParameter | undefined => {
          if (parameter.name === value) {
            return parameter;
          }
          return undefined;
        },
      ),
      ServiceParameter,
      `Can't find service parameter '${value}'`,
    );

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE,
      super.hashCode,
      this.requestBody ?? '',
      this.method,
      hashArray(this.parameters),
      this.response,
      hashArray(this.security),
    ]);
  }
}
