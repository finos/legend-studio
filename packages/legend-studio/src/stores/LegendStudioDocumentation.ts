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
  // parsers
  GRAMMAR_PURE_PARSER = 'grammar-pure-parser',
  GRAMMAR_MAPPING_PARSER = 'dsl-mapping__grammar-parser',
  GRAMMAR_CONNECTION_PARSER = 'dsl-connection__grammar-parser',
  GRAMMAR_RUNTIME_PARSER = 'dsl-runtime__grammar-parser',
  GRAMMAR_RELATIONAL_PARSER = 'es-relational__grammar-parser',
  GRAMMAR_SERVICE_PARSER = 'dsl-service__grammar-parser',
  GRAMMAR_GENERATION_SPECIFICATION_PARSER = 'dsl-generation-specification__grammar-parser',
  GRAMMAR_FILE_GENERATION_PARSER = 'dsl-file-generation__grammar-parser',
  GRAMMAR_DATA_PARSER = 'dsl-data__grammar-parser',
  // elements
  GRAMMAR_CLASS_ELEMENT = 'grammar-class-element',
  GRAMMAR_PROFILE_ELEMENT = 'grammar-profile-element',
  GRAMMAR_ENUMERATION_ELEMENT = 'grammar-enumeration-element',
  GRAMMAR_MEASURE_ELEMENT = 'grammar-measure-element',
  GRAMMAR_ASSOCIATION_ELEMENT = 'grammar-association-element',
  GRAMMAR_FUNCTION_ELEMENT = 'grammar-function-element',
  GRAMMAR_MAPPING_ELEMENT = 'grammar-mapping-element',
  GRAMMAR_DATABASE_ELEMENT = 'grammar-database-element',
  GRAMMAR_SERVICE_ELEMENT = 'grammar-service-element',
  GRAMMAR_RUNTIME_ELEMENT = 'grammar-runtime-element',
  GRAMMAR_CONNECTION_ELEMENT = 'grammar-connection-element',
  GRAMMAR_GENERATION_SPECIFICATION_ELEMENT = 'grammar-generation-specification-element',
  GRAMMAR_FILE_GENERATION_ELEMENT = 'grammar-file-generation-element',
  GRAMMAR_DATA_ELEMENT = 'grammar-data-element',
  // connection elements
  GRAMMAR_JSON_MODEL_CONNECTION = 'grammar-json-model-connection',
  GRAMMAR_XML_MODEL_CONNECTION = 'grammar-xml-model-connection',
  GRAMMAR_MODEL_CHAIN_CONNECTION = 'grammar-model-chain-connection',
  GRAMMAR_RELATIONAL_DATABASE_CONNECTION = 'grammar-relational-database-connection',
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
      value: `Data DSL (\`###Data\`) concerns with storing data which can be various purpose including testing`,
    },
  },
  // elements
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CLASS_ELEMENT]: {
    markdownText: {
      value: `A class element specifies a data model's structure, inheritance, and constraints`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PROFILE_ELEMENT]: {
    markdownText: {
      value: `A profile provides a generic extension mechanism for customizing existing data models; some of its uses include documentating and classifying data models`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ENUMERATION_ELEMENT]: {
    markdownText: {
      value: `An enumeration specifies the complete list of value that a given type may acquire`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_MEASURE_ELEMENT]: {
    markdownText: {
      value: `A measure, a more specific version of enumeration, specifies a measurble type: it specifies units (as well as conversion functions to convert values between them)`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ASSOCIATION_ELEMENT]: {
    markdownText: {
      value: `An association specifies a linking between between 2 data models`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_MAPPING_ELEMENT]: {
    markdownText: {
      value: `A mapping specifies a transformation between models, including model-to-model, store-to-model, enumeration-to-model, etc.`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DATABASE_ELEMENT]: {
    markdownText: {
      value: `A database specifies the structure (schema, table, view) and joins of a relational database`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_SERVICE_ELEMENT]: {
    markdownText: {
      value: `A service specifies query execution and deployment information so the it can be productionized: e.g. exposing it via API endpoints`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_RUNTIME_ELEMENT]: {
    markdownText: {
      value: `A runtime specifies a logical grouping of connections which can be used for query execution`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_ELEMENT]: {
    markdownText: {
      value: `A connection specifies access to data store(s) including data store specifications and authentication strategies`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_GENERATION_SPECIFICATION_ELEMENT]: {
    markdownText: {
      value: `A generation specification provides the pipeline for all generations`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DATA_ELEMENT]: {
    markdownText: {
      value: `A data element stores data which can be used for various purposes, including testing`,
    },
  },
  // connections
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_JSON_MODEL_CONNECTION]: {
    markdownText: {
      value: `A JSON model connection specifies access to a model store where the retrieved data will be in JSON format`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_XML_MODEL_CONNECTION]: {
    markdownText: {
      value: `A XML model connection specifies access to a model store where the retrieved data will be in XML format`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_MODEL_CHAIN_CONNECTION]: {
    markdownText: {
      value: `A model chain connection provides a mechanism to sequence mappings (data transformations) and simulate a data store`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_RELATIONAL_DATABASE_CONNECTION]: {
    markdownText: {
      value: `A relational data connection specifies access to a relational database, including the store specification and authentication strategy`,
    },
  },
};
