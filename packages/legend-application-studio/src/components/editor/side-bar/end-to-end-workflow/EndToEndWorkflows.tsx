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

import {
  PanelContent,
  PURE_ConnectionIcon,
  PURE_UnknownElementTypeIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { type GlobalEndToEndWorkflowState } from '../../../../stores/editor/sidebar-state/end-to-end-workflow/GlobalEndToEndFlowState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { END_TO_END_WORKFLOWS } from '../../../../stores/editor/editor-state/end-to-end-workflow-state/EndToEndWorkflowEditorState.js';
import { prettyCONSTName } from '@finos/legend-shared';

export const getWorkflowIcon = (currentFlow: string): React.ReactNode => {
  if (currentFlow === END_TO_END_WORKFLOWS.CREATE_QUERY_FROM_CONNECTION) {
    return (
      <div
        title="Create Query From Connection"
        className="icon icon--connection color--connection"
      >
        <PURE_ConnectionIcon />
      </div>
    );
  } else {
    return (
      <div title="Query From Workflow" className="icon">
        <PURE_UnknownElementTypeIcon />
      </div>
    );
  }
};

export const EndToEndWorkflow = observer(
  (props: { globalEndToEndWorkflowState: GlobalEndToEndWorkflowState }) => {
    const { globalEndToEndWorkflowState } = props;

    const openWorkflow = (
      event: React.MouseEvent<HTMLDivElement>,
      flow: string,
    ): void => {
      event.stopPropagation();
      event.preventDefault();
      globalEndToEndWorkflowState.visitWorkflow(flow);
    };

    const endToEndWorkflow = (): React.ReactNode => (
      <>
        {Object.values(END_TO_END_WORKFLOWS).map((flow) => (
          <div className="side-bar__panel__item" key={flow}>
            <div
              className="end-to-end-workflow__container"
              onClick={(event) => {
                openWorkflow(event, flow);
              }}
            >
              <div className="end-to-end-workflow__container__icon">
                {getWorkflowIcon(flow)}
              </div>
              <div className="end-to-end-workflow__container__name">
                {prettyCONSTName(flow)}
              </div>
            </div>
          </div>
        ))}
      </>
    );

    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.END_TO_END_WORKFLOW}
        className="panel"
      >
        <div className="panel__header side-bar__header">
          <div className="panel__header__title">
            <div className="panel__header__title__content side-bar__header__title__content">
              Guided End to End Workflows
            </div>
          </div>
        </div>
        <div className="panel__content side-bar__content">
          <div className="panel side-bar__panel">
            <PanelContent>{endToEndWorkflow()}</PanelContent>
          </div>
        </div>
      </div>
    );
  },
);
