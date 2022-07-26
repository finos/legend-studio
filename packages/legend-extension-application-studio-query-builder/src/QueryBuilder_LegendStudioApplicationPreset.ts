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

import packageJson from '../package.json';
import { AbstractPreset } from '@finos/legend-shared';
import { QueryBuilder_LegendStudioApplicationPlugin } from './components/QueryBuilder_LegendStudioApplicationPlugin.js';
import { QueryBuilder_PureProtocolProcessorPlugin } from '@finos/legend-application-query';

export class QueryBuilder_LegendStudioApplicationPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.applicationStudioPreset, packageJson.version, [
      new QueryBuilder_LegendStudioApplicationPlugin(),
      new QueryBuilder_PureProtocolProcessorPlugin(),
    ]);
  }
}
