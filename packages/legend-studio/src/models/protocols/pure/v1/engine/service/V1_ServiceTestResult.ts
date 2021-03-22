/**
 * Copyright Goldman Sachs
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

import { createModelSchema, primitive } from 'serializr';
import {
  guaranteeNonNullable,
  SerializationFactory,
} from '@finos/legend-studio-shared';

import { ServiceTestResult } from '../../../../../metamodels/pure/action/service/ServiceTestResult';

export class V1_ServiceTestResult {
  name!: string;
  result!: boolean;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ServiceTestResult, {
      name: primitive(),
      result: primitive(),
    }),
  );

  build(): ServiceTestResult {
    const result = new ServiceTestResult();
    result.name = guaranteeNonNullable(
      this.name,
      'Service test result test name is missing',
    );
    result.result = guaranteeNonNullable(
      this.result,
      'Service test result result is missing',
    );
    return result;
  }
}
