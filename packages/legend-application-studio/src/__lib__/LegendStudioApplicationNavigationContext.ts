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

export enum LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY {
  // SETUP
  SETUP = 'studio.setup',
  SETUP_CREATE_PROJECT_DIALOG = 'studio.setup.create-project-dialog',

  // EDITOR
  EDITOR = 'studio.editor',

  MODEL_LOADER = 'studio.editor.model-loader',
  TEXT_MODE_EDITOR = 'studio.editor.text-mode-editor',
  EMBEDDED_QUERY_BUILDER = 'studio.editor.embedded-query-builder',

  CLASS_EDITOR = 'studio.editor.class-editor',
  CLASS_EDITOR_PROPERTIES = 'studio.editor.class-editor.properties',
  CLASS_EDITOR_DERIVED_PROPERTIES = 'studio.editor.class-editor.derived-properties',
  CLASS_EDITOR_CONSTRAINTS = 'studio.editor.class-editor.constraints',
  CLASS_EDITOR_SUPERTYPES = 'studio.editor.class-editor.supertypes',
  CLASS_DERIVED_PROPERTY_LAMBDA_EDITOR = 'studio.editor.class-editor.derived-properties.lambda-editor',
  CLASS_CONTRAINT_LAMBDA_EDITOR = 'studio.editor.class-editor.constraints.lambda-editor',

  PROFILE_EDITOR = 'studio.editor.profile-editor',
  ASSOCIATION_EDITOR = 'studio.editor.association-editor',
  ENUMERATION_EDITOR = 'studio.editor.enumeration-editor',
  FUNCTION_EDITOR = 'studio.editor.function-editor',

  MAPPING_EDITOR = 'studio.editor.mapping-editor',
  CLASS_MAPPING_EDITOR = 'studio.editor.mapping-editor.class-mapping-editor',
  OPERATION_CLASS_MAPPING_EDITOR = 'studio.editor.mapping-editor.operation-class-mapping-editor',
  ENUMERATION_MAPPING_EDITOR = 'studio.editor.mapping-editor.enumeration-mapping-editor',
  MAPPING_EXECUTION_EDITOR = 'studio.editor.mapping-editor.execution-editor',
  DEPRECATED_MAPPING_TEST_EDITOR = 'studio.editor.mapping-editor.deprecated-test-editor',
  MAPPING_TEST_EDITOR = 'studio.editor.mapping-editor.test-editor',

  RUNTIME_EDITOR = 'studio.editor.runtime-editor',

  CONNECTION_EDITOR = 'studio.editor.connection-editor',
  DATABASE_BUILDER = 'studio.editor.connection-editor.database-builder',

  SERVICE_EDITOR = 'studio.editor.service-editor',
  SERVICE_EDITOR_EXECUTION = 'studio.editor.service-editor.execution',
  SERVICE_EDITOR_TEST = 'studio.editor.service-editor.test',

  DATA_ELEMENT_EDITOR = 'studio.editor.data-element-editor',
}
