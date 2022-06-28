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

import type { LegendApplicationContextualDocumentationMapConfig } from '@finos/legend-application';
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
  QUESTION_HOW_TO_WRITE_A_DERIVATION_LAMBDA = 'question.how-to-write-a-class-derivation-lambda',
  QUESTION_HOW_TO_DEFINE_A_CONSTRAINT = 'question.how-to-define-a-class-constraint',
  QUESTION_HOW_TO_WRITE_A_CONSTRAINT_LAMBDA = 'question.how-to-write-a-class-constraint-lambda',
  QUESTION_HOW_TO_SPECIFY_A_SUPERTYPE = 'question.how-to-specify-a-class-supertype',

  // contexts
  CONTEXT_CLASS_EDITOR = 'context.class-editor',
}

export const CORE_CONTEXTUAL_DOCUMENTATION_MAP: LegendApplicationContextualDocumentationMapConfig =
  {
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT.CLASS_EDITOR]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONTEXT_CLASS_EDITOR,
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT.CLASS_DERIVED_PROPERTY_LAMBDA_EDITOR]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_A_CONSTRAINT_LAMBDA,
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT.CLASS_CONTRAINT_LAMBDA_EDITOR]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_A_CONSTRAINT_LAMBDA,
  };
