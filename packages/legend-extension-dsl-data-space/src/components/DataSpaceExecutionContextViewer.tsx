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
  CustomSelectorInput,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  PlayIcon,
} from '@finos/legend-art';
import { type PackageableRuntime } from '@finos/legend-graph';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import type { DataSpaceExecutionContextAnalysisResult } from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { useApplicationStore } from '@finos/legend-application';

type ExecutionContextOption = {
  label: string;
  value: DataSpaceExecutionContextAnalysisResult;
};
const buildExecutionContextOption = (
  value: DataSpaceExecutionContextAnalysisResult,
): ExecutionContextOption => ({
  label: value.name,
  value: value,
});

type RuntimeOption = {
  label: string;
  value: PackageableRuntime;
};
const buildRuntimeOption = (value: PackageableRuntime): RuntimeOption => ({
  label: value.name,
  value: value,
});

export const DataSpaceExecutionContextViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const executionContexts = Array.from(
      dataSpaceViewerState.dataSpaceAnalysisResult.executionContextsIndex.values(),
    );

    // execution
    const executionContextOptions = executionContexts.map(
      buildExecutionContextOption,
    );
    const selectedExecutionContextOption = buildExecutionContextOption(
      dataSpaceViewerState.currentExecutionContext,
    );
    const onExecutionContextOptionChange = (
      option: ExecutionContextOption,
    ): void => {
      if (option.value !== dataSpaceViewerState.currentExecutionContext) {
        dataSpaceViewerState.setCurrentExecutionContext(option.value);
      }
    };
    const formatExecutionContextOptionLabel = (
      option: ExecutionContextOption,
    ): React.ReactNode => (
      <div className="data-space__viewer__execution-context__entry__content__dropdown__option">
        <div className="data-space__viewer__execution-context__entry__content__dropdown__option__label">
          {option.label}
        </div>
        {option.value === analysisResult.defaultExecutionContext && (
          <div className="data-space__viewer__execution-context__entry__content__dropdown__option__tag">
            default
          </div>
        )}
      </div>
    );

    // runtime
    const runtimeOptions =
      dataSpaceViewerState.currentExecutionContext.compatibleRuntimes.map(
        buildRuntimeOption,
      );
    const selectedRuntimeOption = buildRuntimeOption(
      dataSpaceViewerState.currentRuntime,
    );
    const onRuntimeOptionChange = (option: RuntimeOption): void => {
      if (option.value !== dataSpaceViewerState.currentRuntime) {
        dataSpaceViewerState.setCurrentRuntime(option.value);
      }
    };
    const formatRuntimeOptionLabel = (
      option: RuntimeOption,
    ): React.ReactNode => (
      <div className="data-space__viewer__execution-context__entry__content__dropdown__option">
        <div className="data-space__viewer__execution-context__entry__content__dropdown__option__label">
          {option.label}
        </div>
        {option.value ===
          dataSpaceViewerState.currentExecutionContext.defaultRuntime && (
          <div className="data-space__viewer__execution-context__entry__content__dropdown__option__tag">
            default
          </div>
        )}
      </div>
    );

    return (
      <div className="data-space__viewer__panel">
        <div className="data-space__viewer__panel__header">
          <div className="data-space__viewer__panel__header__label">
            Execution Context
          </div>
        </div>
        <div className="data-space__viewer__panel__content">
          <div className="data-space__viewer__execution-context">
            <div className="data-space__viewer__execution-context__entry">
              <div className="data-space__viewer__execution-context__entry__icon">
                <PlayIcon className="data-space__viewer__execution-context__context-icon" />
              </div>
              <div className="data-space__viewer__execution-context__entry__content data-space__viewer__execution-context__entry__content__dropdown__container">
                <CustomSelectorInput
                  className="data-space__viewer__execution-context__entry__content__dropdown"
                  options={executionContextOptions}
                  onChange={onExecutionContextOptionChange}
                  value={selectedExecutionContextOption}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                  formatOptionLabel={formatExecutionContextOptionLabel}
                />
              </div>
            </div>
            <div className="data-space__viewer__execution-context__entry data-space__viewer__execution-context__mapping">
              <div className="data-space__viewer__execution-context__entry__icon">
                <PURE_MappingIcon />
              </div>
              <div className="data-space__viewer__execution-context__entry__content data-space__viewer__execution-context__entry__content__text">
                {dataSpaceViewerState.currentExecutionContext.mapping.path}
              </div>
            </div>
            <div className="data-space__viewer__execution-context__entry">
              <div className="data-space__viewer__execution-context__entry__icon">
                <PURE_RuntimeIcon />
              </div>
              <div className="data-space__viewer__execution-context__entry__content data-space__viewer__execution-context__entry__content__dropdown__container">
                <CustomSelectorInput
                  className="data-space__viewer__execution-context__entry__content__dropdown"
                  options={runtimeOptions}
                  onChange={onRuntimeOptionChange}
                  value={selectedRuntimeOption}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                  formatOptionLabel={formatRuntimeOptionLabel}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
