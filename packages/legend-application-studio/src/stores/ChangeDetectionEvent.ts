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

export enum CHANGE_DETECTION_EVENT {
  // TODO: split this into specific events
  CHANGE_DETECTION__FAILURE = 'change-detection.failure',

  CHANGE_DETECTION_RESTART__SUCCESS = 'change-detection.restart.success',

  CHANGE_DETECTION_COMPUTE_CHANGES__SUCCESS = 'change-detection.computation.changes.success',
  CHANGE_DETECTION_COMPUTE_CONFLICT_RESOLUTION_CONFLICTS__SUCCESS = 'change-detection.computation.conflicts.success',

  CHANGE_DETECTION_BUILD_GRAPH_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.graph.success',
  CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.local.success',
  CHANGE_DETECTION_BUILD_WORKSPACE_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.workspace.success',
  CHANGE_DETECTION_BUILD_PROJECT_LATEST_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.project-latest.success',
  CHANGE_DETECTION_COMPUTE_WORKSPACE_UPDATE_CONFLICTS__SUCCESS = 'change-detection.hash-indexing.workspace-update.success',

  CHANGE_DETECTION_PRECOMPUTE_GRAPH_HASHES__SUCCESS = 'change-detection.graph.pre-hash.success',
  CHANGE_DETECTION_OBSERVE_GRAPH__SUCCESS = 'change-detection.graph.observation.success',
}
