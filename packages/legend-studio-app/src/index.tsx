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

import { Studio } from '@finos/legend-studio';
import { QueryBuilderPlugin } from '@finos/legend-studio-plugin-query-builder';
import { DSLText_Preset } from '@finos/legend-studio-preset-dsl-text';
import { EFJSONSchema_Preset } from '@finos/legend-studio-preset-external-format-json-schema';
import studioConfig from '../studio.config';
import './index.scss';

Studio.create()
  .setup({ baseUrl: studioConfig.baseUrl })
  .withPresets([new DSLText_Preset(), new EFJSONSchema_Preset()])
  .withPlugins([new QueryBuilderPlugin()])
  .start()
  .catch((e) => {
    throw e;
  });
