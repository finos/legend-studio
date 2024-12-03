import { flow, makeObservable, observable } from 'mobx';
import {
  DataCubeSourceType,
  type CubeInputSourceState,
} from './CubeInputSourceLoader.js';
import { SavedQueryInputSourceState } from './SavedQueryInputSourceState.js';
import type { LegendDataCubeStoreContext } from '../LegendDataCubeEditorStore.js';
import {
  UnsupportedOperationError,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { CubeInputSource } from './CubeInputSource.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';

export class LegendDataCubeSourceBuilder {
  readonly context: LegendDataCubeStoreContext;
  open = false;
  sourceState: CubeInputSourceState;

  constructor(context: LegendDataCubeStoreContext) {
    makeObservable(this, {
      open: observable,
      sourceState: observable,
      inputSource: flow,
    });
    this.context = context;
    this.sourceState = this.buildSource(guaranteeNonNullable(this.options[0]));
  }

  get options(): DataCubeSourceType[] {
    return Object.values(DataCubeSourceType);
  }

  get currentOption(): DataCubeSourceType {
    throw new UnsupportedOperationError('');
  }

  openModal(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  changeSource(source: DataCubeSourceType): void {
    if (this.sourceState.label !== source) {
      this.sourceState = this.buildSource(source);
    }
  }

  buildSource(source: DataCubeSourceType): CubeInputSourceState {
    if (source === DataCubeSourceType.LEGEND_QUERY) {
      return SavedQueryInputSourceState.builder(this.context);
    } else if (source === DataCubeSourceType.DEPOT_QUERY) {
    }
    throw new UnsupportedOperationError('Not supported');
  }

  *inputSource(
    callback: (source: CubeInputSource, engine: DataCubeEngine) => void,
  ): GeneratorFn<void> {
    try {
      assertTrue(
        this.sourceState.isValid,
        'Source State is in a valid state to input',
      );
      const engine =
        (yield this.sourceState.buildCubeEngine()) as DataCubeEngine;
      const source = this.sourceState.process();
      callback(source, engine);
      this.close();
    } catch (error) {
      assertErrorThrown(error);
      this.context.applicationStore.notificationService.notifyError(
        `Unable to import: ${this.sourceState.label}: ${error.message}`,
      );
    }
  }
}
