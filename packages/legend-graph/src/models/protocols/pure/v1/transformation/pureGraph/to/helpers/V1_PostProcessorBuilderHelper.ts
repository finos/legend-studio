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

import type { PostProcessor } from '../../../../../../../metamodels/pure/packageableElements/store/relational/connection/postprocessor/PostProcessor';
import { MapperPostProcessor } from '../../../../../../../metamodels/pure/packageableElements/store/relational/connection/postprocessor/MapperPostProcessor';
import type { Mapper } from '../../../../../../../metamodels/pure/packageableElements/store/relational/connection/postprocessor/Mapper';
import { V1_MapperPostProcessor } from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_MapperPostProcessor';
import type { V1_PostProcessor } from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor';
import { UnsupportedOperationError } from '@finos/legend-shared';
import type { V1_Mapper } from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper';
import {
  V1_TableNameMapper,
  V1_SchemaNameMapper,
} from '../../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper';
import {
  SchemaNameMapper,
  TableNameMapper,
} from '../../../../../../../metamodels/pure/packageableElements/store/relational/connection/postprocessor/Mapper';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';

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
  if (protocol instanceof V1_MapperPostProcessor) {
    const mapperPostProcessor = new MapperPostProcessor();
    mapperPostProcessor.mappers = protocol.mappers.map(V1_buildMapper);
    return mapperPostProcessor;
  }
  const extraPostProcessorBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraConnectionPostProcessorBuilders?.() ?? [],
  );
  for (const builder of extraPostProcessorBuilders) {
    const postprocessor = builder(protocol, context);
    if (postprocessor) {
      return postprocessor;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build post-processor: no compatible builder available from plugins`,
    protocol,
  );
};
