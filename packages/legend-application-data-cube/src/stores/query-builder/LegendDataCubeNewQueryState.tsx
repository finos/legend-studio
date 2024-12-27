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
  IllegalStateError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { LegendQueryDataCubeSourceBuilderState } from './source-builder/LegendQueryDataCubeSourceBuilderState.js';
import type {
  LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from '../LegendDataCubeBaseStore.js';
import type { V1_PureGraphManager } from '@finos/legend-graph';
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

export class LegendDataCubeNewQueryState {
  readonly application: LegendDataCubeApplicationStore;
  readonly baseStore: LegendDataCubeBaseStore;
  readonly graphManager: V1_PureGraphManager;
  readonly engine: LegendDataCubeDataCubeEngine;
  readonly display: DisplayState;

  sourceBuilder: LegendDataCubeSourceBuilderState;

  constructor(baseStore: LegendDataCubeBaseStore) {
    makeObservable(this, {
      sourceBuilder: observable,
      changeSourceBuilder: action,
    });

    this.application = baseStore.application;
    this.baseStore = baseStore;
    this.graphManager = baseStore.graphManager;
    this.engine = baseStore.engine;
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

  changeSourceBuilder(type: LegendDataCubeSourceBuilderType): void {
    if (this.sourceBuilder.label !== type) {
      this.sourceBuilder = this.createSourceBuilder(type);
    }
  }

  private createSourceBuilder(
    type: LegendDataCubeSourceBuilderType,
  ): LegendDataCubeSourceBuilderState {
    switch (type) {
      case LegendDataCubeSourceBuilderType.LEGEND_QUERY:
        return new LegendQueryDataCubeSourceBuilderState(this.baseStore);
      case LegendDataCubeSourceBuilderType.ADHOC_QUERY:
        return new AdhocQueryDataCubeSourceBuilderState(this.baseStore);
      default:
        throw new UnsupportedOperationError(
          `Can't create source builder for unsupported type '${type}'`,
        );
    }
  }

  async generateQuery(): Promise<DataCubeQuery> {
    if (!this.sourceBuilder.isValid) {
      throw new IllegalStateError(`Can't generate query: source is not valid`);
    }
    const source = await this.sourceBuilder.build();
    const query = new DataCubeQuery();
    const processedSource = await this.engine.processQuerySource(source);
    query.source = source;
    query.query = await this.engine.getValueSpecificationCode(
      _selectFunction(processedSource.columns),
    );
    return query;
  }
}
