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

export enum LEGEND_STUDIO_DOCUMENTATION_KEY {
  NOT_FOUND_HELP = 'not-found-help',

  SETUP_WORKSPACE = 'setup-workspace',
  CREATE_PROJECT = 'create-project',
  IMPORT_PROJECT = 'import-project',
  CREATE_WORKSPACE = 'create-workspace',

  GRAMMAR_PURE_PARSER = 'grammar-pure-parser',
  GRAMMAR_CLASS_ELEMENT = 'grammar-class-element',
}

export const CORE_DOCUMENTATION_ENTRIES = {
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PURE_PARSER]: {
    markdownText: {
      value: `This section include specifications of fundamental Pure concepts: classes, enumerations, associations, etc.`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CLASS_ELEMENT]: {
    markdownText: {
      value: `A class element can be used to describe a data model structure, inheritance, and constraints`,
    },
  },
};
