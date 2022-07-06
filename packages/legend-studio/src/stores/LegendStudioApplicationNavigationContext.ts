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
  SETUP = 'setup',
  SETUP_CREATE_PROJECT_DIALOG = 'setup.create-project-dialog',

  // EDITOR
  EDITOR = 'editor',

  MODEL_LOADER = 'editor.model-loader',
  TEXT_MODE_EDITOR = 'editor.text-mode-editor',

  CLASS_EDITOR = 'editor.class-editor',
  CLASS_EDITOR_PROPERTIES = 'editor.class-editor.properties',
  CLASS_EDITOR_DERIVED_PROPERTIES = 'editor.class-editor.derived-properties',
  CLASS_EDITOR_CONSTRAINTS = 'editor.class-editor.constraints',
  CLASS_EDITOR_SUPERTYPES = 'editor.class-editor.supertypes',
  CLASS_DERIVED_PROPERTY_LAMBDA_EDITOR = 'editor.class-editor.derived-properties.lambda-editor',
  CLASS_CONTRAINT_LAMBDA_EDITOR = 'editor.class-editor.constraints.lambda-editor',

  MAPPING_EDITOR = 'editor.mapping-editor',
}
