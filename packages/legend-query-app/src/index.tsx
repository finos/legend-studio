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

import { LegendQuery } from '@finos/legend-query';
import { DSLText_GraphPreset } from '@finos/legend-extension-dsl-text';
import { EFJSONSchema_GraphPreset } from '@finos/legend-extension-external-format-json-schema';
import { BrowserConsole } from '@finos/legend-shared';
import { DSLDiagram_GraphPreset } from '@finos/legend-extension-dsl-diagram';
import { DSLSerializer_GraphPreset } from '@finos/legend-extension-dsl-serializer';
import { DSLDataSpace_GraphPreset } from '@finos/legend-extension-dsl-data-space';

export class LegendQueryApplication {
  static run(baseUrl: string): void {
    LegendQuery.create()
      .setup({ baseUrl })
      .withPresets([
        new DSLText_GraphPreset(),
        new DSLDiagram_GraphPreset(),
        new DSLDataSpace_GraphPreset(),
        new EFJSONSchema_GraphPreset(),
        new DSLSerializer_GraphPreset(),
      ])
      .withLoggers([new BrowserConsole()])
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
