import {
  UnsupportedOperationError,
  guaranteeNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import { type CubeInputSource } from './CubeInputSource.js';
import type { VersionedProjectData } from '@finos/legend-server-depot';
import type { DataCubeEngine } from '@finos/legend-data-cube';
import {
  CubeInputSourceState,
  DataCubeSourceType,
} from './CubeInputSourceLoader.js';
import type { LegendDataCubeStoreContext } from '../LegendDataCubeEditorStore.js';
import { makeObservable, observable } from 'mobx';

export enum SAVED_DEPOT_TYPE {
  SERVICE = 'SERVICE',
  FUNCTION = 'FUNCTION',
  TABLE = 'TABLE',
}

export abstract class SavedDepotSourceState {
  abstract get label(): SAVED_DEPOT_TYPE;
}

export class ServiceDepotSourceState extends SavedDepotSourceState {
  override get label(): SAVED_DEPOT_TYPE {
    return SAVED_DEPOT_TYPE.SERVICE;
  }
}

export class SavedDepotInputSourceState extends CubeInputSourceState {
  project: VersionedProjectData | undefined;
  selectedSource: SavedDepotSourceState;

  constructor(context: LegendDataCubeStoreContext) {
    super(context);
    makeObservable(this, {
      project: observable,
      selectedSource: observable,
    });

    this.selectedSource = this.build(guaranteeNonNullable(this.options[0]));
  }

  get options(): SAVED_DEPOT_TYPE[] {
    return Object.values(SAVED_DEPOT_TYPE);
  }
  override process(): CubeInputSource {
    // assertTrue(this.isValid);
    // if (this.element instanceof Service) {
    // }

    throw new UnsupportedOperationError('');
  }

  *fectchAssociatedProjectsAndVersions(): GeneratorFn<void> {
    throw new UnsupportedOperationError('not supported yet');
  }

  static override builder(
    context: LegendDataCubeStoreContext,
  ): CubeInputSourceState {
    return new SavedDepotInputSourceState(context);
  }

  build(source: SAVED_DEPOT_TYPE): SavedDepotSourceState {
    // if (source === SAVED_DEPOT_TYPE.SERVICE) {
    // }

    throw new UnsupportedOperationError('');
  }

  override get label(): DataCubeSourceType {
    return DataCubeSourceType.DEPOT_QUERY;
  }
  override setup(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async buildCubeEngine(): Promise<DataCubeEngine | undefined> {
    throw new Error('Method not implemented.');
  }

  override get isValid(): boolean {
    throw new Error('Method not implemented.');
  }
}
