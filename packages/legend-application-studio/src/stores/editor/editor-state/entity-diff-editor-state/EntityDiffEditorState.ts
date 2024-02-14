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

import { EditorDiffViewerState } from '../diff-viewer-state/EditorDiffViewerState.js';

export enum SPECIAL_REVISION_ALIAS {
  LOCAL = 'LOCAL_REVISION',
  WORKSPACE_BASE = 'WORKSPACE_BASE',
  WORKSPACE_HEAD = 'WORKSPACE_HEAD',
  WORKSPACE_UPDATE = 'WORKSPACE_UPDATE',
  PROJECT_HEAD = 'PROJECT_HEAD',
}

export const getPrettyLabelForRevision = (
  revision: SPECIAL_REVISION_ALIAS | string,
): string => {
  switch (revision) {
    case SPECIAL_REVISION_ALIAS.LOCAL:
      return 'Local';
    case SPECIAL_REVISION_ALIAS.WORKSPACE_BASE:
      return 'Workspace BASE';
    case SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD:
      return 'Workspace HEAD';
    case SPECIAL_REVISION_ALIAS.WORKSPACE_UPDATE:
      return 'Workspace UPDATE';
    case SPECIAL_REVISION_ALIAS.PROJECT_HEAD:
      return 'Project HEAD';
    default:
      return revision;
  }
};

export abstract class EntityDiffViewerState extends EditorDiffViewerState {
  abstract refresh(): void;
}
