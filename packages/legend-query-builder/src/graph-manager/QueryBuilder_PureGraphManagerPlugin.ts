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

import packageJson from '../../package.json' with { type: 'json' };
import {
  PureGraphManagerPlugin,
  type PureGraphManagerExtensionBuilder,
} from '@finos/legend-graph';
import { QueryBuilder_buildGraphManagerExtension } from './protocol/pure/QueryBuilder_PureGraphManagerExtensionBuilder.js';
import { QUERY_BUILDER_PURE_PATH } from '../graph/QueryBuilderMetaModelConst.js';

export class QueryBuilder_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraPureGraphManagerExtensionBuilders(): PureGraphManagerExtensionBuilder[] {
    return [QueryBuilder_buildGraphManagerExtension];
  }

  override getExtraExposedSystemElementPath(): string[] {
    return [
      QUERY_BUILDER_PURE_PATH.TDS_TABULAR_DATASET,
      QUERY_BUILDER_PURE_PATH.TDS_ROW,
      QUERY_BUILDER_PURE_PATH.TDS_COLUMN,
    ];
  }
}
