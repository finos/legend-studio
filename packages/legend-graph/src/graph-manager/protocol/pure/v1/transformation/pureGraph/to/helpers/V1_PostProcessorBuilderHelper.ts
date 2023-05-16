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

import type { PostProcessor } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/PostProcessor.js';
import { MapperPostProcessor } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/MapperPostProcessor.js';
import { V1_MapperPostProcessor } from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_MapperPostProcessor.js';
import type { V1_PostProcessor } from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type V1_Mapper,
  V1_TableNameMapper,
  V1_SchemaNameMapper,
} from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper.js';
import {
  type Mapper,
  SchemaNameMapper,
  TableNameMapper,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/Mapper.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import type { STO_Relational_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/STO_Relational_PureProtocolProcessorPlugin_Extension.js';
import { V1_INTERNAL__UnknownPostProcessor } from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_INTERNAL__UnknownPostProcessor.js';
import { INTERNAL__UnknownPostProcessor } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/INTERNAL__UnknownPostProcessor.js';

const buildSchemaNameMapper = (schema: V1_SchemaNameMapper): SchemaNameMapper =>
  new SchemaNameMapper(schema.from, schema.to);

export const V1_buildMapper = (mapper: V1_Mapper): Mapper => {
  if (mapper instanceof V1_SchemaNameMapper) {
    return buildSchemaNameMapper(mapper);
  } else if (mapper instanceof V1_TableNameMapper) {
    const _schema = buildSchemaNameMapper(mapper.schema);
    return new TableNameMapper(mapper.from, mapper.to, _schema);
  }
  throw new UnsupportedOperationError(`Can't build mapper`, mapper);
};

export const V1_buildPostProcessor = (
  protocol: V1_PostProcessor,
  context: V1_GraphBuilderContext,
): PostProcessor => {
  if (protocol instanceof V1_INTERNAL__UnknownPostProcessor) {
    const metamodel = new INTERNAL__UnknownPostProcessor();
    metamodel.content = protocol.content;
    return metamodel;
  } else if (protocol instanceof V1_MapperPostProcessor) {
    const metamodel = new MapperPostProcessor();
    metamodel.mappers = protocol.mappers.map(V1_buildMapper);
    return metamodel;
  }
  const extraPostProcessorBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraConnectionPostProcessorBuilders?.() ?? [],
  );
  for (const builder of extraPostProcessorBuilders) {
    const metamodel = builder(protocol, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build post-processor: no compatible builder available from plugins`,
    protocol,
  );
};
