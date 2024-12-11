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
import { type LegendDataCubeSourceBuilder } from '../../stores/source/LegendDataCubeSourceBuilder.js';
import { DataCubeSourceType } from '../../stores/source/CubeInputSourceLoader.js';
import {
  Dialog,
  Modal,
  PanelLoadingIndicator,
  TimesIcon,
  cn,
} from '@finos/legend-art';
import { SavedQuerySourceEditor } from './SavedQuerySourceEditor.js';
import { SavedQueryInputSourceState } from '../../stores/source/SavedQueryInputSourceState.js';
import { useLegendDataCubeBaseStore } from '../LegendDataCubeFrameworkProvider.js';
import { flowResult } from 'mobx';
import type { CubeInputSource } from '../../stores/source/CubeInputSource.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';

export const DataCubeSourceEditor = observer(
  (props: { sourceBuilder: LegendDataCubeSourceBuilder }) => {
    const { sourceBuilder } = props;
    const store = useLegendDataCubeBaseStore();
    const sourceState = sourceBuilder.sourceState;
    const tabs = Object.values(DataCubeSourceType);
    const selectedTab = sourceState.label;
    const closeModal = (): void => sourceBuilder.close();

    return (
      <Dialog
        open={sourceBuilder.open}
        onClose={closeModal}
        classes={{
          root: 'query-loader__dialog',
          container: 'query-loader__dialog__container',
        }}
        PaperProps={{
          classes: { root: 'query-loader__dialog__body' },
        }}
      >
        <Modal
          darkMode={false}
          className="modal query-loader__dialog__body__content"
        >
          <div className="flex h-20 cursor-default items-center justify-between border-b border-l-0 border-r-0 border-t-0 border-solid border-slate-300 p-5">
            <div className="flex items-center">
              <div className="flex items-center text-xl font-bold">
                Data Cube Source
              </div>
            </div>
            <div className="flex items-center">
              <button
                className="mr-1 flex h-3 w-3 items-center justify-center"
                tabIndex={-1}
                onClick={close}
              >
                <TimesIcon className="text-xl text-slate-400 hover:text-slate-800" />
              </button>
            </div>
          </div>
          <div className="relative h-[calc(100%_-_100px)] p-5">
            <PanelLoadingIndicator
              isLoading={Boolean(sourceState.buildCubeEngineState.isInProgress)}
            />

            <div className="h-15 flex overflow-y-hidden border-b border-l-0 border-r-0 border-t-0 border-solid border-slate-300 px-2 pb-1 pt-2 hover:font-light">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => sourceBuilder.changeSource(tab)}
                  className={cn(
                    'flex h-6 items-center justify-center whitespace-nowrap pl-2 text-sm hover:font-bold focus:z-10',
                    {
                      'border-b-2 border-l-0 border-r-0 border-t-0 border-solid border-sky-800':
                        tab === selectedTab,
                    },
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="h-[calc(100%_-_35px)] w-full overflow-auto border border-neutral-300 bg-white">
              <div className="theme__legacy-light">
                {sourceState instanceof SavedQueryInputSourceState && (
                  <SavedQuerySourceEditor
                    savedQueryInputSourceState={sourceState}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex h-20 items-center justify-end border-b-0 border-l-0 border-r-0 border-t border-solid border-slate-300 p-2 px-2">
            <button
              className="ml-2 h-10 w-20 rounded border border-neutral-400 bg-neutral-300 bg-sky-700 px-2 text-white hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-gray-200 disabled:text-white disabled:hover:brightness-100"
              disabled={!sourceState.isValid}
              onClick={() => {
                flowResult(
                  sourceBuilder.inputSource(
                    (source: CubeInputSource, engine: DataCubeEngine) =>
                      store.initializeView(source, engine),
                  ),
                ).catch(store.context.applicationStore.alertUnhandledError);
              }}
            >
              Open
            </button>
            <button
              className="ml-2 h-10 w-20 rounded border border-neutral-400 bg-gray-500 px-2 text-white hover:brightness-95"
              onClick={() => sourceBuilder.close()}
            >
              Close
            </button>
          </div>
        </Modal>
      </Dialog>
    );
  },
);
