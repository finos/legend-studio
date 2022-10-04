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

import { V1_PureModelContextData } from '@finos/legend-graph';
import { SerializationFactory, optionalCustom } from '@finos/legend-shared';
import {
  createModelSchema,
  list,
  object,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import type { V1_DataSpaceSupportInfo } from '../../model/packageableElements/dataSpace/V1_DSL_DataSpace_DataSpace.js';
import { V1_deserializeSupportInfo } from '../../transformation/pureProtocol/V1_DSL_DataSpace_ProtocolHelper.js';

class V1_DataSpaceTaggedValueInfo {
  profile!: string;
  tag!: string;
  value!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceTaggedValueInfo, {
      profile: primitive(),
      tag: primitive(),
      value: primitive(),
    }),
  );
}

class V1_DataSpaceStereotypeInfo {
  profile!: string;
  value!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceStereotypeInfo, {
      profile: primitive(),
      value: primitive(),
    }),
  );
}

class V1_DataSpaceExecutionContextAnalysisResult {
  name!: string;
  description?: string | undefined;
  mapping!: string;
  defaultRuntime!: string;
  compatibleRuntimes!: string[];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceExecutionContextAnalysisResult, {
      name: primitive(),
      description: optional(primitive()),
      mapping: primitive(),
      defaultRuntime: primitive(),
      compatibleRuntimes: list(primitive()),
    }),
  );
}

export class V1_DataSpaceAnalysisResult {
  name!: string;
  package!: string;
  path!: string;

  taggedValues: V1_DataSpaceTaggedValueInfo[] = [];
  stereotypes: V1_DataSpaceStereotypeInfo[] = [];

  title?: string | undefined;
  description?: string | undefined;
  supportInfo?: V1_DataSpaceSupportInfo | undefined;

  model!: V1_PureModelContextData;

  executionContexts: V1_DataSpaceExecutionContextAnalysisResult[] = [];
  defaultExecutionContext!: string;

  featuredDiagrams: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceAnalysisResult, {
      name: primitive(),
      package: primitive(),
      path: primitive(),

      taggedValues: list(object(V1_DataSpaceTaggedValueInfo)),
      stereotypes: list(object(V1_DataSpaceStereotypeInfo)),

      title: optional(primitive()),
      description: optional(primitive()),
      supportInfo: optionalCustom(
        () => SKIP,
        (val) => V1_deserializeSupportInfo(val),
      ),

      model: object(V1_PureModelContextData),

      executionContexts: list(
        object(V1_DataSpaceExecutionContextAnalysisResult),
      ),
      defaultExecutionContext: primitive(),

      featuredDiagrams: list(primitive()),
    }),
  );
}
