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

import { guaranteeNonNullable } from '@finos/legend-studio-shared';
import { Query } from '../../../../metamodels/pure/action/query/Query';
import { V1_Query } from './query/V1_Query';
import type { PureModel } from '../../../../metamodels/pure/graph/PureModel';
import { PackageableElementExplicitReference } from '../../../../metamodels/pure/model/packageableElements/PackageableElementReference';

export const V1_buildQuery = (protocol: V1_Query, graph: PureModel): Query => {
  const metamodel = new Query();
  metamodel.name = guaranteeNonNullable(protocol.name, `Query name is missing`);
  metamodel.id = guaranteeNonNullable(protocol.id, `Query ID is missing`);
  metamodel.projectId = guaranteeNonNullable(
    protocol.projectId,
    `Query project ID is missing`,
  );
  metamodel.versionId = guaranteeNonNullable(
    protocol.versionId,
    `Query version ID is missing`,
  );
  metamodel.mapping = PackageableElementExplicitReference.create(
    graph.getMapping(
      guaranteeNonNullable(protocol.mapping, `Query mapping is missing`),
    ),
  );
  metamodel.runtime = PackageableElementExplicitReference.create(
    graph.getRuntime(
      guaranteeNonNullable(protocol.runtime, `Query runtime is missing`),
    ),
  );
  metamodel.content = guaranteeNonNullable(
    protocol.content,
    `Query content is missing`,
  );
  return metamodel;
};

export const V1_transformQuery = (metamodel: Query): V1_Query => {
  const protocol = new V1_Query();
  protocol.name = metamodel.name;
  protocol.id = metamodel.name;
  protocol.name = metamodel.name;
  protocol.projectId = metamodel.projectId;
  protocol.versionId = metamodel.versionId;
  protocol.mapping = metamodel.mapping.valueForSerialization;
  protocol.runtime = metamodel.runtime.valueForSerialization;
  protocol.content = metamodel.content;
  return protocol;
};
