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
  DataCubeExistingColumnEditorState,
  type DataCubeColumnBaseEditorState,
} from '../../../stores/view/extend/DataCubeColumnEditorState.js';
import {
  FormButton,
  FormDocumentation,
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
  FormTextInput,
} from '../../core/DataCubeFormUtils.js';
import { DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import {
  DataCubeColumnDataType,
  DataCubeColumnKind,
} from '../../../stores/core/DataCubeQueryEngine.js';
import { DataCubeDocumentationKey } from '../../../__lib__/DataCubeDocumentation.js';
import { useDataCube } from '../../DataCubeProvider.js';
import { useMemo, useRef } from 'react';
import { debounce } from '@finos/legend-shared';
import { DataCubeCodeEditor } from './DataCubeCodeEditor.js';
import { DataCubeEvent } from '../../../__lib__/DataCubeEvent.js';

enum DataCubeExtendedColumnKind {
  LEAF_LEVEL_MEASURE = 'Leaf Level Measure',
  LEAF_LEVEL_DIMENSION = 'Leaf Level Dimension',
  GROUP_LEVEL = 'Group Level',
}

export const DataCubeColumnCreator = observer(
  (props: { state: DataCubeColumnBaseEditorState }) => {
    const { state } = props;
    const dataCube = useDataCube();
    const view = state.view;
    const manager = view.extend;

    const nameInputRef = useRef<HTMLInputElement>(null);
    const currentColumnKind = state.isGroupLevel
      ? DataCubeExtendedColumnKind.GROUP_LEVEL
      : state.columnKind === DataCubeColumnKind.MEASURE
        ? DataCubeExtendedColumnKind.LEAF_LEVEL_MEASURE
        : DataCubeExtendedColumnKind.LEAF_LEVEL_DIMENSION;
    const [
      openKindDropdown,
      closeKindDropdown,
      kindDropdownProps,
      kindDropPropsOpen,
    ] = useDropdownMenu();
    const [
      openTypeDropdown,
      closeTypeDropdown,
      typeDropdownProps,
      typeDropPropsOpen,
    ] = useDropdownMenu();

    const logAddingNewColumn = (): void => {
      view.dataCube.telemetryService.sendTelemetry(
        DataCubeEvent.ADD_NEW_COLUMN,
        view.engine.getDataFromSource(view.getInitialSource()),
      );
    };

    const debouncedCheckReturnType = useMemo(
      () =>
        debounce((): void => {
          state
            .getReturnType()
            .catch((error) => dataCube.alertService.alertUnhandledError(error));
        }, 500),
      [state, dataCube],
    );

    return (
      <>
        <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
          <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
            <div className="h-full w-full select-none p-0">
              <div className="h-24 w-full p-2">
                <div className="mt-1 flex h-5 w-full items-center">
                  <div className="flex h-full w-24 flex-shrink-0 items-center text-sm">
                    Column Name:
                  </div>
                  <FormTextInput
                    className="w-32"
                    ref={nameInputRef}
                    disabled={state.finalizationState.isInProgress}
                    value={state.name}
                    onChange={(event) => {
                      state.setName(event.target.value);
                    }}
                  />
                  <div className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-lg">
                    {state.isNameValid ? (
                      <DataCubeIcon.CircleChecked className="text-green-500" />
                    ) : (
                      <DataCubeIcon.CircledFailed className="text-red-500" />
                    )}
                  </div>
                </div>
                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-24 flex-shrink-0 items-center text-sm">
                    Column Kind:
                    <FormDocumentation
                      className="ml-1"
                      documentationKey={
                        DataCubeDocumentationKey.EXTENDED_COLUMN_LEVELS
                      }
                    />
                  </div>
                  <FormDropdownMenuTrigger
                    className="w-32"
                    onClick={openKindDropdown}
                    open={kindDropPropsOpen}
                    disabled={state.finalizationState.isInProgress}
                  >
                    {currentColumnKind}
                  </FormDropdownMenuTrigger>
                  <FormDropdownMenu className="w-32" {...kindDropdownProps}>
                    {[
                      DataCubeExtendedColumnKind.LEAF_LEVEL_MEASURE,
                      DataCubeExtendedColumnKind.LEAF_LEVEL_DIMENSION,
                      DataCubeExtendedColumnKind.GROUP_LEVEL,
                    ].map((columnKind) => (
                      <FormDropdownMenuItem
                        key={columnKind}
                        onClick={() => {
                          switch (columnKind) {
                            case DataCubeExtendedColumnKind.LEAF_LEVEL_MEASURE: {
                              state.setColumnKind(
                                false,
                                DataCubeColumnKind.MEASURE,
                              );
                              break;
                            }
                            case DataCubeExtendedColumnKind.LEAF_LEVEL_DIMENSION: {
                              state.setColumnKind(
                                false,
                                DataCubeColumnKind.DIMENSION,
                              );
                              break;
                            }
                            case DataCubeExtendedColumnKind.GROUP_LEVEL: {
                              state.setColumnKind(true, undefined);
                              break;
                            }
                            default:
                              return;
                          }
                          state.clearError();
                          state.setReturnType(undefined);
                          debouncedCheckReturnType.cancel();
                          debouncedCheckReturnType();
                          closeKindDropdown();
                        }}
                        autoFocus={columnKind === currentColumnKind}
                      >
                        {columnKind}
                      </FormDropdownMenuItem>
                    ))}
                  </FormDropdownMenu>
                </div>
                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-24 flex-shrink-0 items-center text-sm">
                    Value Type:
                  </div>
                  <FormDropdownMenuTrigger
                    className="w-32"
                    onClick={openTypeDropdown}
                    open={typeDropPropsOpen}
                    disabled={state.finalizationState.isInProgress}
                  >
                    {state.expectedType}
                  </FormDropdownMenuTrigger>
                  <div className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-lg">
                    {state.validationState.isInProgress ? (
                      <DataCubeIcon.Loader className="animate-spin stroke-2 text-neutral-400" />
                    ) : state.returnType ? (
                      state.isTypeValid ? (
                        <DataCubeIcon.CircleChecked className="text-green-500" />
                      ) : (
                        <DataCubeIcon.CircledFailed className="text-red-500" />
                      )
                    ) : null}
                  </div>
                  <FormDropdownMenu className="w-32" {...typeDropdownProps}>
                    {[
                      DataCubeColumnDataType.TEXT,
                      DataCubeColumnDataType.NUMBER,
                      DataCubeColumnDataType.DATE,
                    ].map((dataType) => (
                      <FormDropdownMenuItem
                        key={dataType}
                        onClick={() => {
                          state.setExpectedType(dataType);
                          closeTypeDropdown();
                        }}
                        autoFocus={dataType === state.expectedType}
                      >
                        {dataType}
                      </FormDropdownMenuItem>
                    ))}
                  </FormDropdownMenu>
                </div>
              </div>
              <div className="h-[calc(100%_-_96px)] w-full p-2 pt-1">
                <DataCubeCodeEditor state={state} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-10 items-center justify-end px-2">
          <FormButton onClick={() => state.close()}>Cancel</FormButton>
          {state instanceof DataCubeExistingColumnEditorState && (
            <>
              <FormButton
                className="ml-2"
                onClick={() => {
                  manager
                    .deleteColumn(state.initialData.name)
                    .catch((error) =>
                      dataCube.alertService.alertUnhandledError(error),
                    );
                }}
              >
                Delete
              </FormButton>
              <FormButton
                className="ml-2"
                onClick={() => {
                  state
                    .reset()
                    .catch((error) =>
                      dataCube.alertService.alertUnhandledError(error),
                    );
                }}
              >
                Reset
              </FormButton>
            </>
          )}
          <FormButton
            className="ml-2"
            disabled={
              !state.isNameValid ||
              !state.isTypeValid ||
              state.validationState.isInProgress ||
              state.finalizationState.isInProgress
            }
            onClick={() => {
              state
                .applyChanges()
                .catch((error) =>
                  dataCube.alertService.alertUnhandledError(error),
                );
              logAddingNewColumn();
            }}
          >
            OK
          </FormButton>
        </div>
      </>
    );
  },
);
