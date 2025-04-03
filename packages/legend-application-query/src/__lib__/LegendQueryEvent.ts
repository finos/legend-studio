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

  VIEW_QUERY__SUCCESS = 'query-editor.view-query.success',
  CREATE_QUERY__SUCCESS = 'query-editor.create-query.success',
  UPDATE_QUERY__SUCCESS = 'query-editor.update-query.success',
  RENAME_QUERY__SUCCESS = 'query-editor.rename.query.success',
  INITIALIZE_QUERY_STATE__SUCCESS = 'query-editor.initialize-query-state.success',
  LEGENDAI_QUERY_CHAT__OPENED = 'query-editor.legendai-query-chat.opened',

  VIEW_PROJECT__LAUNCH = 'query-editor.view-project.launch',
  VIEW_SDLC_PROJECT__LAUNCH = 'query-editor.view-sdlc-project.launch',

  LOCAL_STORAGE_PERSIST_ERROR = 'LOCAL_STORAGE_PERSIST_ERROR',
  HOSTED_DATA_CUBE__LAUNCH = 'query-editor.hosted-data-cube.launch',
}
