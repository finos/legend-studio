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

import type { QueryStore } from '@finos/legend-query';
import { QuerySetupState } from '@finos/legend-query';
import type { DataSpace } from '../../models/metamodels/pure/model/packageableElements/dataSpace/DataSpace';

// import {
//   action,
//   computed,
//   flow,
//   flowResult,
//   makeAutoObservable,
//   makeObservable,
//   observable,
// } from 'mobx';
// import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
// import {
//   ActionState,
//   assertErrorThrown,
//   guaranteeNonNullable,
// } from '@finos/legend-shared';
// import type {
//   LightQuery,
//   Mapping,
//   PackageableRuntime,
//   Service,
// } from '@finos/legend-graph';
// import { PureSingleExecution, PureMultiExecution } from '@finos/legend-graph';
// import type { QueryStore } from './QueryStore';
// import { ProjectData } from '@finos/legend-server-depot';
// import type { PackageableElementOption } from '@finos/legend-application';

export class DataSpaceQuerySetupState extends QuerySetupState {
  dataSpaces: DataSpace[] = [];
  // projects: ProjectData[] = [];
  // loadProjectsState = ActionState.create();
  // currentProject?: ProjectData | undefined;
  // currentVersionId?: string | undefined;
  // currentMapping?: Mapping | undefined;
  // currentRuntime?: PackageableRuntime | undefined;

  constructor(queryStore: QueryStore) {
    super(queryStore);

    // makeObservable(this, {
    //   projects: observable,
    //   currentProject: observable,
    //   currentVersionId: observable,
    //   currentMapping: observable,
    //   currentRuntime: observable,
    //   runtimeOptions: computed,
    //   setCurrentProject: action,
    //   setCurrentVersionId: action,
    //   setCurrentMapping: action,
    //   setCurrentRuntime: action,
    //   loadProjects: flow,
    // });
  }

  // setCurrentProject(val: ProjectData | undefined): void {
  //   this.currentProject = val;
  // }

  // setCurrentVersionId(val: string | undefined): void {
  //   this.currentVersionId = val;
  // }

  // setCurrentMapping(val: Mapping | undefined): void {
  //   this.currentMapping = val;
  // }

  // setCurrentRuntime(val: PackageableRuntime | undefined): void {
  //   this.currentRuntime = val;
  // }

  // get runtimeOptions(): PackageableElementOption<PackageableRuntime>[] {
  //   return this.currentMapping
  //     ? this.queryStore.queryBuilderState.runtimeOptions.filter((option) =>
  //         option.value.runtimeValue.mappings
  //           .map((mappingReference) => mappingReference.value)
  //           .includes(guaranteeNonNullable(this.currentMapping)),
  //       )
  //     : [];
  // }

  // *loadProjects(): GeneratorFn<void> {
  //   this.loadProjectsState.inProgress();
  //   try {
  //     this.projects = (
  //       (yield this.queryStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
  //     ).map((project) => ProjectData.serialization.fromJson(project));
  //     this.loadProjectsState.pass();
  //   } catch (error) {
  //     assertErrorThrown(error);
  //     this.loadProjectsState.fail();
  //     this.queryStore.applicationStore.notifyError(error);
  //   }
  // }
}

// export interface ServiceExecutionOption {
//   label: string;
//   value: { service: Service; key?: string };
// }

// export class ServiceQuerySetupState extends QuerySetupState {
//   projects: ProjectData[] = [];
//   loadProjectsState = ActionState.create();
//   currentProject?: ProjectData | undefined;
//   currentVersionId?: string | undefined;
//   currentService?: Service | undefined;
//   currentServiceExecutionKey?: string | undefined;

//   constructor(queryStore: QueryStore) {
//     super(queryStore);

//     makeObservable(this, {
//       projects: observable,
//       currentProject: observable,
//       currentVersionId: observable,
//       currentService: observable,
//       currentServiceExecutionKey: observable,
//       setCurrentProject: action,
//       setCurrentVersionId: action,
//       setCurrentServiceExecution: action,
//       loadProjects: flow,
//     });
//   }

//   setCurrentProject(val: ProjectData | undefined): void {
//     this.currentProject = val;
//   }

//   setCurrentVersionId(val: string | undefined): void {
//     this.currentVersionId = val;
//   }

//   setCurrentServiceExecution(
//     service: Service | undefined,
//     key: string | undefined,
//   ): void {
//     this.currentService = service;
//     this.currentServiceExecutionKey = key;
//   }

//   get serviceExecutionOptions(): ServiceExecutionOption[] {
//     return this.queryStore.queryBuilderState.serviceOptions.flatMap(
//       (option) => {
//         const service = option.value;
//         const serviceExecution = service.execution;
//         if (serviceExecution instanceof PureSingleExecution) {
//           return {
//             label: service.name,
//             value: {
//               service,
//             },
//           };
//         } else if (serviceExecution instanceof PureMultiExecution) {
//           return serviceExecution.executionParameters.map((parameter) => ({
//             label: `${service.name} [${parameter.key}]`,
//             value: {
//               service,
//               key: parameter.key,
//             },
//           }));
//         }
//         return [];
//       },
//     );
//   }

//   *loadProjects(): GeneratorFn<void> {
//     this.loadProjectsState.inProgress();
//     try {
//       this.projects = (
//         (yield this.queryStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
//       ).map((project) => ProjectData.serialization.fromJson(project));
//       this.loadProjectsState.pass();
//     } catch (error) {
//       assertErrorThrown(error);
//       this.loadProjectsState.fail();
//       this.queryStore.applicationStore.notifyError(error);
//     }
//   }
// }
