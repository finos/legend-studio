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

// import {
//   type GenericLegendApplicationStore,
//   APPLICATION_EVENT,
// } from '@finos/legend-application';
// import {
//   GraphData,
//   GraphDataWithOrigin,
//   LegendSDLC,
//   type GraphManagerState,
// } from '@finos/legend-graph';
// import type { ProjectGAVCoordinates } from '@finos/legend-storage';
// import {
//   type GeneratorFn,
//   ActionState,
//   assertErrorThrown,
//   LogEvent,
//   filterByType,
// } from '@finos/legend-shared';
// import { action, flow, makeObservable, observable } from 'mobx';
// import type {
//   DepotServerClient,
//   StoredEntity,
// } from '@finos/legend-server-depot';
// import {
//   DepotScope,
//   resolveVersion,
//   SNAPSHOT_VERSION_ALIAS,
// } from '@finos/legend-server-depot';
// import {
//   GraphEntityRepository,
//   DepotEntityRepository,
//   EntityRepository,
// } from '@finos/legend-query-builder';
// import { DataSpace } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
// import type { DataSpaceExecutionContext } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
// import {
//   ResolvedDataSpaceEntityWithOrigin,
//   extractDataSpaceInfo,
// } from '../shared/DataSpaceInfo.js';
// import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
// import { DataSpaceAdvancedSearchState } from '../query/DataSpaceAdvancedSearchState.js';
// import type { DataSpaceExecutableAnalysisResult } from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
// import { DataSpaceServiceExecutableInfo } from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
// import { generateDataSpaceTemplateQueryCreatorRoute } from '../../__lib__/to-delete/DSL_DataSpace_LegendQueryNavigation_to_delete.js';

// export abstract class DataSpacesEntityRepository extends EntityRepository<ResolvedDataSpaceEntityWithOrigin> {
// }

// export class DataSpacesGraphRepository
//   extends GraphEntityRepository<DataSpace, ResolvedDataSpaceEntityWithOrigin>
//   implements
//   Pick<
//     DataSpacesEntityRepository,
//     | 'isAdvancedDataSpaceSearchEnabled'
//     | 'canVisitTemplateQuery'
//     | 'visitTemplateQuery'
//   > {
//   constructor(
//     applicationStore: GenericLegendApplicationStore,
//     graphManagerState: GraphManagerState,
//     prioritizeEntityFunc?:
//       | ((val: ResolvedDataSpaceEntityWithOrigin) => boolean)
//       | undefined,
//   ) {
//     super(applicationStore, graphManagerState, prioritizeEntityFunc);
//     makeObservable(this, {
//       entities: observable,
//       loadEntities: flow,
//       configureEntityOptions: action,
//     });
//   }

//   protected getElementType(): typeof DataSpace {
//     return DataSpace;
//   }

//   protected transformElement(
//     element: DataSpace,
//   ): ResolvedDataSpaceEntityWithOrigin {
//     return new ResolvedDataSpaceEntityWithOrigin(
//       undefined,
//       element.title,
//       element.name,
//       element.path,
//       element.defaultExecutionContext.title,
//     );
//   }

//   get isAdvancedDataSpaceSearchEnabled(): boolean {
//     return false;
//   }

//   get canVisitTemplateQuery(): boolean {
//     return false;
//   }

//   visitTemplateQuery(
//     dataSpace: DataSpace,
//     template: DataSpaceExecutableAnalysisResult,
//   ): void {
//     throw new Error('Method not implemented.');
//   }
// }

// export class DataSpacesDepotRepository
//   extends DepotEntityRepository<ResolvedDataSpaceEntityWithOrigin>
//   implements
//   Pick<
//     DataSpacesEntityRepository
//   > {
//   advancedSearchState?: DataSpaceAdvancedSearchState | undefined;

//   constructor(
//     depotServerClient: DepotServerClient,
//     applicationStore: GenericLegendApplicationStore,
//     graphManagerState: GraphManagerState,
//     project: ProjectGAVCoordinates,
//     viewProject: (
//       groupId: string,
//       artifactId: string,
//       versionId: string,
//       entityPath: string | undefined,
//     ) => void,
//     viewSDLCProject: (
//       groupId: string,
//       artifactId: string,
//       entityPath: string | undefined,
//     ) => Promise<void>,
//     prioritizeEntityFunc?:
//       | ((val: ResolvedDataSpaceEntityWithOrigin) => boolean)
//       | undefined,
//   ) {
//     super(
//       depotServerClient,
//       applicationStore,
//       graphManagerState,
//       project,
//       viewProject,
//       viewSDLCProject,
//       prioritizeEntityFunc,
//     );
//     makeObservable(this, {
//       advancedSearchState: observable,
//       entities: observable,
//       showAdvancedSearchPanel: action,
//       hideAdvancedSearchPanel: action,
//       configureEntityOptions: action,
//       loadEntities: flow,
//     });
//   }

//   get isAdvancedDataSpaceSearchEnabled(): boolean {
//     return true;
//   }

//   showAdvancedSearchPanel(dataSpace: DataSpace): void {
//     this.advancedSearchState = new DataSpaceAdvancedSearchState(
//       this.applicationStore,
//       this.graphManagerState,
//       this.depotServerClient,
//       {
//         viewProject: this.viewProject,
//         viewSDLCProject: this.viewSDLCProject,
//       },
//       new ResolvedDataSpaceEntityWithOrigin(
//         {
//           groupId: this.project.groupId,
//           artifactId: this.project.artifactId,
//           versionId: this.project.versionId,
//         },
//         dataSpace.title,
//         dataSpace.name,
//         dataSpace.path,
//         dataSpace.defaultExecutionContext.name,
//       ),
//       this.project.versionId === SNAPSHOT_VERSION_ALIAS,
//     );
//   }

//   hideAdvancedSearchPanel(): void {
//     this.advancedSearchState = undefined;
//   }

//   *loadEntities(): GeneratorFn<void> {
//     if (this.entities === undefined) {
//       this.loadEntitiesState.inProgress();
//       const toGetSnapShot = this.project.versionId === SNAPSHOT_VERSION_ALIAS;
//       try {
//         this.entities = (
//           (yield this.depotServerClient.getEntitiesByClassifier(
//             DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
//             {
//               scope: toGetSnapShot ? DepotScope.SNAPSHOT : DepotScope.RELEASES,
//             },
//           )) as StoredEntity[]
//         ).map((storedEntity) =>
//           extractDataSpaceInfo(storedEntity, toGetSnapShot),
//         );
//         this.loadEntitiesState.pass();
//       } catch (error) {
//         assertErrorThrown(error);
//         this.loadEntitiesState.fail();
//         this.applicationStore.notificationService.notifyError(error);
//         this.applicationStore.logService.error(
//           LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
//           error,
//         );
//       }
//     }
//   }

//   viewDataSpace(val: ResolvedDataSpaceEntityWithOrigin): void {
//     this.viewEntityInProject(val.path);
//   }

//   getGraphData(): GraphData {
//     const option = new LegendSDLC(
//       this.project.groupId,
//       this.project.artifactId,
//       resolveVersion(this.project.versionId),
//     );
//     return new GraphDataWithOrigin(option);
//   }
// }
