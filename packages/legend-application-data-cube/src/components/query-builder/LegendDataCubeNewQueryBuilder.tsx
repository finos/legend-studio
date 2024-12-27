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
import { type LegendDataCubeNewQueryState } from '../../stores/query-builder/LegendDataCubeNewQueryState.js';
import { LegendDataCubeSourceBuilderType } from '../../stores/query-builder/source-builder/LegendDataCubeSourceBuilderState.js';
import { useDropdownMenu } from '@finos/legend-art';
import {
  FormButton,
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
} from '@finos/legend-data-cube';
import { LegendQueryDataCubeSourceBuilderState } from '../../stores/query-builder/source-builder/LegendQueryDataCubeSourceBuilderState.js';
import { LegendQueryDataCubeSourceBuilder } from './source-builder/LegendQueryDataCubeSourceBuilder.js';
import { AdhocQueryDataCubeSourceBuilder } from './source-builder/AdhocQueryDataCubeSourceBuilder.js';
import { AdhocQueryDataCubeSourceBuilderState } from '../../stores/query-builder/source-builder/AdhocQueryDataCubeSourceBuilderState.js';

export const LegendDataCubeNewQueryBuilder = observer(
  (props: { state: LegendDataCubeNewQueryState }) => {
    const { state } = props;
    const sourceBuilder = state.sourceBuilder;
    const selectedSourceType = sourceBuilder.label;
    const [
      openSourceTypeDropdown,
      closeSourceTypeDropdown,
      sourceTypeDropdownProps,
      sourceTypeDropdownPropsOpen,
    ] = useDropdownMenu();

    return (
      <>
        <div className="relative h-[calc(100%_-_40px)] w-full px-2 pt-2">
          <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
            <div className="h-full w-full select-none p-2">
              <div className="flex h-6 w-full items-center">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Choose Source Type:
                </div>
                <FormDropdownMenuTrigger
                  className="w-80"
                  onClick={openSourceTypeDropdown}
                  open={sourceTypeDropdownPropsOpen}
                >
                  {selectedSourceType}
                </FormDropdownMenuTrigger>
                <FormDropdownMenu className="w-80" {...sourceTypeDropdownProps}>
                  {[
                    LegendDataCubeSourceBuilderType.LEGEND_QUERY,
                    LegendDataCubeSourceBuilderType.ADHOC_QUERY,
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
                    </FormDropdownMenuItem>
                  ))}
                </FormDropdownMenu>
              </div>
              <div className="-ml-2 mb-2 mt-2 h-[1px] w-[calc(100%_+_16px)] bg-neutral-200" />
              <div className="h-[calc(100%_-_40px)] w-full">
                {sourceBuilder instanceof
                  LegendQueryDataCubeSourceBuilderState && (
                  <LegendQueryDataCubeSourceBuilder
                    sourceBuilder={sourceBuilder}
                  />
                )}
                {sourceBuilder instanceof
                  AdhocQueryDataCubeSourceBuilderState && (
                  <AdhocQueryDataCubeSourceBuilder
                    sourceBuilder={sourceBuilder}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-10 items-center justify-end px-2">
          <FormButton onClick={() => state.display.close()} autoFocus={true}>
            Cancel
          </FormButton>
          <FormButton
            className="ml-2"
            disabled={!sourceBuilder.isValid}
            onClick={() => {
              // editor.applyChanges();
              state.generateQuery().then((query) => {});
              state.display.close();
            }}
          >
            OK
          </FormButton>
        </div>
      </>
      //   <div className="flex h-20 items-center justify-end border-b-0 border-l-0 border-r-0 border-t border-solid border-slate-300 p-2 px-2">
      //     <button
      //       className="ml-2 h-10 w-20 rounded border border-neutral-400 bg-neutral-300 bg-sky-700 px-2 text-white hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-gray-200 disabled:text-white disabled:hover:brightness-100"
      //       disabled={!sourceState.isValid}
      //       // onClick={() => {
      //       //   flowResult(
      //       //     sourceBuilder.inputSource(
      //       //       (source: DataCubeGenericSource, engine: DataCubeEngine) =>
      //       //         store.initializeView(source, engine),
      //       //     ),
      //       //   ).catch(store.context.application.alertUnhandledError);
      //       // }}
      //     >
      //       Open
      //     </button>
    );
  },
);
