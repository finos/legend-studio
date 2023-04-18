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

export enum QUERY_BUILDER_EVENT {
  RUN_QUERY__LAUNCH = 'query-builder.run-query.launch',
  GENERATE_EXECUTION_PLAN__LAUNCH = 'query-builder.generate-plan.launch',
  DEBUG_EXECUTION_PLAN__LAUNCH = 'query-builder.debug-plan.launch',

  RUN_QUERY__SUCCESS = 'query-builder.run-query.success',
  GENERATE_EXECUTION_PLAN__SUCCESS = 'query-builder.generate-plan.success',
  DEBUG_EXECUTION_PLAN__SUCCESS = 'query-builder.debug-plan.success',
  BUILD_EXECUTION_PLAN__SUCCESS = 'query-builder.build-plan.success',
}
