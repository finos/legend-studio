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

import type {
  LegendApplicationContextualDocumentationEntryConfig,
  LegendApplicationDocumentationEntryConfig,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT } from './LegendStudioApplicationNavigationContext.js';

export enum LEGEND_STUDIO_DOCUMENTATION_KEY {
  NOT_FOUND_HELP = 'application.not-found-help',

  SETUP_WORKSPACE = 'setup.setup-workspace',
  CREATE_PROJECT = 'setup.create-project',
  IMPORT_PROJECT = 'setup.import-project',
  CREATE_WORKSPACE = 'setup.create-workspace',

  // grammar parsers
  GRAMMAR_PARSER_PURE = 'grammar.parser.pure',
  GRAMMAR_PARSER_MAPPING = 'dsl-mapping.grammar.parser',
  GRAMMAR_PARSER_CONNECTION = 'dsl-connection.grammar.parser',
  GRAMMAR_PARSER_RUNTIME = 'dsl-runtime.grammar.parser',
  GRAMMAR_PARSER_RELATIONAL = 'es-relational.grammar.parser',
  GRAMMAR_PARSER_SERVICE = 'dsl-service.grammar.parser',
  GRAMMAR_PARSER_GENERATION_SPECIFICATION = 'dsl-generation-specification.grammar.parser',
  GRAMMAR_PARSER_FILE_GENERATION = 'dsl-file-generation.grammar.parser',
  GRAMMAR_PARSER_DATA = 'dsl-data.grammar.parser',
  // grammar elements
  GRAMMAR_ELEMENT_CLASS = 'grammar.class',
  GRAMMAR_ELEMENT_PROFILE = 'grammar.profile',
  GRAMMAR_ELEMENT_ENUMERATION = 'grammar.enumeration',
  GRAMMAR_ELEMENT_MEASURE = 'grammar.measure',
  GRAMMAR_ELEMENT_ASSOCIATION = 'grammar.association',
  GRAMMAR_ELEMENT_FUNCTION = 'grammar.function',
  GRAMMAR_ELEMENT_MAPPING = 'dsl-mapping.grammar.element.mapping',
  GRAMMAR_ELEMENT_DATABASE = 'es-relational.grammar.element.database',
  GRAMMAR_ELEMENT_SERVICE = 'dsl-service.grammar.element.service',
  GRAMMAR_ELEMENT_RUNTIME = 'dsl-mapping.grammar.element.runtime',
  GRAMMAR_ELEMENT_CONNECTION = 'dsl-mapping.grammar.element.connection',
  GRAMMAR_ELEMENT_GENERATION_SPECIFICATION = 'dsl-generation-specification.grammar.element.generation-specification',
  GRAMMAR_ELEMENT_FILE_GENERATION_SPECIFICATION = 'dsl-file-generation.grammar.element.file-generation-specification',
  GRAMMAR_DATA_ELEMENT = 'dsl-data.grammar.element.data',
  // grammar connection elements
  GRAMMAR_CONNECTION_JSON_MODEL_CONNECTION = 'dsl-mapping.grammar.connection.json-model-connection',
  GRAMMAR_CONNECTION_XML_MODEL_CONNECTION = 'dsl-mapping.grammar.connection.xml-model-connection',
  GRAMMAR_CONNECTION_MODEL_CHAIN_CONNECTION = 'dsl-mapping.grammar.connection.model-chain-connection',
  GRAMMAR_CONNECTION_RELATIONAL_DATABASE_CONNECTION = 'es-relational.grammar.connection.relational-database-connection',

  // questions
  QUESTION_WHAT_IS_DSL = 'question.what-is-dsl',
  QUESTION_WHAT_IS_BASIC_PURE_LANGUAGE = 'question.what-is-basic-pure-language',
  QUESTION_HOW_TO_WRITE_PURE_LAMBDA = 'question.how-to-write-pure-lambda',

  QUESTION_HOW_TO_DEFINE_A_CLASS = 'question.how-to-define-a-class',
  QUESTION_HOW_TO_DEFINE_A_PROPERTY = 'question.how-to-define-a-class-property',
  QUESTION_HOW_TO_DEFINE_A_DERIVATION = 'question.how-to-define-a-class-derivation',
  QUESTION_HOW_TO_DEFINE_A_CONSTRAINT = 'question.how-to-define-a-class-constraint',
  QUESTION_HOW_TO_SPECIFY_A_SUPERTYPE = 'question.how-to-specify-a-class-supertype',
}

