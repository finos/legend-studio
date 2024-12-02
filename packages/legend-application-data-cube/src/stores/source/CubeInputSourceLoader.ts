import { ActionState, UnsupportedOperationError } from '@finos/legend-shared';
import { type CubeInputSource } from './CubeInputSource.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';
import type { LegendDataCubeStoreContext } from '../LegendDataCubeEditorStore.js';

export enum DataCubeSourceType {
  LEGEND_QUERY = 'Legend Query',
  DEPOT_QUERY = 'Depot Query',
}

export abstract class CubeInputSourceState {
  buildCubeEngineState = ActionState.create();

  setupActionState = ActionState.create();

  readonly context: LegendDataCubeStoreContext;

  constructor(context: LegendDataCubeStoreContext) {
    this.context = context;
  }
  abstract get label(): DataCubeSourceType;

  async setup(): Promise<void> {
    this.setupActionState.complete();
  }

  abstract buildCubeEngine(): Promise<DataCubeEngine | undefined>;

  abstract process(): CubeInputSource;

  abstract get isValid(): boolean;

  get openActionable(): boolean {
    return true;
  }

  static builder(context: LegendDataCubeStoreContext): CubeInputSourceState {
    throw new UnsupportedOperationError('No builder');
  }
}
