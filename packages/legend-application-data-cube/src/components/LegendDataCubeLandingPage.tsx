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

import { observer, useLocalObservable } from 'mobx-react-lite';
import { useLegendDataCubeBaseStore } from './LegendDataCubeFrameworkProvider.js';
import { createContext, useContext } from 'react';
import {
  DataCube,
  DataCubeSettingKey,
  type DataCubeState,
} from '@finos/legend-data-cube';
import { formatDate, guaranteeNonNullable } from '@finos/legend-shared';
import { LegendDataCubeLandingPageStore } from '../stores/LegendDataCubeLandingPageStore.js';
import {
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  useDropdownMenu,
} from '@finos/legend-art';

// const CreateQueryDialog = observer(
//   (props: { view: LegendCubeViewer; store: LegendDataCubeBaseStore }) => {
//     const { store } = props;
//     const close = (): void => store.setSaveModal(false);
//     const [queryName, setQueryName] = useState('');
//     const create = (): void => {
//       flowResult(store.saveQuery(queryName)).catch(
//         store.application.alertUnhandledError,
//       );
//     };
//     const isEmptyName = !queryName;
//     // name
//     const nameInputRef = useRef<HTMLInputElement>(null);
//     const setFocus = (): void => {
//       nameInputRef.current?.focus();
//     };

//     const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) => {
//       setQueryName(event.target.value);
//     };

//     useEffect(() => {
//       setTimeout(() => setFocus(), 1);
//     }, []);
//     return (
//       <Dialog
//         open={store.saveModal}
//         onClose={close}
//         classes={{
//           root: 'editor-modal__root-container',
//           container: 'editor-modal__container',
//           paper: 'editor-modal__content',
//         }}
//       >
//         <Modal darkMode={false} className="query-export">
//           <ModalHeader title="Create New Query" />
//           <ModalBody>
//             <PanelLoadingIndicator
//               isLoading={store.saveModalState.isInProgress}
//             />
//             <PanelListItem>
//               <div className="input--with-validation">
//                 <input
//                   ref={nameInputRef}
//                   className={clsx('input input--dark', {
//                     'input--caution': false,
//                   })}
//                   spellCheck={false}
//                   value={queryName}
//                   onChange={changeName}
//                   title="New Query Name"
//                 />
//               </div>
//             </PanelListItem>
//           </ModalBody>
//           <ModalFooter>
//             <ModalFooterButton
//               text="Create Query"
//               title="Create new query"
//               disabled={isEmptyName}
//               onClick={create}
//             />
//           </ModalFooter>
//         </Modal>
//       </Dialog>
//     );
//   },
// );

// export const LegendDataCubeLandingPage = observer(() => {
//   const store = useLegendDataCubeBaseStore();
//   const sourceSelector = store.sourceSelector;

//   useEffect(() => {
//     store.context.initialize();
//   }, [store]);
//   return (
//     <>
//       <div className="h-full w-full bg-white">
//         <div className="bg-sky-900">
//           <div className="mx-auto max-w-full px-2 sm:px-6 lg:px-8">
//             <div className="relative flex h-12 items-center justify-between">
//               <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
//                 <div className="flex flex-shrink-0 items-center">
//                   <div className="text-gray-300">Legend Data Cube</div>
//                 </div>
//               </div>
//               <div className="md:block">
//                 <div className="ml-4 flex items-center md:ml-6">
//                   <button
//                     type="button"
//                     className="relative rounded-full bg-sky-900 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
//                   >
//                     <QuestionIcon />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//         {/* {dataCubeStore.cubeViewer ? (
//           <>
//             <div className="h-[calc(100%_-_30px)]">
//               <div className="h-12 w-full bg-gray-200">
//                 <button
//                   onClick={() => dataCubeStore.setSaveModal(true)}
//                   type="button"
//                   className="relative rounded-full bg-sky-900 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
//                 >
//                   Save
//                 </button>
//               </div>
//               <div className="h-[calc(100%_-_30px)]">
//                 <DataCube engine={dataCubeStore.cubeViewer.engine} />
//               </div>
//             </div>
//           </>
//         ) : (
//           <>
//             <div
//               onClick={() => sourceSelector.openModal()}
//               className="bg-white shadow"
//             >
//               <div className="mx-auto h-40 px-4 py-6 sm:px-6 lg:px-8">
//                 <div className="group flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 py-3 text-base font-medium leading-6 text-slate-900 hover:cursor-pointer hover:border-solid hover:border-blue-500 hover:bg-white hover:text-blue-500">
//                   <svg
//                     className="mb-1 text-slate-400 group-hover:text-blue-500"
//                     width="20"
//                     height="20"
//                     fill="currentColor"
//                     aria-hidden="true"
//                   >
//                     <path d="M10 5a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0v-3H6a1 1 0 1 1 0-2h3V6a1 1 0 0 1 1-1Z" />
//                   </svg>
//                   Add Source
//                 </div>
//               </div>
//             </div>
//           </>
//         )} */}
//       </div>
//       {sourceSelector.open && (
//         <DataCubeSourceEditor sourceBuilder={sourceSelector} />
//       )}
//       {store.cubeViewer && store.saveModal && (
//         <CreateQueryDialog store={store} view={store.cubeViewer} />
//       )}
//     </>
//   );
// });

