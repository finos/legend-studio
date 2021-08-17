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

import { LegendStudio } from '@finos/legend-studio';
import { QueryBuilder_Preset } from '@finos/legend-studio-preset-query-builder';
import { DSLText_Preset } from '@finos/legend-studio-preset-dsl-text';
import { EFJSONSchema_Preset } from '@finos/legend-studio-preset-external-format-json-schema';
import studioConfig from '../studio.config';
import { BrowserConsole } from '@finos/legend-studio-shared';
import './index.scss';

LegendStudio.create()
  .setup({ baseUrl: studioConfig.baseUrl })
  .withPresets([
    new DSLText_Preset(),
    new EFJSONSchema_Preset(),
    new QueryBuilder_Preset(),
  ])
  .withLoggers([new BrowserConsole()])
  .start()
  .catch((e) => {
    throw e;
  });
