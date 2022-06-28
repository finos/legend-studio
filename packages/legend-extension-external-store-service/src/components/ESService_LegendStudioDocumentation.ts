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

import type { LegendApplicationDocumentationConfigEntry } from '@finos/legend-application';

export enum EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'es-service.grammar.parser',
  GRAMMAR_ELEMENT_SERVICE_STORE = 'es-service.grammar.element.service-store',
}

export const EXTERNAL_STORE_SERVICE_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationDocumentationConfigEntry
> = {
  [EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    title: `What is External Store Service DSL about?`,
    markdownText: {
      value: `\`External Store Service DSL\` (coressponding to \`###ServiceStore\` section in \`Pure\`) concerns with data store specifications which enable accessing  data from API endpoints`,
    },
  },
  [EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_SERVICE_STORE]:
    {
      title: `What is a service store element?`,
      markdownText: {
        value: `A service store element specifies API endpoints as data source`,
      },
    },
};
