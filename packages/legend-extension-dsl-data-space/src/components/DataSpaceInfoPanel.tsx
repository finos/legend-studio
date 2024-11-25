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
import { ExternalLinkIcon, PencilIcon } from '@finos/legend-art';
import { extractElementNameFromPath } from '@finos/legend-graph';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { useApplicationStore } from '@finos/legend-application';

export const DataSpaceInfoPanel = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;

    const viewProject = (): void => dataSpaceViewerState.viewProject(undefined);
    const viewDataSpaceInProject = (): void =>
      dataSpaceViewerState.viewProject(analysisResult.path);
    const viewDataSpaceInSDLCProject = (): void => {
      dataSpaceViewerState
        .viewSDLCProject(analysisResult.path)
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <div className="data-space__viewer__panel">
        <div className="data-space__viewer__panel__header">
          <div className="data-space__viewer__panel__header__label">Info</div>
        </div>
        <div className="data-space__viewer__panel__content">
          <div className="data-space__viewer__info">
            <div className="data-space__viewer__info__section">
              <div className="data-space__viewer__info__section__entry">
                <div className="data-space__viewer__info__project-info__label">
                  Project
                </div>
                <button
                  className="data-space__viewer__info__project-info__value"
                  tabIndex={-1}
                  title="Click to View Project"
                  onClick={viewProject}
                >
                  {generateGAVCoordinates(
                    dataSpaceViewerState.groupId,
                    dataSpaceViewerState.artifactId,
                    dataSpaceViewerState.versionId,
                  )}
                </button>
                <button
                  className="data-space__viewer__info__project-info__link"
                  tabIndex={-1}
                  title="View Project"
                  onClick={viewProject}
                >
                  <ExternalLinkIcon />
                </button>
              </div>
              <div className="data-space__viewer__info__section__entry">
                <div className="data-space__viewer__info__project-info__label">
                  Data Product
                </div>
                <button
                  className="data-space__viewer__info__project-info__value"
                  tabIndex={-1}
                  title="Click to View Data Product"
                  onClick={viewDataSpaceInProject}
                >
                  {analysisResult.path}
                </button>
                <button
                  className="data-space__viewer__info__project-info__link"
                  tabIndex={-1}
                  title="Edit Data Product"
                  onClick={viewDataSpaceInSDLCProject}
                >
                  <PencilIcon />
                </button>
                <button
                  className="data-space__viewer__info__project-info__link"
                  tabIndex={-1}
                  title="View Data Product"
                  onClick={viewDataSpaceInProject}
                >
                  <ExternalLinkIcon />
                </button>
              </div>
            </div>
            <div className="data-space__viewer__info__section">
              <div className="data-space__viewer__info__section__title">
                Tagged Values
              </div>
              {analysisResult.taggedValues.length !== 0 &&
                analysisResult.taggedValues.map((taggedValue) => (
                  <div
                    key={taggedValue._UUID}
                    className="data-space__viewer__info__section__entry"
                  >
                    <div
                      className="data-space__viewer__info__tagged-value__tag"
                      title={`${taggedValue.profile}.${taggedValue.tag}`}
                    >
                      {`${extractElementNameFromPath(taggedValue.profile)}.${
                        taggedValue.tag
                      }`}
                    </div>
                    <div className="data-space__viewer__info__tagged-value__value">
                      {taggedValue.value}
                    </div>
                  </div>
                ))}
              {analysisResult.taggedValues.length === 0 && (
                <div className="data-space__viewer__info__section__placeholder">
                  (empty)
                </div>
              )}
            </div>
            <div className="data-space__viewer__info__section">
              <div className="data-space__viewer__info__section__title">
                Stereotypes
              </div>
              {analysisResult.stereotypes.length !== 0 &&
                analysisResult.stereotypes.map((stereotype) => (
                  <div
                    key={stereotype._UUID}
                    className="data-space__viewer__info__section__entry"
                    title={`${stereotype.profile}.${stereotype.value}`}
                  >
                    <div className="data-space__viewer__info__steoreotype">
                      {`${extractElementNameFromPath(stereotype.profile)}.${
                        stereotype.value
                      }`}
                    </div>
                  </div>
                ))}
              {analysisResult.stereotypes.length === 0 && (
                <div className="data-space__viewer__info__section__placeholder">
                  (empty)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
