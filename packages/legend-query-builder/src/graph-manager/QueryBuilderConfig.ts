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

import { SerializationFactory } from '@finos/legend-shared';
import { createModelSchema, optional, primitive } from 'serializr';

export class QueryBuilderConfig {
  /**
   * This flag is to enable export to cube
   */
  TEMPORARY__enableExportToCube = false;

  /**
   * This flag is to disable query builder chat features
   */
  TEMPORARY__disableQueryBuilderChat = false;

  /**
   * This flag is to enable AG-GRID enterprise mode
   */
  TEMPORARY__enableGridEnterpriseMode = false;

  /**
   * This is the URL of the LegendAI service
   */
  legendAIServiceURL = '';

  /**
   * This is the URL of the zipkin trace
   */
  zipkinTraceBaseURL = '';

  /**
   * This flag is to disable the "edit pure" button
   * in cases where it is not needed (i.e., VS Code extension)
   */
  disableEditPure = false;

  /**
   * This flag is to disable the "show pure" button
   * in cases where it is not needed (i.e., VS Code extension)
   */
  disableShowPure = false;

  static readonly serialization = new SerializationFactory(
    createModelSchema(QueryBuilderConfig, {
      TEMPORARY__disableQueryBuilderChat: optional(primitive()),
      TEMPORARY__enableExportToCube: optional(primitive()),
      TEMPORARY__enableGridEnterpriseMode: optional(primitive()),
      legendAIServiceURL: optional(primitive()),
      zipkinTraceBaseURL: optional(primitive()),
    }),
  );
}