export const CORE_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationDocumentationEntryConfig
> = {
  // parsers
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_PURE]: {
    title: `What is core Pure about?`,
    markdownText: {
      value: `Core \`Pure\` (coressponding to \`###Pure\` section in \`Pure\`) concerns with fundamental modelling concepts, such as, classes (data models), enumerations, associations, functions, etc.`,
    },
    url: `https://legend.finos.org/docs/language/legend-language`,
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_MAPPING]: {
    title: `What is Mapping DSL about?`,
    markdownText: {
      value: `\`Mapping DSL\` (coressponding to \`###Mapping\` section in \`Pure\`) concerns with data transformation specifications: this includes model-to-model transformation, store specification to model transformation, etc.`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_CONNECTION]: {
    title: `What is Connection DSL about?`,
    markdownText: {
      value: `\`Connection DSL\` (coressponding to \`###Connection\` section in \`Pure\`) concerns with data stores access`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_RUNTIME]: {
    title: `What is Runtime DSL about?`,
    markdownText: {
      value: `\`Runtime DSL\` (coressponding to \`###Runtime\` section in \`Pure\`) concerns with the organization/grouping and contextual usage of connections`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_RELATIONAL]: {
    title: `What is External Store Relational DSL about?`,
    markdownText: {
      value: `\`External Store Relational DSL\` (coressponding to \`###Relational\` section in \`Pure\`) concerns with mappings, connections, and specifications for relational databases`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_SERVICE]: {
    title: `What is Service DSL about?`,
    markdownText: {
      value: `\`Service DSL\` (coressponding to \`###Service\` section in \`Pure\`) concerns with generation and deployment of Pure query to productionize data extraction and exploration`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_GENERATION_SPECIFICATION]: {
    title: `What is Generation Specification DSL about?`,
    markdownText: {
      value: `\`Generation Specification DSL\` (coressponding to \`###GenerationSpecification\` section in \`Pure\`) concerns with organization of generation pipeline`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_FILE_GENERATION]: {
    title: `What is File Generation DSL about?`,
    markdownText: {
      value: `\`File Generation DSL\` (coressponding to \`###FileGeneration\` section in \`Pure\`) concerns with generating models in external formats (e.g. Avro, Protobuf, JSON Schema, etc.)`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_DATA]: {
    title: `What is Data DSL about?`,
    markdownText: {
      value: `\`Data DSL\` (coressponding to \`###Data\` section in \`Pure\`) concerns with storing data which can be various purpose including testing`,
    },
  },
  // elements
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_CLASS]: {
    title: `What is a class element?`,
    markdownText: {
      value: `A \`Class\` specifies a data model's structure, inheritance, and constraints`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_PROFILE]: {
    title: `What is a profile element?`,
    markdownText: {
      value: `A \`Profile\` provides a generic extension mechanism for customizing existing data models; some of its uses include documentating and classifying data models`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_ENUMERATION]: {
    title: `What is an enumeration element?`,
    markdownText: {
      value: `An \`Enumeration\` specifies the complete list of value that a given type may acquire`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_MEASURE]: {
    title: `What is a measure element?`,
    markdownText: {
      value: `A \`Measure\` (fairly similar to \`Enumeration\`) specifies a measurble type: it specifies units (as well as conversion functions to convert values between them)`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_ASSOCIATION]: {
    title: `What is an association element?`,
    markdownText: {
      value: `An \`Association\` specifies a linking between between 2 data models`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_MAPPING]: {
    title: `What is a mapping element?`,
    markdownText: {
      value: `A \`Mapping\` specifies a transformation between models, including model-to-model, store-to-model, enumeration-to-model, etc.`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_DATABASE]: {
    title: `What is a database element?`,
    markdownText: {
      value: `A \`Database\` specifies the structure (schema, table, view) and joins of a relational database`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_SERVICE]: {
    title: `What is a service element?`,
    markdownText: {
      value: `A \`Service\` specifies query execution and deployment information so the it can be productionized: e.g. exposing it via API endpoints`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_RUNTIME]: {
    title: `What is a runtime element?`,
    markdownText: {
      value: `A \`Runtime\` specifies a logical grouping of connections which can be used for query execution`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_CONNECTION]: {
    title: `What is a connection element?`,
    markdownText: {
      value: `A \`Connection\` specifies access to data store(s) including data store specifications and authentication strategies`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_GENERATION_SPECIFICATION]: {
    title: `What is a generation specification element?`,
    markdownText: {
      value: `A \`Generation Specification\` provides the pipeline for all generations`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_FILE_GENERATION_SPECIFICATION]:
    {
      title: `What is a file generation specification element?`,
      markdownText: {
        value: `A \`File Generation Specification\` specifies the generation of external format from Pure models`,
      },
    },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DATA_ELEMENT]: {
    title: `What is a data element?`,
    markdownText: {
      value: `A \`Data\` element stores data which can be used for various purposes, including testing`,
    },
  },
  // connections
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_JSON_MODEL_CONNECTION]: {
    title: `What is a JSON model connection?`,
    markdownText: {
      value: `A JSON model connection specifies access to a model store where the retrieved data will be in JSON format`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_XML_MODEL_CONNECTION]: {
    title: `What is a XML model connection?`,
    markdownText: {
      value: `A XML model connection specifies access to a model store where the retrieved data will be in XML format`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_MODEL_CHAIN_CONNECTION]: {
    title: `What is a model chain connection?`,
    markdownText: {
      value: `A model chain connection provides a mechanism to sequence mappings (data transformations) and simulate a data store`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_RELATIONAL_DATABASE_CONNECTION]:
    {
      title: `What is a relational database connection?`,
      markdownText: {
        value: `A relational data connection specifies access to a relational database, including the store specification and authentication strategy`,
      },
    },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHAT_IS_DSL]: {
    title: `What is a domain-specific language (DSL)?`,
    markdownText: {
      value: `A \`domain-specific language\` (DSL) is a higher-level abstraction optimized for a specific domain/class of problems. Each \`DSL\` often has their own \`Pure\` sub-grammar, which partition \`Pure\` code into sections (each starts with a header, such as \`###Pure\`, \`###Mapping\`, etc.`,
    },
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHAT_IS_BASIC_PURE_LANGUAGE]: {
    title: `What are the basics of Pure language?`,
    url: `https://legend.finos.org/docs/language/legend-language`,
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_PURE_LAMBDA]: {
    title: `How do I write a lambda function in Pure?`,
    url: `https://legend.finos.org/docs/language/legend-language#lambda`,
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_CLASS]: {
    title: `How do I define a class?`,
    url: `https://legend.finos.org/docs/studio/create-data-model#define-a-new-class`,
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_PROPERTY]: {
    title: `How do I define a class property?`,
    url: `https://legend.finos.org/docs/studio/create-data-model#add-a-property-primitive-data-type`,
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_DERIVATION]: {
    title: `How do I define a class derivation (derived property)?`,
    url: `https://legend.finos.org/docs/studio/create-data-model#add-a-derived-property`,
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_CONSTRAINT]: {
    title: `How do I put constraint on a class?`,
    url: `https://legend.finos.org/docs/studio/create-data-model#add-a-constraint`,
  },
  [LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_SPECIFY_A_SUPERTYPE]: {
    title: `How do I specify a supertype of a class?`,
    url: `https://legend.finos.org/docs/studio/create-data-model#add-a-super-type`,
  },
};

export const CORE_CONTEXTUAL_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationContextualDocumentationEntryConfig
> = {
  [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT.CLASS_EDITOR]: {
    related: [
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_CLASS,
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_PROPERTY,
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_DERIVATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_DEFINE_A_CONSTRAINT,
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_SPECIFY_A_SUPERTYPE,
    ],
  },
  [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT.CLASS_DERIVED_PROPERTY_LAMBDA_EDITOR]:
    {
      title: `How to write a derived property lambda in Pure?`,
      url: `https://legend.finos.org/docs/language/legend-language#derivation`,
      related: [
        LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_PURE_LAMBDA,
        LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHAT_IS_BASIC_PURE_LANGUAGE,
      ],
    },
  [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT.CLASS_CONTRAINT_LAMBDA_EDITOR]:
    {
      title: `How to write a constraint lambda in Pure?`,
      url: `https://legend.finos.org/docs/language/legend-language#constraint`,
      related: [
        LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_PURE_LAMBDA,
        LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHAT_IS_BASIC_PURE_LANGUAGE,
      ],
    },
};
