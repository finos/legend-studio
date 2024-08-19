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

import { PureGraphManagerPlugin } from '@finos/legend-graph';
import packageJson from '../../package.json' with { type: 'json' };

export class FMT_GraphQL_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(
      packageJson.extensions.format_graphql_pureGraphManagerPlugin,
      packageJson.version,
    );
  }

  override getExtraExposedSystemElementPath(): string[] {
    return [
      // Provides stereotypes for GraphQL queries
      'meta::external::query::graphQL::binding::GraphQL',
    ];
  }
}
