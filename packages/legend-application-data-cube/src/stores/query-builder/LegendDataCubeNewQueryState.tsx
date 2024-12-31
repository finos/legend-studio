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
import {
  ActionState,
  assertErrorThrown,
  IllegalStateError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { LegendQueryDataCubeSourceBuilderState } from './source-builder/LegendQueryDataCubeSourceBuilderState.js';
import type { LegendDataCubeApplicationStore } from '../LegendDataCubeBaseStore.js';
import {
  LegendDataCubeSourceBuilderType,
  type LegendDataCubeSourceBuilderState,
} from './source-builder/LegendDataCubeSourceBuilderState.js';
import {
  _selectFunction,
  DataCubeQuery,
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  type DisplayState,
} from '@finos/legend-data-cube';
import type { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import { LegendDataCubeNewQueryBuilder } from '../../components/query-builder/LegendDataCubeNewQueryBuilder.js';
import { AdhocQueryDataCubeSourceBuilderState } from './source-builder/AdhocQueryDataCubeSourceBuilderState.js';
import {
  LegendDataCubeQueryBuilderState,
  type LegendDataCubeQueryBuilderStore,
} from './LegendDataCubeQueryBuilderStore.js';
import { generateQueryBuilderRoute } from '../../__lib__/LegendDataCubeNavigation.js';

export class LegendDataCubeNewQueryState {
  readonly application: LegendDataCubeApplicationStore;
  readonly store: LegendDataCubeQueryBuilderStore;
  readonly engine: LegendDataCubeDataCubeEngine;
  readonly display: DisplayState;

  readonly finalizeState = ActionState.create();
  sourceBuilder: LegendDataCubeSourceBuilderState;

  constructor(store: LegendDataCubeQueryBuilderStore) {
    makeObservable(this, {
      sourceBuilder: observable,
      changeSourceBuilder: action,
    });

    this.application = store.application;
    this.store = store;
    this.engine = store.engine;
    this.display = this.engine.layout.newDisplay(
      'New Query',
      () => <LegendDataCubeNewQueryBuilder state={this} />,
      {
        ...DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
        width: 500,
        minWidth: 500,
      },
    );

    this.sourceBuilder = this.createSourceBuilder(
      LegendDataCubeSourceBuilderType.LEGEND_QUERY,
    );
  }

  changeSourceBuilder(
    type: LegendDataCubeSourceBuilderType,
    skipCheck?: boolean | undefined,
  ): void {
    if (this.sourceBuilder.label !== type || skipCheck) {
      this.sourceBuilder = this.createSourceBuilder(type);
    }
  }

  private createSourceBuilder(
    type: LegendDataCubeSourceBuilderType,
  ): LegendDataCubeSourceBuilderState {
    switch (type) {
      case LegendDataCubeSourceBuilderType.LEGEND_QUERY:
        return new LegendQueryDataCubeSourceBuilderState(this);
      case LegendDataCubeSourceBuilderType.ADHOC_QUERY:
        return new AdhocQueryDataCubeSourceBuilderState(this);
      default:
        throw new UnsupportedOperationError(
          `Can't create source builder for unsupported type '${type}'`,
        );
    }
  }

  async finalize() {
    if (!this.sourceBuilder.isValid) {
      throw new IllegalStateError(`Can't generate query: source is not valid`);
    }

    this.finalizeState.inProgress();
    try {
      const source = await this.sourceBuilder.build();
      const query = new DataCubeQuery();
      const processedSource = await this.engine.processQuerySource(source);
      query.source = source;
      query.query = await this.engine.getValueSpecificationCode(
        _selectFunction(processedSource.columns),
      );

      this.store.setBuilder(new LegendDataCubeQueryBuilderState(query));
      // only update the route instead of reloading in case we are creating
      // a new query when we are editing another query
      this.application.navigationService.navigator.updateCurrentLocation(
        generateQueryBuilderRoute(null),
      );

      // reset
      this.changeSourceBuilder(
        LegendDataCubeSourceBuilderType.LEGEND_QUERY,
        true,
      );
      this.display.close();
      this.finalizeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.engine.alertError(error, {
        message: `Query Creation Failure: ${error.message}`,
      });
      this.finalizeState.fail();
    }
  }
}
