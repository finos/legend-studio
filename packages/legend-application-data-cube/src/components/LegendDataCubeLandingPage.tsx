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
import { createContext, useContext, useEffect } from 'react';
import {
  DataCube,
  DataCubeSettingKey,
  FormBadge_WIP,
  DataCubeLayoutManager,
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
import { LegendDataCubeNewQueryBuilder } from './LegendDataCubeNewQueryBuilder.js';

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

const LegendDataCubeLandingPageHeader = observer(
  (props: { dataCube?: DataCubeState | undefined }) => {
    const store = useLegendDataCubeLandingPageStore();
    const { dataCube } = props;

    return (
      <div className="flex h-full items-center">
        <button
          className="flex h-5 w-24 items-center justify-center border border-neutral-400 bg-neutral-300 px-2 text-sm hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:brightness-100"
          // TODO: we will come back to support this later
          disabled={true}
        >
          Load Query
          <FormBadge_WIP />
        </button>
        <button
          className="ml-1.5 flex h-5 w-20 items-center justify-center border border-neutral-400 bg-neutral-300 px-2 text-sm hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:brightness-100"
          onClick={() => store.newQueryState.display.open()}
        >
          New Query
        </button>
        <button
          disabled={!dataCube}
          className="ml-1.5 flex h-5 w-20 items-center justify-center border border-neutral-400 bg-neutral-300 px-2 text-sm hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:brightness-100"
        >
          Save Query
        </button>
      </div>
    );
  },
);

const LegendDataCubeLandingPageBlank = observer(() => {
  const store = useLegendDataCubeLandingPageStore();
  const application = store.application;
  const [openMenuDropdown, closeMenuDropdown, menuDropdownProps] =
    useDropdownMenu();

  return (
    <div className="data-cube relative flex h-full w-full flex-col bg-white">
      <div className="flex h-7 justify-between bg-neutral-100">
        <div className="flex select-none items-center pl-1 pr-2 text-lg font-medium">
          <DataCubeIcon.Cube className="mr-1 h-4 w-4" />
          <div>{`[ Legend DataCube ]`}</div>
        </div>
        <div className="flex">
          <LegendDataCubeLandingPageHeader />
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
                list: 'w-40 p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
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
              <FormBadge_WIP />
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
      <div className="h-[calc(100%_-_48px)] w-full border border-x-0 border-neutral-200 bg-neutral-50 p-2">
        <div>Create a new query to start</div>
        <button className="mt-1.5 flex h-5 w-20 items-center justify-center border border-neutral-400 bg-neutral-300 px-2 text-sm hover:brightness-95 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:brightness-100">
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

      <DataCubeLayoutManager layout={store.baseStore.engine.layout} />
    </div>
  );
});

export const LegendDataCubeLandingPage = withLegendDataCubeLandingPageStore(
  observer(() => {
    const store = useLegendDataCubeLandingPageStore();
    const application = store.application;

    if (!store.query) {
      return <LegendDataCubeLandingPageBlank />;
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
            <LegendDataCubeLandingPageHeader dataCube={dataCube} />
          ),
        }}
      />
    );
  }),
);
