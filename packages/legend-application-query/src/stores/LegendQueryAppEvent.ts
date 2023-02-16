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

export enum LEGEND_QUERY_APP_EVENT {
  // TODO: split this into specific events
  GENERIC_FAILURE = 'application.failure.generic',

  QUERY_VIEWED = 'query-editor.view-query',
  QUERY_CREATED = 'query-editor.create-query.success',
  QUERY_UPDATED = 'query-editor.update-query.success',
}
