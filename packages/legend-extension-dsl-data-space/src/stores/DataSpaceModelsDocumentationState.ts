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

import { type DataSpaceViewerState } from './DataSpaceViewerState.js';
import type { CommandRegistrar } from '@finos/legend-application';
import { DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY } from '../__lib__/DSL_DataSpace_LegendApplicationCommand.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from './DataSpaceViewerNavigation.js';
import { ViewerModelsDocumentationState } from '@finos/legend-lego/model-documentation';

export class DataSpaceViewerModelsDocumentationState
  extends ViewerModelsDocumentationState
  implements CommandRegistrar
{
  readonly dataSpaceViewerState: DataSpaceViewerState;

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    super(dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs);

    this.dataSpaceViewerState = dataSpaceViewerState;
  }

  registerCommands(): void {
    const DEFAULT_TRIGGER = (): boolean =>
      this.dataSpaceViewerState.currentActivity ===
      DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION;
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.SEARCH_DOCUMENTATION,
      trigger: DEFAULT_TRIGGER,
      action: () => this.focusSearchInput(),
    });
  }

  deregisterCommands(): void {
    [
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.SEARCH_DOCUMENTATION,
    ].forEach((commandKey) =>
      this.dataSpaceViewerState.applicationStore.commandService.deregisterCommand(
        commandKey,
      ),
    );
  }
}
