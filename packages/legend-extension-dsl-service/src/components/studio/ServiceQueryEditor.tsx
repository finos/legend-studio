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

import { useEffect } from 'react';
import { useParams } from 'react-router';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import {
  BlankPanelContent,
  clsx,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import {
  type ProjectServiceQueryUpdaterPathParams,
  type ServiceQueryUpdaterPathParams,
  DSL_SERVICE_PATH_PARAM_TOKEN,
} from '../../stores/studio/DSL_Service_LegendStudioRouter.js';
import {
  ProjectServiceQueryUpdaterStoreProvider,
  ServiceQueryUpdaterStoreProvider,
  useServiceQueryEditorStore,
} from './ServiceQueryEditorStoreProvider.js';

// const QueryExportDialogContent = observer(
//   (props: { exportState: QueryExportState }) => {
//     const { exportState } = props;
//     const applicationStore = useApplicationStore();
//     const allowCreate = exportState.allowPersist;
//     const allowSave = exportState.allowPersist && exportState.allowUpdate;
//     const create = applicationStore.guardUnhandledError(() =>
//       exportState.persistQuery(true),
//     );
//     const save = applicationStore.guardUnhandledError(() =>
//       exportState.persistQuery(false),
//     );

//     // name
//     const nameInputRef = useRef<HTMLInputElement>(null);
//     const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) =>
//       exportState.setQueryName(event.target.value);

//     useEffect(() => {
//       nameInputRef.current?.focus();
//     }, []);

//     return (
//       <>
//         <div className="modal__body">
//           <PanelLoadingIndicator
//             isLoading={exportState.persistQueryState.isInProgress}
//           />
//           <input
//             ref={nameInputRef}
//             className="input input--dark"
//             spellCheck={false}
//             value={exportState.queryName}
//             onChange={changeName}
//           />
//         </div>
//         <div className="modal__footer">
//           {allowSave && (
//             <button
//               className="btn modal__footer__close-btn btn--dark"
//               onClick={save}
//             >
//               Save
//             </button>
//           )}
//           <button
//             className="btn modal__footer__close-btn btn--dark"
//             // TODO?: we should probably annotate here why,
//             // when we disable this action
//             disabled={!allowCreate}
//             onClick={create}
//           >
//             Create
//           </button>
//         </div>
//       </>
//     );
//   },
// );

// const QueryExport = observer(() => {
//   const editorStore = useQueryEditorStore();
//   const exportState = editorStore.exportState;
//   const close = (): void => editorStore.setExportState(undefined);

//   return (
//     <Dialog
//       open={Boolean(exportState)}
//       onClose={close}
//       classes={{
//         root: 'editor-modal__root-container',
//         container: 'editor-modal__container',
//         paper: 'editor-modal__content',
//       }}
//     >
//       <div className="modal modal--dark query-export">
//         <div className="modal__header">
//           <div className="modal__title">Save Query</div>
//         </div>
//         {exportState && <QueryExportDialogContent exportState={exportState} />}
//       </div>
//     </Dialog>
//   );
// });

// const renderQueryEditorHeaderLabel = (
//   editorStore: QueryEditorStore,
// ): React.ReactNode => {
//   if (editorStore instanceof ExistingQueryEditorStore) {
//     return (
//       <div className="query-editor__header__label query-editor__header__label--existing-query">
//         {editorStore.query.name}
//       </div>
//     );
//   } else if (editorStore instanceof MappingQueryCreatorStore) {
//     return (
//       <div className="query-editor__header__label query-editor__header__label--create-query">
//         New Query
//       </div>
//     );
//   } else if (editorStore instanceof ServiceQueryCreatorStore) {
//     return (
//       <div className="query-editor__header__label query-editor__header__label--service-query">
//         <RobotIcon className="query-editor__header__label__icon" />
//         {extractElementNameFromPath(editorStore.servicePath)}
//         {editorStore.executionKey && (
//           <div className="query-editor__header__label__tag">
//             {editorStore.executionKey}
//           </div>
//         )}
//       </div>
//     );
//   }
//   const extraQueryEditorHeaderLabelers = editorStore.pluginManager
//     .getApplicationPlugins()
//     .flatMap((plugin) => plugin.getExtraQueryEditorHeaderLabelers?.() ?? []);
//   for (const labeler of extraQueryEditorHeaderLabelers) {
//     const label = labeler(editorStore);
//     if (label) {
//       return label;
//     }
//   }
//   return null;
// };

// const QueryLoader = observer(
//   (props: {
//     editorStore: QueryEditorStore;
//     applicationStore: ApplicationStore<
//       LegendQueryApplicationConfig,
//       LegendQueryPluginManager
//     >;
//   }) => {
//     const { editorStore, applicationStore } = props;
//     const queryFinderRef = useRef<SelectComponent>(null);
//     const searchInputRef = useRef<HTMLInputElement>(null);
//     const [selectedQueryID, setSelectedQueryID] = useState('');
//     const [isMineOnly, setIsMineOnly] = useState(false);
//     const [searchText, setSearchText] = useState('');
//     const closeQueryImporter = (): void => {
//       editorStore.queryLoaderState.setIsQueryLoaderOpen(false);
//     };
//     const handleEnterQueryImporter = (): void =>
//       queryFinderRef.current?.focus();
//     const loadSelectedQuery = (): void => {
//       if (selectedQueryID) {
//         editorStore.queryLoaderState.setIsQueryLoaderOpen(false);
//         applicationStore.navigator.jumpTo(
//           applicationStore.navigator.generateLocation(
//             generateExistingQueryEditorRoute(selectedQueryID),
//           ),
//         );
//       }
//     };
//     // search text
//     const debouncedLoadQueries = useMemo(
//       () =>
//         debounce((input: string): void => {
//           flowResult(editorStore.queryLoaderState.loadQueries(input)).catch(
//             applicationStore.alertUnhandledError,
//           );
//         }, 500),
//       [applicationStore, editorStore.queryLoaderState],
//     );
//     const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
//       event,
//     ) => {
//       if (event.target.value !== searchText) {
//         setSearchText(event.target.value);
//         debouncedLoadQueries.cancel();
//         debouncedLoadQueries(event.target.value);
//       }
//     };
//     const clearQuerySearching = (): void => {
//       setSearchText('');
//       debouncedLoadQueries.cancel();
//       debouncedLoadQueries('');
//     };
//     const toggleShowCurrentUserQueriesOnly = (): void => {
//       editorStore.queryLoaderState.setShowCurrentUserQueriesOnly(
//         !editorStore.queryLoaderState.showCurrentUserQueriesOnly,
//       );
//       setIsMineOnly(!isMineOnly);
//       debouncedLoadQueries.cancel();
//       debouncedLoadQueries(searchText);
//     };

//     useEffect(() => {
//       flowResult(editorStore.queryLoaderState.loadQueries('')).catch(
//         applicationStore.alertUnhandledError,
//       );
//     }, [applicationStore, editorStore.queryLoaderState]);

//     return (
//       <Dialog
//         open={editorStore.queryLoaderState.isQueryLoaderOpen}
//         onClose={closeQueryImporter}
//         TransitionProps={{
//           onEnter: handleEnterQueryImporter,
//         }}
//         classes={{ container: 'search-modal__container' }}
//         PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
//       >
//         <div className="modal modal--dark search-modal">
//           <div className="modal__title">Load Query</div>
//           <div className="query-editor__query-loader__filter-section">
//             <div className="query-editor__query-loader__filter-section__section__toggler">
//               <button
//                 className={clsx(
//                   'query-editor__query-loader__filter-section__section__toggler__btn',
//                   {
//                     'query-editor__query-loader__filter-section__section__toggler__btn--toggled':
//                       isMineOnly,
//                   },
//                 )}
//                 onClick={toggleShowCurrentUserQueriesOnly}
//                 tabIndex={-1}
//               >
//                 {isMineOnly ? <CheckSquareIcon /> : <SquareIcon />}
//               </button>
//               <div
//                 className="query-editor__query-loader__filter-section__section__toggler__prompt"
//                 onClick={toggleShowCurrentUserQueriesOnly}
//               >
//                 Mine Only
//               </div>
//             </div>
//           </div>
//           <div className="query-editor__query-loader__search-section">
//             <div className="query-editor__query-loader__search-section__input__container">
//               <input
//                 ref={searchInputRef}
//                 className={clsx(
//                   'query-editor__query-loader__search-section__input input--dark',
//                   {
//                     'query-editor__query-loader__search-section__input--searching':
//                       searchText,
//                   },
//                 )}
//                 onChange={onSearchTextChange}
//                 value={searchText}
//                 placeholder="Search a query by name"
//               />
//               {!searchText ? (
//                 <div className="query-editor__query-loader__search-section__input__search__icon">
//                   <SearchIcon />
//                 </div>
//               ) : (
//                 <>
//                   <button
//                     className="query-editor__query-loader__search-section__input__clear-btn"
//                     tabIndex={-1}
//                     onClick={clearQuerySearching}
//                     title="Clear"
//                   >
//                     <TimesIcon />
//                   </button>
//                 </>
//               )}
//             </div>
//           </div>
//           <div className="query-editor__query-loader__body">
//             {editorStore.queryLoaderState.loadQueriesState.hasCompleted && (
//               <>
//                 {editorStore.queryLoaderState.queries.length > 0 && (
//                   <>
//                     <table className="table">
//                       <thead>
//                         <tr>
//                           <th className="table__cell--left">Name</th>
//                           <th className="table__cell--left">Author</th>
//                           <th className="table__cell--left">Version</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {editorStore.queryLoaderState.queries.map((query) => (
//                           <tr
//                             key={query.id}
//                             className={clsx(
//                               'query-editor__query-loader__body__table__row',
//                               {
//                                 'query-editor__query-loader__body__table__row--selected':
//                                   selectedQueryID === query.id,
//                               },
//                             )}
//                             onClick={(event) => setSelectedQueryID(query.id)}
//                           >
//                             <td className="table__cell--left">{query.name}</td>
//                             <td className="table__cell--left">
//                               {query.owner ?? 'anonymous'}
//                             </td>
//                             <td className="table__cell--left">
//                               {query.versionId}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </>
//                 )}
//                 {editorStore.queryLoaderState.queries.length === 0 && (
//                   <BlankPanelContent>No query available</BlankPanelContent>
//                 )}
//               </>
//             )}
//             {!editorStore.queryLoaderState.loadQueriesState.hasCompleted && (
//               <>
//                 <PanelLoadingIndicator
//                   isLoading={
//                     !editorStore.queryLoaderState.loadQueriesState.hasCompleted
//                   }
//                 />
//                 <BlankPanelContent>Loading queries...</BlankPanelContent>
//               </>
//             )}
//           </div>
//           <div className="search-modal__actions">
//             <button
//               className="btn btn--dark"
//               onClick={loadSelectedQuery}
//               disabled={selectedQueryID === ''}
//             >
//               Load Query
//             </button>
//             <button className="btn btn--dark" onClick={closeQueryImporter}>
//               Close
//             </button>
//           </div>
//         </div>
//       </Dialog>
//     );
//   },
// );

// const QueryEditorHeaderContent = observer(
//   (props: { queryBuilderState: QueryBuilderState }) => {
//     const { queryBuilderState } = props;
//     const editorStore = useQueryEditorStore();
//     const applicationStore = useLegendQueryApplicationStore();
//     const openQueryLoader = (): void => {
//       editorStore.queryLoaderState.setIsQueryLoaderOpen(true);
//     };
//     const viewQueryProject = (): void => {
//       const { groupId, artifactId, versionId } = editorStore.getProjectInfo();
//       applicationStore.navigator.openNewWindow(
//         EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
//           applicationStore.config.studioUrl,
//           groupId,
//           artifactId,
//           versionId,
//           undefined,
//         ),
//       );
//     };
//     const toggleLightDarkTheme = (): void =>
//       applicationStore.TEMPORARY__setIsLightThemeEnabled(
//         !applicationStore.TEMPORARY__isLightThemeEnabled,
//       );
//     const saveQuery = (): void => {
//       queryBuilderState
//         .saveQuery(async (lambda: RawLambda) => {
//           editorStore.setExportState(
//             new QueryExportState(
//               editorStore,
//               queryBuilderState,
//               lambda,
//               await editorStore.getExportConfiguration(lambda),
//             ),
//           );
//         })
//         .catch(applicationStore.alertUnhandledError);
//     };

//     return (
//       <div className="query-editor__header__content">
//         <div className="query-editor__header__content__main">
//           {renderQueryEditorHeaderLabel(editorStore)}
//         </div>
//         <div className="query-editor__header__actions">
//           <button
//             className="query-editor__header__action btn--dark"
//             tabIndex={-1}
//             onClick={openQueryLoader}
//           >
//             <div className="query-editor__header__action__label">
//               Load Query
//             </div>
//           </button>
//           <button
//             className="query-editor__header__action query-editor__header__action--simple btn--dark"
//             tabIndex={-1}
//             title="View project"
//             onClick={viewQueryProject}
//           >
//             <ExternalLinkSquareIcon />
//           </button>
//           {applicationStore.config.options.TEMPORARY__enableThemeSwitcher && (
//             <button
//               className="query-editor__header__action query-editor__header__action--simple btn--dark"
//               tabIndex={-1}
//               title="Toggle Light/Dark Theme"
//               onClick={toggleLightDarkTheme}
//             >
//               {applicationStore.TEMPORARY__isLightThemeEnabled ? (
//                 <EmptyLightBulbIcon />
//               ) : (
//                 <LightBulbIcon />
//               )}
//             </button>
//           )}
//           {editorStore.queryLoaderState.isQueryLoaderOpen && (
//             <QueryLoader
//               editorStore={editorStore}
//               applicationStore={applicationStore}
//             />
//           )}
//           <button
//             className="query-editor__header__action btn--dark"
//             tabIndex={-1}
//             onClick={saveQuery}
//           >
//             <div className="query-editor__header__action__icon">
//               <SaveIcon />
//               <QueryExport />
//             </div>
//             <div className="query-editor__header__action__label">Save</div>
//           </button>
//         </div>
//       </div>
//     );
//   },
// );

export const ServiceQueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useServiceQueryEditorStore();
  const isLoadingEditor = !editorStore.initState.hasCompleted;

  useEffect(() => {
    flowResult(editorStore.initializeWithServiceQuery()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [editorStore, applicationStore]);

  return (
    <div className={clsx(['query-editor '])}>
      <div className="query-editor__header">
        {/* <button
          className="query-editor__header__back-btn btn--dark"
          onClick={backToMainMenu}
          title="Back to Main Menu"
        >
          <ArrowLeftIcon />
        </button>
        {!isLoadingEditor && editorStore.queryBuilderState && (
          <QueryEditorHeaderContent
            queryBuilderState={editorStore.queryBuilderState}
          />
        )} */}
      </div>
      <div className="query-editor__content">
        <PanelLoadingIndicator isLoading={isLoadingEditor} />
        {
          !isLoadingEditor && editorStore.queryBuilderState && (
            <div>hoalaaa</div>
          )
          // <QueryBuilder queryBuilderState={editorStore.queryBuilderState} />
        }
        {(isLoadingEditor || !editorStore.queryBuilderState) && (
          <BlankPanelContent>
            {editorStore.initState.message ??
              editorStore.graphManagerState.systemBuildState.message ??
              editorStore.graphManagerState.dependenciesBuildState.message ??
              editorStore.graphManagerState.generationsBuildState.message ??
              editorStore.graphManagerState.graphBuildState.message}
          </BlankPanelContent>
        )}
      </div>
    </div>
  );
});

export const ServiceQueryUpdater = observer(() => {
  const params = useParams<ServiceQueryUpdaterPathParams>();
  const serviceCoordinates =
    params[DSL_SERVICE_PATH_PARAM_TOKEN.SERVICE_COORDINATES];
  const groupWorkspaceId =
    params[DSL_SERVICE_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID];

  return (
    <ServiceQueryUpdaterStoreProvider
      serviceCoordinates={serviceCoordinates}
      groupWorkspaceId={groupWorkspaceId}
    >
      <ServiceQueryEditor />
    </ServiceQueryUpdaterStoreProvider>
  );
});

export const ProjectServiceQueryUpdater = observer(() => {
  const params = useParams<ProjectServiceQueryUpdaterPathParams>();
  const projectId = params[DSL_SERVICE_PATH_PARAM_TOKEN.PROJECT_ID];
  const groupWorkspaceId =
    params[DSL_SERVICE_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID];
  const servicePath = params[DSL_SERVICE_PATH_PARAM_TOKEN.SERVICE_PATH];

  return (
    <ProjectServiceQueryUpdaterStoreProvider
      projectId={projectId}
      groupWorkspaceId={groupWorkspaceId}
      servicePath={servicePath}
    >
      <ServiceQueryEditor />
    </ProjectServiceQueryUpdaterStoreProvider>
  );
});
