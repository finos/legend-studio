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

import type { PostProcessor } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/postprocessor/PostProcessor';
import { MapperPostProcessor } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/postprocessor/MapperPostProcessor';
import type { Mapper } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/postprocessor/Mapper';
import { V1_MapperPostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_MapperPostProcessor';
import type { V1_PostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor';
import {
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import {
  SchemaNameMapper,
  TableNameMapper,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/postprocessor/Mapper';
import type { V1_Mapper } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper';
import {
  V1_SchemaNameMapper,
  V1_TableNameMapper,
} from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_Mapper';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';
import type { ViewReference } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ViewReference';
import type { TableReference } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/TableReference';
import { V1_TablePtr } from '../../../model/packageableElements/store/relational/model/V1_TablePtr';

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
    `Can't build post-processor mapper of type '${getClass(val).name}`,
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
  plugins: PureProtocolProcessorPlugin[],
): V1_PostProcessor => {
  if (postProcessor instanceof MapperPostProcessor) {
    const mapperPostProcessor = new V1_MapperPostProcessor();
    mapperPostProcessor.mappers = postProcessor.mappers.map(V1_transformMapper);
    return mapperPostProcessor;
  }
  const extraConnectionPostProcessorTransformers = plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraConnectionPostProcessorTransformers?.() ?? [],
  );
  for (const transformer of extraConnectionPostProcessorTransformers) {
    const postprocessorProtocol = transformer(postProcessor);
    if (postprocessorProtocol) {
      return postprocessorProtocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform post-processor of type '${
      getClass(postProcessor).name
    }'. No compatible transformer available from plugins.`,
  );
};
