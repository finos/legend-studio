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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  IllegalStateError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { LegendQueryDataCubeSourceBuilderState } from './source/LegendQueryDataCubeSourceBuilderState.js';
import type {
  LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from './LegendDataCubeBaseStore.js';
import type { GraphManagerState } from '@finos/legend-graph';
import {
  LegendDataCubeSourceBuilderType,
  type LegendDataCubeSourceBuilderState,
} from './source/LegendDataCubeSourceBuilderState.js';
import { DataCubeQuery, type DisplayState } from '@finos/legend-data-cube';
import type { LegendDataCubeDataCubeEngine } from './LegendDataCubeDataCubeEngine.js';
import { LegendDataCubeNewQueryBuilder } from '../components/LegendDataCubeNewQueryBuilder.js';

export class LegendDataCubeNewQueryState {
  readonly application: LegendDataCubeApplicationStore;
  readonly baseStore: LegendDataCubeBaseStore;
  readonly graphManagerState: GraphManagerState;
  readonly engine: LegendDataCubeDataCubeEngine;
  readonly display: DisplayState;

  sourceBuilder: LegendDataCubeSourceBuilderState;

  constructor(baseStore: LegendDataCubeBaseStore) {
    makeObservable(this, {
      sourceBuilder: observable,
      currentSourceBuilderOption: computed,
      changeSourceBuilder: action,
    });

    this.application = baseStore.application;
    this.baseStore = baseStore;
    this.graphManagerState = baseStore.graphManagerState;
    this.engine = baseStore.engine;
    this.display = this.engine.layout.newDisplay('New Query', () => (
      <LegendDataCubeNewQueryBuilder state={this} />
    ));

    this.sourceBuilder = this.createSourceBuilder(
      LegendDataCubeSourceBuilderType.LEGEND_QUERY,
    );
  }

  get sourceBuilderOptions(): LegendDataCubeSourceBuilderType[] {
    return Object.values(LegendDataCubeSourceBuilderType);
  }

  get currentSourceBuilderOption(): LegendDataCubeSourceBuilderType {
    return this.sourceBuilder.label;
  }

  changeSourceBuilder(type: LegendDataCubeSourceBuilderType): void {
    if (this.sourceBuilder.label !== type) {
      switch (type) {
        case LegendDataCubeSourceBuilderType.LEGEND_QUERY: {
          this.sourceBuilder = new LegendQueryDataCubeSourceBuilderState(
            this.baseStore,
          );
          break;
        }
        default:
          throw new UnsupportedOperationError(
            `Can't change source to unsupported type '${type}'`,
          );
      }
      this.sourceBuilder = this.createSourceBuilder(type);
    }
  }

  private createSourceBuilder(
    type: LegendDataCubeSourceBuilderType,
  ): LegendDataCubeSourceBuilderState {
    switch (type) {
      case LegendDataCubeSourceBuilderType.LEGEND_QUERY:
        return new LegendQueryDataCubeSourceBuilderState(this.baseStore);
      default:
        throw new UnsupportedOperationError(
          `Can't build source state for unsupported type '${type}'`,
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
    query.query = `~[${processedSource.columns.map((column) => `'${column.name}'`)}]->select()`;

    return query;
  }
}
