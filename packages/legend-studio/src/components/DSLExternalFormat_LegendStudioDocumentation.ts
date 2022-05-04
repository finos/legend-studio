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

export enum DSL_EXTERNAL_FORAMT_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-externalFormat__grammar-parser',
  GRAMMAR_BINDING_ELEMENT = 'dsl-externalFormat__grammar-binding-element',
  GRAMMAR_SCHEMASET_ELEMENT = 'dsl-externalFormat__grammar-schemaSet-element',
}

export const DSL_EXTERNAL_FORAMT_DOCUMENTATION_ENTRIES = {
  [DSL_EXTERNAL_FORAMT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    markdownText: {
      value: `A DSL concerning with specifications related to external format and schema definitions for these external formats`,
    },
  },
  [DSL_EXTERNAL_FORAMT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_BINDING_ELEMENT]:
    {
      markdownText: {
        value: `A binding is a specification used to map a relationalship between a class and an external format`,
      },
    },
  [DSL_EXTERNAL_FORAMT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_SCHEMASET_ELEMENT]:
    {
      markdownText: {
        value: `A SchemaSet is a specification used to hold external formats.`,
      },
    },
};
