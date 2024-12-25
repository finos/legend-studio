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
import { type LegendDataCubeNewQueryState } from '../stores/LegendDataCubeNewQueryState.js';
import { LegendDataCubeSourceBuilderType } from '../stores/source/LegendDataCubeSourceBuilderState.js';
import {
  Dialog,
  Modal,
  PanelLoadingIndicator,
  TimesIcon,
  cn,
} from '@finos/legend-art';
import { SavedQuerySourceEditor } from './source/SavedQuerySourceBuilder.js';
import { LegendQueryDataCubeSourceBuilderState } from '../stores/source/LegendQueryDataCubeSourceBuilderState.js';

export const LegendDataCubeNewQueryBuilder = observer(
  (props: { state: LegendDataCubeNewQueryState }) => {
    const { state } = props;
    const sourceState = state.sourceBuilder;
    const tabs = Object.values(LegendDataCubeSourceBuilderType);
    const selectedTab = sourceState.label;

    return null;
    // <div className="h-full w-full">
    //   {/* <PanelLoadingIndicator
    //     isLoading={Boolean(sourceState.buildState.isInProgress)}
    //   /> */}

    //   <div className="h-15 flex overflow-y-hidden border-b border-l-0 border-r-0 border-t-0 border-solid border-slate-300 px-2 pb-1 pt-2 hover:font-light">
    //     {tabs.map((tab) => (
    //       <button
    //         key={tab}
    //         onClick={() => state.changeSourceBuilder(tab)}
    //         className={cn(
    //           'flex h-6 items-center justify-center whitespace-nowrap pl-2 text-sm hover:font-bold focus:z-10',
    //           {
    //             'border-b-2 border-l-0 border-r-0 border-t-0 border-solid border-sky-800':
    //               tab === selectedTab,
    //           },
    //         )}
    //       >
    //         {tab}
    //       </button>
    //     ))}
    //   </div>
    //   <div className="h-[calc(100%_-_35px)] w-full overflow-auto border border-neutral-300 bg-white">
    //     <div className="theme__legacy-light">
    //       {sourceState instanceof LegendQueryDataCubeSourceBuilderState && (
    //         <SavedQuerySourceEditor sourceBuilder={sourceState} />
    //       )}
    //     </div>
    //   </div>
    // </div>
    // <div className="flex h-20 items-center justify-end border-b-0 border-l-0 border-r-0 border-t border-solid border-slate-300 p-2 px-2">
    //   <button
    //     className="ml-2 h-10 w-20 rounded border border-neutral-400 bg-neutral-300 bg-sky-700 px-2 text-white hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-gray-200 disabled:text-white disabled:hover:brightness-100"
    //     disabled={!sourceState.isValid}
    //     // onClick={() => {
    //     //   flowResult(
    //     //     sourceBuilder.inputSource(
    //     //       (source: DataCubeGenericSource, engine: DataCubeEngine) =>
    //     //         store.initializeView(source, engine),
    //     //     ),
    //     //   ).catch(store.context.application.alertUnhandledError);
    //     // }}
    //   >
    //     Open
    //   </button>
    //   <button className="ml-2 h-10 w-20 rounded border border-neutral-400 bg-gray-500 px-2 text-white hover:brightness-95">
    //     Close
    //   </button>
    // </div>
  },
);
