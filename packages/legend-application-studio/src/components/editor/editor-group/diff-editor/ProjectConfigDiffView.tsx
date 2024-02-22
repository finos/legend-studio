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

import { observer } from 'mobx-react-lite';
import type { ProjectConfigurationDiffEditorState } from '../../../../stores/editor/editor-state/diff-viewer-state/ProjectConfigurationDiffEditorState.js';
import { CompareIcon } from '@finos/legend-art';
import { JSONDiffView } from '@finos/legend-lego/code-editor';
import { sortObjectKeys } from '@finos/legend-shared';
import { getPrettyLabelForRevision } from '../../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffEditorState.js';

export const ProjectConfigDiffView = observer(
  (props: { configDiffState: ProjectConfigurationDiffEditorState }) => {
    const { configDiffState } = props;

    return (
      <div className="entity-diff-view">
        <div className="entity-diff-view__header">
          <div className="entity-diff-view__header__info">
            <div className="entity-diff-view__header__info__revision-summary">
              <div className="entity-diff-view__header__info__revision-summary__revision">
                {getPrettyLabelForRevision(configDiffState.fromRevision)}
              </div>
              <div className="entity-diff-view__header__info__revision-summary__icon">
                <CompareIcon />
              </div>
              <div className="entity-diff-view__header__info__revision-summary__revision">
                {getPrettyLabelForRevision(configDiffState.toRevision)}
              </div>
            </div>
            <div className="entity-diff-view__header__info__revision-summary__icon">
              <CompareIcon />
            </div>
            <div className="entity-diff-view__header__info__revision-summary__revision">
              {getPrettyLabelForRevision(configDiffState.toRevision)}
            </div>
          </div>
        </div>
        <div className="entity-diff-view__content">
          <JSONDiffView
            from={sortObjectKeys(configDiffState.fromConfig)}
            to={sortObjectKeys(configDiffState.toConfig)}
          />
        </div>
      </div>
    );
  },
);
