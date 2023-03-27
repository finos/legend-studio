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
import { BlankPanelContent, EnvelopIcon } from '@finos/legend-art';
import { DataSpaceSupportEmail } from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';

const DataSpaceSupportEmailViewer = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    dataSpaceSupportEmail: DataSpaceSupportEmail;
  }) => {
    const { dataSpaceSupportEmail } = props;

    return (
      <div className="data-space__viewer__support-email">
        <div className="data-space__viewer__support-email__entry">
          <div className="data-space__viewer__support-email__entry__icon">
            <EnvelopIcon />
          </div>
          <a
            href={`mailto:${dataSpaceSupportEmail.address}`}
            className="data-space__viewer__support-email__entry__content"
          >
            {dataSpaceSupportEmail.address}
          </a>
        </div>
      </div>
    );
  },
);

const DataSpaceSupport = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const supportInfo =
      dataSpaceViewerState.dataSpaceAnalysisResult.supportInfo;

    if (supportInfo === undefined) {
      return <BlankPanelContent>No support info available</BlankPanelContent>;
    } else if (supportInfo instanceof DataSpaceSupportEmail) {
      return (
        <DataSpaceSupportEmailViewer
          dataSpaceViewerState={dataSpaceViewerState}
          dataSpaceSupportEmail={supportInfo}
        />
      );
    }
    return (
      <BlankPanelContent>{`Can't display support info`}</BlankPanelContent>
    );
  },
);

export const DataSpaceSupportPanel = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    return (
      <div className="data-space__viewer__panel__content data-space__viewer__support-info">
        <DataSpaceSupport dataSpaceViewerState={dataSpaceViewerState} />
      </div>
    );
  },
);
