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

import { action, makeObservable, observable } from 'mobx';
import type {
  LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from './LegendDataCubeBaseStore.js';
import { type DataCubeQuery } from '@finos/legend-data-cube';

export class LegendDataCubeLandingPageStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly baseStore: LegendDataCubeBaseStore;

  query?: DataCubeQuery | undefined;

  constructor(baseStore: LegendDataCubeBaseStore) {
    makeObservable(this, {
      query: observable,
      setQuery: action,
    });

    this.application = baseStore.application;
    this.baseStore = baseStore;
  }

  setQuery(val: DataCubeQuery | undefined): void {
    this.query = val;
  }
}

// sourceSelector: LegendDataCubeSourceBuilder;
// cubeViewer: LegendCubeViewer | undefined;
// saveModal = false;
// saveModalState = ActionState.create();
// savedQuery: PersistentDataCubeQuery | undefined;
// cubeViewer: observable,
// sourceSelector: observable,
// saveModal: observable,
// setSaveModal: observable,
// saveModalState: observable,
// savedQuery: observable,
// initializeView: action,
// initialize: flow,
// saveQuery: flow,

// setSaveModal(val: boolean): void {
//   this.saveModal = val;
// }

// initializeView(source: DataCubeGenericSource, engine: DataCubeEngine): void {
//   this.cubeViewer = new LegendCubeViewer(source, engine);
// }

// *initialize(id: string): GeneratorFn<void> {
//   try {
//     yield flowResult(this.context.initialize());
//     const query =
//       (yield this.context.graphManagerState.graphManager.getDataCubeQuery(
//         id,
//       )) as unknown as PersistentDataCubeQuery;
//     this.savedQuery = query;
//     const source = deserializeDataCubeQueryConent(query.content).source;
//     if (source instanceof LegendSavedQuerySource) {
//       const queryInfo =
//         (yield this.context.graphManagerState.graphManager.getQueryInfo(
//           source.id,
//         )) as unknown as QueryInfo;
//       const execConext =
//         (yield this.context.graphManagerState.graphManager.resolveQueryInfoExecutionContext(
//           queryInfo,
//           () =>
//             this.context.depotServerClient.getVersionEntities(
//               queryInfo.groupId,
//               queryInfo.artifactId,
//               queryInfo.versionId,
//             ),
//         )) as { mapping: string | undefined; runtime: string };
//       const lambda =
//         (yield this.context.graphManagerState.graphManager.pureCodeToLambda(
//           queryInfo.content,
//         )) as unknown as RawLambda;
//       this.context.graphManagerState.graph.setOrigin(
//         new LegendSDLC(
//           queryInfo.groupId,
//           queryInfo.artifactId,
//           resolveVersion(queryInfo.versionId),
//         ),
//       );
//       // TODO: we should be able to call engine and convert lambda to relation if not one.
//       const engine = new LegendDataCubeDataCubeEngine(
//         lambda,
//         undefined,
//         execConext.mapping,
//         execConext.runtime,
//         this.context.graphManagerState,
//       );
//       this.initializeView(source, engine);
//     } else {
//       throw new UnsupportedOperationError('not supported');
//     }
//   } catch (error) {
//     assertErrorThrown(error);
//     this.application.notificationService.notifyError(
//       `Unable to initialie query with id '${id}'`,
//     );
//   }
// }

// *saveQuery(name: string): GeneratorFn<void> {
//   try {
//     this.saveModalState.inProgress();
//     const view = guaranteeNonNullable(this.cubeViewer);
//     const content = serializeDataCubeQueryConent(
//       createQueryBuilderContent(view.source),
//     );
//     const cubeQuery = new PersistentDataCubeQuery();
//     cubeQuery.content = content;
//     cubeQuery.name = name;
//     cubeQuery.id = uuid();
//     const querySaved =
//       (yield this.context.graphManagerState.graphManager.createQueryDataCube(
//         cubeQuery,
//       )) as unknown as PersistentDataCubeQuery;
//     this.savedQuery = querySaved;
//     // TODO: fix reload
//     this.application.navigationService.navigator.goToLocation(
//       generatedSavedQueryUrl(querySaved.id),
//     );
//     this.setSaveModal(false);
//     this.saveModalState.complete();
//   } catch (error) {
//     assertErrorThrown(error);
//     this.saveModalState.fail();
//     this.application.notificationService.notifyError(`Unable to save query`);
//   }
// }
