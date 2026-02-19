/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  getCollapsiblePanelGroupProps,
  type ResizablePanelHandlerProps,
} from '@finos/legend-art';
import { DataQualityRelationValidationsEditor } from './DataQualityRelationValidationsEditor.js';
import type { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';
import { DataQualityRelationValidationSuggestionPanel } from './DataQualityRelationValidationSuggestionPanel.js';

export const DataQualityRelationValidationContainer = observer(
  (props: {
    dataQualityRelationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { dataQualityRelationValidationConfigurationState: state } = props;
    const { suggestionPanelState } = state.suggestedValidationsState;
    const suggestionsState = state.suggestedValidationsState;

    // Create resize handler for snapping effect
    const resizeSuggestionPanel = (
      handleProps: ResizablePanelHandlerProps,
    ): void =>
      suggestionPanelState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .width,
      );

    // Get collapsible panel props
    const collapsibleSuggestionPanelGroupProps = getCollapsiblePanelGroupProps(
      suggestionPanelState.size === 0,
      {
        onStopResize: resizeSuggestionPanel,
        size: suggestionPanelState.size,
      },
    );

    const isLoading = suggestionsState.fetchState.isInProgress;

    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel
          {...collapsibleSuggestionPanelGroupProps.remainingPanel}
          minSize={120}
        >
          <DataQualityRelationValidationsEditor
            dataQualityRelationValidationConfigurationState={state}
          />
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-250)" />
        </ResizablePanelSplitter>
        <ResizablePanel
          {...collapsibleSuggestionPanelGroupProps.collapsiblePanel}
          minSize={0}
        >
          <PanelLoadingIndicator isLoading={isLoading} />
          <DataQualityRelationValidationSuggestionPanel
            configurationState={state}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
