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
  CHANGE_DETECTION_FAILURE = 'change-detection.failure',

  CHANGE_DETECTION_RESTARTED = 'change-detection.restart.success',

  CHANGE_DETECTION_CHANGES_COMPUTED = 'change-detection.computation.changes.success',
  CHANGE_DETECTION_CONFLICT_RESOLUTION_CONFLICTS_COMPUTED = 'change-detection.computation.conflicts.success',

  CHANGE_DETECTION_GRAPH_HASH_SNAPSHOTED = 'change-detection.hash-indexing.graph.success',
  CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT = 'change-detection.hash-indexing.local.success',
  CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT = 'change-detection.hash-indexing.workspace.success',
  CHANGE_DETECTION_PROJECT_LATEST_HASHES_INDEX_BUILT = 'change-detection.hash-indexing.project-latest.success',
  CHANGE_DETECTION_WORKSPACE_UPDATE_CONFLICTS_COMPUTED = 'change-detection.hash-indexing.workspace-update.success',

  CHANGE_DETECTION_GRAPH_HASHES_PRECOMPUTED = 'change-detection.graph.pre-hash.success',
  CHANGE_DETECTION_GRAPH_OBSERVED = 'change-detection.graph.observation.success',
}
