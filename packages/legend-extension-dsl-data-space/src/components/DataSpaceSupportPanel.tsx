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
import {
  BlankPanelContent,
  DocumentationIcon,
  EnvelopeIcon,
  HomeIcon,
  QuestionAnswerIcon,
  SparkleIcon,
  SupportIcon,
} from '@finos/legend-art';
import {
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';

const DataSpaceSupportEmailViewer = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    supportInfo: DataSpaceSupportEmail;
  }) => {
    const { supportInfo } = props;

    return (
      <div className="data-space__viewer__support__section">
        <div className="data-space__viewer__support__entry">
          <div className="data-space__viewer__support__entry__icon">
            <EnvelopeIcon />
          </div>
          <a
            href={`mailto:${supportInfo.address}`}
            className="data-space__viewer__support__entry__content"
          >
            {supportInfo.address}
          </a>
        </div>
      </div>
    );
  },
);

const DataSpaceSupportCombinedInfoViewer = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    supportInfo: DataSpaceSupportCombinedInfo;
  }) => {
    const { supportInfo } = props;

    return (
      <>
        <div className="data-space__viewer__support__section">
          <div className="data-space__viewer__support__entry" title="Website">
            <div className="data-space__viewer__support__entry__icon data-space__viewer__support__entry__icon--website">
              <HomeIcon />
            </div>
            {supportInfo.website ? (
              <a
                href={supportInfo.website}
                className="data-space__viewer__support__entry__content"
              >
                {supportInfo.website}
              </a>
            ) : (
              <div className="data-space__viewer__support__entry__content">
                (not specified)
              </div>
            )}
          </div>
          <div
            className="data-space__viewer__support__entry"
            title="Documentation"
          >
            <div className="data-space__viewer__support__entry__icon">
              <DocumentationIcon />
            </div>
            {supportInfo.documentationUrl ? (
              <a
                href={supportInfo.documentationUrl}
                className="data-space__viewer__support__entry__content"
              >
                {supportInfo.documentationUrl}
              </a>
            ) : (
              <div className="data-space__viewer__support__entry__content">
                (not specified)
              </div>
            )}
          </div>
          <div className="data-space__viewer__support__entry" title="Support">
            <div className="data-space__viewer__support__entry__icon data-space__viewer__support__entry__icon--support">
              <SupportIcon />
            </div>
            {supportInfo.supportUrl ? (
              <a
                href={supportInfo.supportUrl}
                className="data-space__viewer__support__entry__content"
              >
                {supportInfo.supportUrl}
              </a>
            ) : (
              <div className="data-space__viewer__support__entry__content">
                (not specified)
              </div>
            )}
          </div>
          <div className="data-space__viewer__support__entry" title="FAQ">
            <div className="data-space__viewer__support__entry__icon data-space__viewer__support__entry__icon--faq">
              <QuestionAnswerIcon />
            </div>
            {supportInfo.faqUrl ? (
              <a
                href={supportInfo.faqUrl}
                className="data-space__viewer__support__entry__content"
              >
                {supportInfo.faqUrl}
              </a>
            ) : (
              <div className="data-space__viewer__support__entry__content">
                (not specified)
              </div>
            )}
          </div>
        </div>
        {supportInfo.emails?.length && (
          <div className="data-space__viewer__support__section">
            {supportInfo.emails.map((email, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={idx} className="data-space__viewer__support__entry">
                <div className="data-space__viewer__support__entry__icon">
                  <EnvelopeIcon />
                </div>
                <a
                  href={`mailto:${email}`}
                  className="data-space__viewer__support__entry__content"
                >
                  {email}
                </a>
              </div>
            ))}
          </div>
        )}
      </>
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
          supportInfo={supportInfo}
        />
      );
    } else if (supportInfo instanceof DataSpaceSupportCombinedInfo) {
      return (
        <DataSpaceSupportCombinedInfoViewer
          dataSpaceViewerState={dataSpaceViewerState}
          supportInfo={supportInfo}
        />
      );
    }
    return (
      <div className="data-space__viewer__panel__content__placeholder">
        <SparkleIcon /> This is work in progress
      </div>
    );
  },
);

export const DataSpaceSupportPanel = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    return (
      <div className="data-space__viewer__panel">
        <div className="data-space__viewer__panel__header">
          <div className="data-space__viewer__panel__header__label">
            Support
          </div>
        </div>
        <div className="data-space__viewer__panel__content">
          <div className="data-space__viewer__support-info">
            <DataSpaceSupport dataSpaceViewerState={dataSpaceViewerState} />
          </div>
        </div>
      </div>
    );
  },
);
