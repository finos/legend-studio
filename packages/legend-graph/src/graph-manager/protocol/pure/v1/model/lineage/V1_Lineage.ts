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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import type { V1_PureModelContext } from '../context/V1_PureModelContext.js';
import type { V1_Runtime } from '../packageableElements/runtime/V1_Runtime.js';
import type { V1_RawLambda } from '../rawValueSpecification/V1_RawLambda.js';
import {
  createModelSchema,
  custom,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import {
  V1_deserializeRuntime,
  V1_serializeRuntime,
} from '../../transformation/pureProtocol/serializationHelpers/V1_RuntimeSerializationHelper.js';
import { V1_rawLambdaModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';

export class V1_LineageInput {
  clientVersion: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  function!: V1_RawLambda;
  mapping: string | undefined;
  model!: V1_PureModelContext;
  runtime: V1_Runtime | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_LineageInput, {
      clientVersion: optional(primitive()),
      function: usingModelSchema(V1_rawLambdaModelSchema),
      mapping: optional(primitive()),
      model: V1_pureModelContextPropSchema,
      runtime: custom(
        (val) => (val ? V1_serializeRuntime(val) : SKIP),
        (val) => (val ? V1_deserializeRuntime(val) : SKIP),
      ),
    }),
  );
}

export abstract class V1_LineageEdge {
  abstract source: string;
  abstract target: string;
  abstract type: string;
}

export abstract class V1_LineageNode {
  abstract id: string;
  abstract text: string;
  abstract type: string;
}

export abstract class V1_LineageGraph {
  abstract edges: V1_LineageEdge[];
  abstract nodes: V1_LineageNode[];
}

export abstract class V1_FunctionTreeNode {
  abstract display: string;
  abstract type: string;
  abstract children?: V1_FunctionTreeNode[] | undefined;
}

export abstract class V1_ReportLineageColumn {
  abstract database: string;
  abstract name: string;
  abstract schema: string;
  abstract table: string;
}

export abstract class V1_ReportLineagePropertyTree {
  abstract display: string;
  abstract type: string;
  abstract children?: V1_ReportLineagePropertyTree[] | undefined;
}

export abstract class V1_ReportLineage {
  abstract columns: V1_ReportLineageColumn[];
  abstract name: string;
  abstract propertyTree: V1_ReportLineagePropertyTree;
}

export abstract class V1_RelationTree {
  abstract display: string;
  abstract isView: boolean;
}

export abstract class V1_SerializerInfo {
  abstract name: string;
  abstract version: string;
}

export abstract class V1_LineageModel {
  abstract classLineage?: V1_LineageGraph | undefined;
  abstract databaseLineage?: V1_LineageGraph | undefined;
  abstract functionTree?: V1_FunctionTreeNode[] | undefined;
  abstract relationTree?: V1_RelationTree | undefined;
  abstract reportLineage?: V1_ReportLineage[] | undefined;
}
