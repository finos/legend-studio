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
import { QueryBuilder_LegendStudioPreset } from '@finos/legend-studio-extension-query-builder';
import { DSLText_LegendStudioPreset } from '@finos/legend-extension-dsl-text';
import { EFJSONSchema_GraphPreset } from '@finos/legend-extension-external-format-json-schema';
import { BrowserConsole } from '@finos/legend-shared';
import { DSLDiagram_LegendStudioPreset } from '@finos/legend-extension-dsl-diagram';
import { DSLSerializer_LegendStudioPreset } from '@finos/legend-extension-dsl-serializer';
import { DSLDataSpace_LegendStudioPreset } from '@finos/legend-extension-dsl-data-space';
import { ESService_LegendStudioPreset } from '@finos/legend-extension-external-store-service';

export class LegendStudioApplication {
  static run(baseUrl: string): void {
    LegendStudio.create()
      .setup({ baseUrl })
      .withPresets([
        new DSLText_LegendStudioPreset(),
        new DSLDiagram_LegendStudioPreset(),
        new DSLDataSpace_LegendStudioPreset(),
        new EFJSONSchema_GraphPreset(),
        new QueryBuilder_LegendStudioPreset(),
        new DSLSerializer_LegendStudioPreset(),
        new ESService_LegendStudioPreset(),
      ])
      .withLoggers([new BrowserConsole()])
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
