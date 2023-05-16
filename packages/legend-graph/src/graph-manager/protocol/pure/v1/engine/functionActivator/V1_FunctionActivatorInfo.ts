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

import { list, primitive, createModelSchema } from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import type { V1_Class } from '../../model/packageableElements/domain/V1_Class.js';
import { V1_classModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';

export class V1_FunctionActivatorConfigurationInfo {
  topElement!: string;
  packageableElementJSONType!: string;
  model: V1_Class[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_FunctionActivatorConfigurationInfo, {
      packageableElementJSONType: primitive(),
      topElement: primitive(),
      model: list(usingModelSchema(V1_classModelSchema)),
    }),
  );
}

export class V1_FunctionActivatorInfo {
  name!: string;
  description!: string;
  configuration!: V1_FunctionActivatorConfigurationInfo;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_FunctionActivatorInfo, {
      description: primitive(),
      name: primitive(),
      configuration: usingModelSchema(
        V1_FunctionActivatorConfigurationInfo.serialization.schema,
      ),
    }),
  );
}
