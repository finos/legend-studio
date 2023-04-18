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

import {
  createModelSchema,
  custom,
  deserialize,
  optional,
  primitive,
  raw,
  serialize,
} from 'serializr';
import { type PlainObject, SerializationFactory } from '@finos/legend-shared';
import type { V1_ModelUnit } from '../../model/packageableElements/externalFormat/store/V1_DSL_ExternalFormat_ModelUnit.js';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import { V1_modelUnitModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_DSL_ExternalFormat_ProtocolHelper.js';

export class V1_GenerateSchemaInput {
  clientVersion?: string | undefined;
  config?: PlainObject | undefined;
  model: V1_PureModelContext;
  generateBinding: boolean;
  targetBindingPath: string | undefined;
  sourceModelUnit: V1_ModelUnit;

  constructor(
    modelUnit: V1_ModelUnit,
    model: V1_PureModelContext,
    generateBinding: boolean,
    config?: PlainObject,
  ) {
    this.sourceModelUnit = modelUnit;
    this.model = model;
    this.generateBinding = generateBinding;
    this.config = config;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GenerateSchemaInput, {
      clientVersion: optional(primitive()),
      config: raw(),
      model: V1_pureModelContextPropSchema,
      generateBinding: optional(primitive()),
      targetBindingPath: optional(primitive()),
      sourceModelUnit: custom(
        (val) => serialize(V1_modelUnitModelSchema, val),
        (val) => deserialize(V1_modelUnitModelSchema, val),
      ),
    }),
  );
}
