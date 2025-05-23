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

import type { ContextualDocumentationConfig } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from './LegendStudioApplicationNavigationContext.js';

export enum LEGEND_STUDIO_DOCUMENTATION_KEY {
  NOT_FOUND_HELP = 'application.not-found-help',

  SETUP_WORKSPACE = 'setup.setup-workspace',
  CREATE_PROJECT = 'setup.create-project',
  IMPORT_PROJECT = 'setup.import-project',
  CREATE_WORKSPACE = 'setup.create-workspace',
  CREATE_PATCH = 'setup.create-patch',
  SETUP_CREATE_SANDBOX_UNAUTHORIZED = 'setup.create-sandbox-unauthorized',
  SETUP_CREATE_SANDBOX_PROJECT = 'setup.create-sandbox-project',

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
  CONCEPT_ELEMENT_CLASS = 'grammar.class',
  CONCEPT_ELEMENT_PROFILE = 'grammar.profile',
  CONCEPT_ELEMENT_ENUMERATION = 'grammar.enumeration',
  CONCEPT_ELEMENT_MEASURE = 'grammar.measure',
  CONCEPT_ELEMENT_ASSOCIATION = 'grammar.association',
  CONCEPT_ELEMENT_FUNCTION = 'grammar.function',
  CONCEPT_ELEMENT_MAPPING = 'dsl-mapping.concept.element.mapping',
  CONCEPT_ELEMENT_DATABASE = 'es-relational.concept.element.database',
  CONCEPT_ELEMENT_SERVICE = 'dsl-service.concept.element.service',
  CONCEPT_ELEMENT_RUNTIME = 'dsl-mapping.concept.element.runtime',
  CONCEPT_ELEMENT_CONNECTION = 'dsl-mapping.concept.element.connection',
  CONCEPT_ELEMENT_GENERATION_SPECIFICATION = 'dsl-generation-specification.concept.element.generation-specification',
  CONCEPT_ELEMENT_FILE_GENERATION_SPECIFICATION = 'dsl-file-generation.concept.element.file-generation-specification',
  GRAMMAR_DATA_ELEMENT = 'dsl-data.concept.element.data',
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
  QUESTION_HOW_TO_UPDATE_PROJECT_GAV_COORDINATES = 'question.how-to-update-project-gav-coordinates',
  QUESTION_WHEN_TO_CONFIGURE_PLATFORM_VERSIONS = 'question.when-to-configure-project-platform-dependencies-versions',
  QUESTION_WHAT_IS_EMBEDDED_MODE_PROJECT_TYPE = 'question.what-is-embedded-project-type',
  QUESTION_HOW_TO_WRITE_A_SERVICE_TEST = 'question.how-to-write-a-service-test',
  QUESTION_HOW_TO_WRITE_A_MAPPING_TEST = 'question.how-to-write-a-mapping-test',
  QUESTION_HOW_TO_WRITE_A_FUNCTION_TEST = 'question.how-to-write-a-function-test',
  QUESTION_HOW_TO_ENABLE_TYPEAHEAD = 'question.how-to-enable-typeahead',
  QUESTION_HOW_TO_WRITE_A_SERVICE_POST_VALIDATION = 'question.how-to-write-a-service-post-validation',
  QUESTION_WHY_DO_I_SEE_ERROR_WITH_ASSOCIATION_PROPERTY_TYPE = 'question.why-do-i-see-error-with-association-property-type',
  QUESTION_HOW_TO_WRITE_SERVICE_CONNECTION_TEST_DATA = 'question.how-to-write-service-connection-test-data',
  QUESTION_HOW_TO_CREATE_A_DATA_ELEMENT = 'question.how-to-create-a-data-element',

  // sdlc
  QUESTION_WHAT_ARE_PROJECT_ROLES = 'question.what-are-project-roles',

  // contexts
  CONTEXT_CLASS_EDITOR = 'context.class-editor',
  CONTEXT_SERVICE_TEST_EDITOR = 'context.service-editor.test',
  CONTEXT_DATA_ELEMENT_EDITOR = 'context.data-element-editor',
  CONTEXT_MAPPING_TEST_EDITOR = 'context.mapping-editor.test',
  // application cards
  APPLICATION_PRODUCTION = 'application.production',
  APPLICATION_SANDBOX = 'application.sandbox',
  APPLICATION_RULE_ENGAGEMENT = 'application.rule-engagement',
}

export const CORE_CONTEXTUAL_DOCUMENTATION_CONFIG: ContextualDocumentationConfig =
  {
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_EDITOR]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONTEXT_CLASS_EDITOR,
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_DERIVED_PROPERTY_LAMBDA_EDITOR]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_A_CONSTRAINT_LAMBDA,
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_CONTRAINT_LAMBDA_EDITOR]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_A_CONSTRAINT_LAMBDA,
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SERVICE_EDITOR_TEST]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONTEXT_SERVICE_TEST_EDITOR,
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MAPPING_EDITOR_TEST]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONTEXT_MAPPING_TEST_EDITOR,
    [LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATA_ELEMENT_EDITOR]:
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONTEXT_DATA_ELEMENT_EDITOR,
  };
