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
  PURE_DataProductIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  PlayIcon,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for later re-enable of Refresh mapping-provider access button
  RefreshIcon,
} from '@finos/legend-art';
import {
  Button,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for later re-enable of Refresh mapping-provider access button
  IconButton,
} from '@mui/material';
import { type PackageableRuntime } from '@finos/legend-graph';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import type { DataSpaceExecutionContextAnalysisResult } from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import type { DataSpaceMappingProviderAccessState } from '../stores/DataSpaceMappingProviderAccessState.js';
import { useApplicationStore } from '@finos/legend-application';
import { DataProductAPGAccessRequestControl } from '@finos/legend-extension-dsl-data-product';

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

// Kept for later re-enable of the mapping-provider Request Access flow.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DataSpaceMappingProviderAccessControl = observer(
  (props: {
    mappingProviderAccessState: DataSpaceMappingProviderAccessState;
    tokenProvider: () => string | undefined;
  }) => {
    const { mappingProviderAccessState, tokenProvider } = props;
    if (
      mappingProviderAccessState.modelAPGState &&
      mappingProviderAccessState.dataAccessState
    ) {
      return (
        <DataProductAPGAccessRequestControl
          apgState={mappingProviderAccessState.modelAPGState}
          dataAccessState={mappingProviderAccessState.dataAccessState}
          tokenProvider={tokenProvider}
        />
      );
    }
    const isInProgress =
      mappingProviderAccessState.initializingState.isInProgress;
    return (
      <Button
        variant="contained"
        color="info"
        disabled={true}
        title={
          isInProgress
            ? 'Loading Data Product access...'
            : (mappingProviderAccessState.errorMessage ??
              'Data Product access is not available for this mapping provider')
        }
      >
        {isInProgress ? 'Loading...' : 'Unavailable'}
      </Button>
    );
  },
);

const DataSpaceMappingProviderEntry = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    currentExecutionContext: DataSpaceExecutionContextAnalysisResult;
    mappingProviderAccessState: DataSpaceMappingProviderAccessState | undefined;
  }) => {
    const {
      dataSpaceViewerState,
      currentExecutionContext,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for later re-enable of Request Access
      mappingProviderAccessState,
    } = props;
    const mappingProvider = currentExecutionContext.mappingProvider;
    if (!mappingProvider) {
      return null;
    }
    const onOpenDataProduct = (): void => {
      if (dataSpaceViewerState.viewDataProduct) {
        dataSpaceViewerState.viewDataProduct(
          dataSpaceViewerState.groupId,
          dataSpaceViewerState.artifactId,
          dataSpaceViewerState.versionId,
          mappingProvider.element,
        );
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tokenProvider =
      dataSpaceViewerState.mappingProviderAccessConfig?.tokenProvider ??
      ((): undefined => undefined);
    return (
      <>
        <div className="data-space__viewer__execution-context__entry__icon">
          <PURE_DataProductIcon />
        </div>
        <div className="data-space__viewer__execution-context__entry__content data-space__viewer__execution-context__entry__content__text data-space__viewer__execution-context__mapping-provider__content">
          <span>
            {mappingProvider.element}
            {mappingProvider.keys[0] ? `.${mappingProvider.keys[0]}` : ''}
          </span>
          <div className="data-space__viewer__execution-context__mapping-provider__actions">
            {/*
              Request Access control is temporarily hidden
              {mappingProviderAccessState && (
                <DataSpaceMappingProviderAccessControl
                  mappingProviderAccessState={mappingProviderAccessState}
                  tokenProvider={tokenProvider}
                />
              )}
            */}
            <Button
              variant="contained"
              color="primary"
              onClick={onOpenDataProduct}
              sx={{
                display: !dataSpaceViewerState.viewDataProduct
                  ? 'none'
                  : undefined,
              }}
            >
              Open DataProduct
            </Button>
          </div>
        </div>
      </>
    );
  },
);

export const DataSpaceExecutionContextViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const currentExecutionContext =
      dataSpaceViewerState.currentExecutionContext;
    if (!currentExecutionContext) {
      return null;
    }
    const executionContexts = Array.from(
      dataSpaceViewerState.dataSpaceAnalysisResult.executionContextsIndex.values(),
    );
    const mappingProviderAccessState =
      dataSpaceViewerState.currentMappingProviderAccessState;

    // execution
    const executionContextOptions = executionContexts.map(
      buildExecutionContextOption,
    );
    const selectedExecutionContextOption = buildExecutionContextOption(
      currentExecutionContext,
    );
    const onExecutionContextOptionChange = (
      option: ExecutionContextOption,
    ): void => {
      if (option.value !== currentExecutionContext) {
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
    const currentRuntime = dataSpaceViewerState.currentRuntime;
    const runtimeOptions =
      currentExecutionContext.compatibleRuntimes.map(buildRuntimeOption);
    const selectedRuntimeOption = currentRuntime
      ? buildRuntimeOption(currentRuntime)
      : undefined;
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
        {option.value === currentExecutionContext.defaultRuntime && (
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
                {/*
                  Refresh mapping-provider access button is temporarily hidden.
                  The underlying `refreshCurrentMappingProviderAccessState`
                  action and `mappingProviderAccessState` wiring are
                  intentionally preserved so this can be re-enabled without
                  re-plumbing.

                  {mappingProviderAccessState && (
                    <IconButton
                      className="data-space__viewer__execution-context__refresh-btn"
                      size="small"
                      color="primary"
                      title="Refresh Data Product access"
                      disabled={
                        mappingProviderAccessState.initializingState.isInProgress
                      }
                      onClick={(): void =>
                        dataSpaceViewerState.refreshCurrentMappingProviderAccessState()
                      }
                    >
                      <RefreshIcon />
                    </IconButton>
                  )}
                */}
              </div>
            </div>
            <div className="data-space__viewer__execution-context__entry data-space__viewer__execution-context__mapping">
              {currentExecutionContext.mappingProvider ? (
                <DataSpaceMappingProviderEntry
                  dataSpaceViewerState={dataSpaceViewerState}
                  currentExecutionContext={currentExecutionContext}
                  mappingProviderAccessState={mappingProviderAccessState}
                />
              ) : (
                <>
                  <div className="data-space__viewer__execution-context__entry__icon">
                    <PURE_MappingIcon />
                  </div>
                  <div className="data-space__viewer__execution-context__entry__content data-space__viewer__execution-context__entry__content__text">
                    {currentExecutionContext.mapping.path}
                  </div>
                </>
              )}
            </div>
            {selectedRuntimeOption && (
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
            )}
          </div>
        </div>
      </div>
    );
  },
);
