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

export enum DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-externalFormat__grammar-parser',
  GRAMMAR_BINDING_ELEMENT = 'dsl-externalFormat__grammar-binding-element',
  GRAMMAR_SCHEMASET_ELEMENT = 'dsl-externalFormat__grammar-schemaSet-element',
}

export const DSL_EXTERNAL_FORMAT_DOCUMENTATION_ENTRIES = {
  [DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    markdownText: {
      value: `DSL External-Format (\`###ExternalFormat\`) concerns with the serialization between data models and external formats like CSV, JSON, etc.`,
    },
  },
  [DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_BINDING_ELEMENT]:
    {
      markdownText: {
        value: `A binding element specifies the mapping between data models and schemas of the data sources in external formats (e.g. JSON, CSV, etc.) as well as the serialization driver to use for data transformation`,
      },
    },
  [DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_SCHEMASET_ELEMENT]:
    {
      markdownText: {
        value: `A schema-set element specifies schemas of the data sources in external formats (e.g. JSON, CSV, etc.)`,
      },
    },
};
