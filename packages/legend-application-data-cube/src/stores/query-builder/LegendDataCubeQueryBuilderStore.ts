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
} from '../LegendDataCubeBaseStore.js';
import { DataCubeQuery } from '@finos/legend-data-cube';
import { LegendDataCubeNewQueryState } from './LegendDataCubeNewQueryState.js';
import type { PersistentDataCubeQuery } from '@finos/legend-graph';
import { ActionState, assertErrorThrown, uuid } from '@finos/legend-shared';
import type { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';

class LegendDataCubeQueryBuilderState {
  uuid = uuid();
  persistentQuery?: PersistentDataCubeQuery | undefined;
  query!: DataCubeQuery;

  constructor(
    query: DataCubeQuery,
    persistentQuery?: PersistentDataCubeQuery | undefined,
  ) {
    this.query = query;
    this.persistentQuery = persistentQuery;
  }
}

export class LegendDataCubeQueryBuilderStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly baseStore: LegendDataCubeBaseStore;
  readonly engine: LegendDataCubeDataCubeEngine;

  readonly newQueryState: LegendDataCubeNewQueryState;
  readonly loadQueryState = ActionState.create();
  builder?: LegendDataCubeQueryBuilderState | undefined;

  constructor(baseStore: LegendDataCubeBaseStore) {
    makeObservable(this, {
      builder: observable,
      setBuilder: action,
    });

    this.application = baseStore.application;
    this.baseStore = baseStore;
    this.engine = baseStore.engine;
    this.newQueryState = new LegendDataCubeNewQueryState(baseStore);
  }

  setBuilder(val: LegendDataCubeQueryBuilderState | undefined) {
    this.builder = val;
  }

  async loadQuery(queryId: string | undefined) {
    if (queryId !== this.builder?.persistentQuery?.id) {
      if (!queryId) {
        this.setBuilder(undefined);
        return;
      }

      this.loadQueryState.inProgress();

      try {
        const persistentQuery =
          await this.baseStore.graphManager.getDataCubeQuery(queryId);
        const query = DataCubeQuery.serialization.fromJson(
          persistentQuery.content,
        );
        this.setBuilder(
          new LegendDataCubeQueryBuilderState(query, persistentQuery),
        );
        this.loadQueryState.pass();
      } catch (error) {
        assertErrorThrown(error);
        this.engine.alertError(error, {
          message: `Query Load Failure: ${error.message}`,
        });
        this.loadQueryState.fail();
      }
    }
  }
}

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
