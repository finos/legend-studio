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
  GRAMMAR_MAPPING_PARSER = 'dsl-mapping__grammar-parser',
  GRAMMAR_CONNECTION_PARSER = 'dsl-connection__grammar-parser',
  GRAMMAR_RUNTIME_PARSER = 'dsl-runtime__grammar-parser',
  GRAMMAR_RELATIONAL_PARSER = 'es-relational__grammar-parser',
  GRAMMAR_SERVICE_PARSER = 'dsl-service__grammar-parser',
  GRAMMAR_GENERATION_SPECIFICATION_PARSER = 'dsl-generation-specification__grammar-parser',
  GRAMMAR_FILE_GENERATION_PARSER = 'dsl-file-generation__grammar-parser',
  GRAMMAR_DATA_PARSER = 'dsl-data__grammar-parser',

  GRAMMAR_CLASS_ELEMENT = 'grammar-class-element',
}

export const CORE_DOCUMENTATION_ENTRIES = {
  // parsers
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PURE_PARSER]: {
    markdownText: {
      value: `Core Pure (\`###Pure\`) concerns with fundamental concepts, such as, classes (data models), enumerations, associations, functions, etc.`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_MAPPING_PARSER]: {
    markdownText: {
      value: `Mapping DSL (\`###Mapping\`) concerns with data transformation specifications: this includes model-to-model transformation, store specification to model transformation, etc.`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_PARSER]: {
    markdownText: {
      value: `Connection DSL (\`###Connection\`) concerns with data stores access`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_RUNTIME_PARSER]: {
    markdownText: {
      value: `Runtime DSL (\`###Runtime\`) concerns with the organization/grouping and contextual usage of connections`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_RELATIONAL_PARSER]: {
    markdownText: {
      value: `External Store Relational DSL (\`###Relational\`) concerns with mappings, connections, and specifications for relational databases`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_SERVICE_PARSER]: {
    markdownText: {
      value: `Service DSL (\`###Service\`) concerns with generation and deployment of Pure query to productionize data extraction and exploration`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_GENERATION_SPECIFICATION_PARSER]: {
    markdownText: {
      value: `Generation Specification DSL (\`###GenerationSpecification\`) concerns with organization of generation pipeline`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_FILE_GENERATION_PARSER]: {
    markdownText: {
      value: `File Generation DSL (\`###FileGeneration\`) concerns with generating models in external formats (e.g. Avro, Protobuf, JSON Schema, etc.)`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DATA_PARSER]: {
    markdownText: {
      value: `Data DSL (\`###Data\`) concerns with storing data`,
    },
  },
  // elements
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CLASS_ELEMENT]: {
    markdownText: {
      value: `A class element specifies a data model's structure, inheritance, and constraints`,
    },
  },
};
