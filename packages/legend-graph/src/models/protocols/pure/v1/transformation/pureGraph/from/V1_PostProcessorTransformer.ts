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

import type { PostProcessor } from '../../../../../../metamodels/pure/packageableElements/store/relational/connection/postprocessor/PostProcessor.js';
import { MapperPostProcessor } from '../../../../../../metamodels/pure/packageableElements/store/relational/connection/postprocessor/MapperPostProcessor.js';
import { V1_MapperPostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_MapperPostProcessor.js';
import type { V1_PostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type Mapper,
  SchemaNameMapper,
  TableNameMapper,
} from '../../../../../../metamodels/pure/packageableElements/store/relational/connection/postprocessor/Mapper.js';
import {
  type V1_Mapper,
  V1_SchemaNameMapper,
  V1_TableNameMapper,
} from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper.js';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension.js';
import type { ViewReference } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/ViewReference.js';
import type { TableReference } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/TableReference.js';
import { V1_TablePtr } from '../../../model/packageableElements/store/relational/model/V1_TablePtr.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';

const V1_transformSchemaNameMapper = (
  val: SchemaNameMapper,
): V1_SchemaNameMapper => {
  const schemaNameMapper = new V1_SchemaNameMapper();
  schemaNameMapper.from = val.from;
  schemaNameMapper.to = val.to;
  return schemaNameMapper;
};

export const V1_transformMapper = (val: Mapper): V1_Mapper => {
  if (val instanceof SchemaNameMapper) {
    return V1_transformSchemaNameMapper(val);
  } else if (val instanceof TableNameMapper) {
    const tableNameMapper = new V1_TableNameMapper();
    tableNameMapper.schema = V1_transformSchemaNameMapper(val.schema);
    tableNameMapper.from = val.from;
    tableNameMapper.to = val.to;
    return tableNameMapper;
  }
  throw new UnsupportedOperationError(
    `Can't transform post-processor mapper`,
    val,
  );
};

export const V1_transformRelation = (
  val: ViewReference | TableReference,
): V1_TablePtr => {
  const _table = new V1_TablePtr();
  _table.database = val.ownerReference.value.path;
  _table.schema = val.value.schema.name;
  _table.table = val.value.name;
  return _table;
};

export const V1_transformPostProcessor = (
  postProcessor: PostProcessor,
  context: V1_GraphTransformerContext,
): V1_PostProcessor => {
  if (postProcessor instanceof MapperPostProcessor) {
    const mapperPostProcessor = new V1_MapperPostProcessor();
    mapperPostProcessor.mappers = postProcessor.mappers.map(V1_transformMapper);
    return mapperPostProcessor;
  }
  const extraConnectionPostProcessorTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraConnectionPostProcessorTransformers?.() ?? [],
  );
  for (const transformer of extraConnectionPostProcessorTransformers) {
    const postprocessorProtocol = transformer(postProcessor, context);
    if (postprocessorProtocol) {
      return postprocessorProtocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform post-processor: no compatible transformer available from plugins`,
    postProcessor,
  );
};