const LegendDataCubeLandingPageStoreContext = createContext<
  LegendDataCubeLandingPageStore | undefined
>(undefined);

const LegendDataCubeLandingPageStoreProvider = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  const baseStore = useLegendDataCubeBaseStore();
  const store = useLocalObservable(
    () => new LegendDataCubeLandingPageStore(baseStore),
  );
  return (
    <LegendDataCubeLandingPageStoreContext.Provider value={store}>
      {children}
    </LegendDataCubeLandingPageStoreContext.Provider>
  );
};

const useLegendDataCubeLandingPageStore = () =>
  guaranteeNonNullable(
    useContext(LegendDataCubeLandingPageStoreContext),
    `Can't find editor store in context`,
  );

const withLegendDataCubeLandingPageStore = (WrappedComponent: React.FC) =>
  function WithLegendDataCubeLandingPageStore() {
    return (
      <LegendDataCubeLandingPageStoreProvider>
        <WrappedComponent />
      </LegendDataCubeLandingPageStoreProvider>
    );
  };

const LegendDataCubeHeader = observer((props: { dataCube: DataCubeState }) => {
  return null;
});

export const LegendDataCubeLandingPage = withLegendDataCubeLandingPageStore(
  observer(() => {
    const store = useLegendDataCubeLandingPageStore();
    const application = store.application;
    const [openMenuDropdown, closeMenuDropdown, menuDropdownProps] =
      useDropdownMenu();

    if (!store.query) {
      return (
        <div className="data-cube relative flex h-full w-full flex-col bg-white">
          <div className="flex h-7 justify-between bg-neutral-100">
            <div className="flex select-none items-center pl-1 pr-2 text-lg font-medium">
              <DataCubeIcon.Cube className="mr-1 h-4 w-4" />
              <div>{`[ Legend DataCube ]`}</div>
            </div>
            <div className="flex">
              <button
                className="flex aspect-square h-full flex-shrink-0 items-center justify-center text-lg"
                onClick={openMenuDropdown}
              >
                <DataCubeIcon.Menu />
              </button>
              <DropdownMenu
                {...menuDropdownProps}
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'left' },
                  classes: {
                    paper: 'rounded-none mt-[1px]',
                    list: 'w-36 p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
                  },
                }}
              >
                <DropdownMenuItem
                  className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
                  onClick={() => {
                    const url = application.documentationService.url;
                    if (url) {
                      application.navigationService.navigator.visitAddress(url);
                    }
                    closeMenuDropdown();
                  }}
                  disabled={true} // TODO: enable when we set up the documentation website
                >
                  See Documentation
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>{' '}
          <div className="h-[calc(100%_-_48px)] w-full border border-x-0 border-neutral-200 bg-neutral-50 p-2">
            <div>Create a new query to start</div>
            <button className="mt-1.5 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:brightness-100">
              New Query
            </button>
          </div>
          <div className="flex h-5 w-full justify-between bg-neutral-100">
            <div className="flex">
              <button
                className="flex items-center px-2 text-neutral-400"
                disabled={true}
              >
                <DataCubeIcon.Settings className="text-xl" />
                <div className="pl-0.5 underline">Properties</div>
              </button>
              <div className="flex">
                <button
                  className="flex items-center text-neutral-400"
                  disabled={true}
                >
                  <DataCubeIcon.TableFilter className="text-lg" />
                  <div className="pl-0.5 underline">Filter</div>
                </button>
              </div>
            </div>
            <div className="flex items-center px-2"></div>
          </div>
        </div>
      );
    }

    return (
      <DataCube
        query={store.query}
        engine={store.baseStore.engine}
        options={{
          onNameChanged(name, source) {
            application.layoutService.setWindowTitle(
              `\u229E ${name} - ${formatDate(new Date(store.baseStore.startTime), 'HH:mm:ss EEE MMM dd yyyy')}`,
            );
          },
          onSettingChanged(key, value) {
            application.settingService.persistValue(key, value);
          },
          enableDebugMode: application.settingService.getBooleanValue(
            DataCubeSettingKey.ENABLE_DEBUG_MODE,
          ),
          gridClientLicense: store.baseStore.gridClientLicense,
          gridClientRowBuffer: application.settingService.getNumericValue(
            DataCubeSettingKey.GRID_CLIENT_ROW_BUFFER,
          ),
          gridClientPurgeClosedRowNodes:
            application.settingService.getBooleanValue(
              DataCubeSettingKey.GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
            ),
          gridClientSuppressLargeDatasetWarning:
            application.settingService.getBooleanValue(
              DataCubeSettingKey.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
            ),
          innerHeaderComponent: (dataCube) => (
            <LegendDataCubeHeader dataCube={dataCube} />
          ),
        }}
      />
    );
  }),
);
