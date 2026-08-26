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
import { LegendDataCubeSourceBuilderType } from '../../stores/builder/source/LegendDataCubeSourceBuilderState.js';
import { cn, useDropdownMenu } from '@finos/legend-art';
import {
  FormBadge_WIP,
  FormButton,
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
  FormLoadingIndicator,
} from '@finos/legend-data-cube';
import { LegendQueryDataCubeSourceBuilderState } from '../../stores/builder/source/LegendQueryDataCubeSourceBuilderState.js';
import { LegendQueryDataCubeSourceBuilder } from './source/LegendQueryDataCubeSourceBuilder.js';
import { FreeformTDSExpressionDataCubeSourceBuilder } from './source/FreeformTDSExpressionDataCubeSourceBuilder.js';
import { FreeformTDSExpressionDataCubeSourceBuilderState } from '../../stores/builder/source/FreeformTDSExpressionDataCubeSourceBuilderState.js';
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import { LocalFileDataCubeSourceBuilderState } from '../../stores/builder/source/LocalFileDataCubeSourceBuilderState.js';
import { LocalFileDataCubeSourceBuilder } from './source/LocalFileDataCubeSourceBuilder.js';
import { UserDefinedFunctionDataCubeSourceBuilderState } from '../../stores/builder/source/UserDefinedFunctionDataCubeSourceBuilderState.js';
import { UserDefinedFunctionDataCubeSourceBuilder } from './source/UserDefinedFunctionDataCubeSourceBuilder.js';
import { LakehouseProducerDataCubeSourceBuilderState } from '../../stores/builder/source/LakehouseProducerDataCubeSourceBuilderState.js';
import { LakehouseProducerDataCubeSourceBuilder } from './source/LakehouseProducerDataCubeSourceBuilder.js';
import { LakehouseConsumerDataCubeSourceBuilderState } from '../../stores/builder/source/LakehouseConsumerDataCubeSourceBuilderState.js';
import { LakehouseConsumerDataCubeSourceBuilder } from './source/LakehouseConsumerDataCubeSourceBuilder.js';

export const LegendDataCubeCreator = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const state = store.creator;
  const sourceBuilder = state.sourceBuilder;
  const selectedSourceType = sourceBuilder.label;
  const WIPSourceTypes = [LegendDataCubeSourceBuilderType.LOCAL_FILE];
  const [
    openSourceTypeDropdown,
    closeSourceTypeDropdown,
    sourceTypeDropdownProps,
    sourceTypeDropdownPropsOpen,
  ] = useDropdownMenu();

  return (
    <>
      {/*
        While creating, freeze the whole form: changing the source type or any of
        its settings mid-flight would be silently discarded when the creation
        completes and resets the creator, so it's clearer to not accept the input
        at all. `inert` also takes it out of the tab order, unlike pointer-events.
      */}
      <div
        className="h-[calc(100%_-_40px)] w-full px-2 pt-2"
        inert={state.finalizeState.isInProgress}
      >
        <div
          className={cn('h-full w-full border border-neutral-300 bg-white', {
            'opacity-50': state.finalizeState.isInProgress,
          })}
        >
          <div className="h-full w-full select-none">
            <div className="flex h-10 w-full items-center p-2">
              <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                Choose Source Type:
              </div>
              <FormDropdownMenuTrigger
                className="w-80"
                onClick={openSourceTypeDropdown}
                open={sourceTypeDropdownPropsOpen}
              >
                <div className="flex items-center">
                  {selectedSourceType}
                  {WIPSourceTypes.includes(selectedSourceType) && (
                    <FormBadge_WIP />
                  )}
                </div>
              </FormDropdownMenuTrigger>
              <FormDropdownMenu className="w-80" {...sourceTypeDropdownProps}>
                {[
                  LegendDataCubeSourceBuilderType.LEGEND_QUERY,
                  LegendDataCubeSourceBuilderType.LAKEHOUSE_CONSUMER,
                  LegendDataCubeSourceBuilderType.USER_DEFINED_FUNCTION,
                  LegendDataCubeSourceBuilderType.FREEFORM_TDS_EXPRESSION,
                  LegendDataCubeSourceBuilderType.LAKEHOUSE_PRODUCER,
                  LegendDataCubeSourceBuilderType.LOCAL_FILE,
                ].map((type) => (
                  <FormDropdownMenuItem
                    key={type}
                    onClick={() => {
                      state.changeSourceBuilder(type);
                      closeSourceTypeDropdown();
                    }}
                    autoFocus={type === selectedSourceType}
                  >
                    {type}
                    {WIPSourceTypes.includes(type) && <FormBadge_WIP />}
                  </FormDropdownMenuItem>
                ))}
              </FormDropdownMenu>
            </div>
            <div className="ml-2 h-[1px] w-[calc(100%_-_16px)] bg-neutral-200" />
            <div className="h-[calc(100%_-_41px)] w-full overflow-auto">
              {sourceBuilder instanceof
                LegendQueryDataCubeSourceBuilderState && (
                <LegendQueryDataCubeSourceBuilder
                  sourceBuilder={sourceBuilder}
                />
              )}
              {sourceBuilder instanceof
                FreeformTDSExpressionDataCubeSourceBuilderState && (
                <FreeformTDSExpressionDataCubeSourceBuilder
                  sourceBuilder={sourceBuilder}
                  store={store}
                />
              )}
              {sourceBuilder instanceof LocalFileDataCubeSourceBuilderState && (
                <LocalFileDataCubeSourceBuilder sourceBuilder={sourceBuilder} />
              )}
              {sourceBuilder instanceof
                UserDefinedFunctionDataCubeSourceBuilderState && (
                <UserDefinedFunctionDataCubeSourceBuilder
                  sourceBuilder={sourceBuilder}
                  store={store}
                />
              )}
              {sourceBuilder instanceof
                LakehouseProducerDataCubeSourceBuilderState && (
                <LakehouseProducerDataCubeSourceBuilder
                  sourceBuilder={sourceBuilder}
                />
              )}
              {sourceBuilder instanceof
                LakehouseConsumerDataCubeSourceBuilderState && (
                <LakehouseConsumerDataCubeSourceBuilder
                  sourceBuilder={sourceBuilder}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-between px-2">
        <div className="flex-1 overflow-hidden">
          {state.finalizeState.isInProgress && (
            <FormLoadingIndicator message="Creating DataCube..." />
          )}
        </div>
        <div className="flex flex-shrink-0 items-center">
          <FormButton onClick={() => state.display.close()}>Cancel</FormButton>
          <FormButton
            className="ml-2"
            disabled={!sourceBuilder.isValid}
            loading={state.finalizeState.isInProgress}
            onClick={() => {
              state
                .finalize()
                .catch((error) =>
                  store.alertService.alertUnhandledError(error),
                );
            }}
          >
            OK
          </FormButton>
        </div>
      </div>
    </>
  );
});
