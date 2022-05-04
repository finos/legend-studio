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

export enum EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'es-service__grammar-parser',
  GRAMMAR_SERVICE_STORE_ELEMENT = 'es-service__grammar--element',
}

export const EXTERNAL_STORE_SERVICE_DOCUMENTATION_ENTRIES = {
  [EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    markdownText: {
      value: `External store DSL Service (\`###ServiceStore\`) concerns with data store specifications which enable accessing  data from API endpoints`,
    },
  },
  [EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_SERVICE_STORE_ELEMENT]:
    {
      markdownText: {
        value: `A service-store element specifies API endpoints as data source`,
      },
    },
};
