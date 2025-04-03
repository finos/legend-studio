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
import {
  type DataCubeAlertService,
  type DataCubeAPI,
  type DataCubeLayoutService,
  type DataCubeTaskService,
  DataCubeSpecification,
  DEFAULT_ALERT_WINDOW_CONFIG,
  type DisplayState,
  DataCubeSpecificationOptions,
  type DataCubeSource,
} from '@finos/legend-data-cube';
import { LegendDataCubeCreatorState } from './LegendDataCubeCreatorState.js';
import {
  PersistentDataCube,
  type LightPersistentDataCube,
  type V1_EngineServerClient,
  type V1_PureGraphManager,
} from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  formatDate,
  isString,
  returnUndefOnError,
  UnsupportedOperationError,
  uuid,
} from '@finos/legend-shared';
import type { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import { LegendDataCubeSaver } from '../../components/builder/LegendDataCubeSaver.js';
import {
  generateBuilderRoute,
  LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN,
} from '../../__lib__/LegendDataCubeNavigation.js';
import { LegendDataCubeLoaderState } from './LegendDataCubeLoaderState.js';
import {
  LegendDataCubeUserDataKey,
  RECENTLY_VIEWED_DATA_CUBES_LIMIT,
} from '../../__lib__/LegendDataCubeUserData.js';
import type { DepotServerClient } from '@finos/legend-server-depot';
import { LegendDataCubeBlockingWindowState } from '../../components/LegendDataCubeBlockingWindow.js';
import { LegendDataCubeDeleteConfirmation } from '../../components/builder/LegendDataCubeDeleteConfirmation.js';
import {
  LegendDataCubeAbout,
  LegendDataCubeReleaseLogManager,
} from '../../components/builder/LegendDataCubeBuilder.js';
import { LegendDataCubeSourceViewer } from '../../components/builder/LegendDataCubeSourceViewer.js';
import { LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE } from '../model/LocalFileDataCubeSource.js';
import type { LegendDataCubeSourceLoaderState } from './source/LegendDataCubeSourceLoaderState.js';
import { LocalFileDataCubeSourceLoaderState } from './source/LocalFileDataCubeSourceLoaderState.js';
import { LEGEND_DATACUBE_APP_EVENT } from '../../__lib__/LegendDataCubeEvent.js';

export class LegendDataCubeBuilderState {
  readonly uuid = uuid();
  readonly startTime = Date.now();

  readonly initialSpecification!: DataCubeSpecification;
  persistentDataCube?: PersistentDataCube | undefined;

  dataCube?: DataCubeAPI | undefined;
  source?: DataCubeSource | undefined;

  constructor(
    specification: DataCubeSpecification,
    persistentDataCube?: PersistentDataCube | undefined,
  ) {
    makeObservable(this, {
      persistentDataCube: observable,
      setPersistentDataCube: action,

      dataCube: observable,
      setDataCube: action,

      source: observable,
      setSource: action,
    });

    this.initialSpecification = specification;
    this.persistentDataCube = persistentDataCube;
  }

  setPersistentDataCube(val: PersistentDataCube | undefined) {
    this.persistentDataCube = val;
  }

  setDataCube(val: DataCubeAPI | undefined) {
    this.dataCube = val;
  }

  setSource(val: DataCubeSource | undefined) {
    this.source = val;
  }
}

export type LegendDataCubeSaveOptions = {
  syncName?: boolean | undefined;
  autoEnableCache?: boolean | undefined;
};

export class LegendDataCubeBuilderStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly baseStore: LegendDataCubeBaseStore;
  readonly engine: LegendDataCubeDataCubeEngine;
  readonly depotServerClient: DepotServerClient;
  readonly engineServerClient: V1_EngineServerClient;
  readonly graphManager: V1_PureGraphManager;
  readonly taskService: DataCubeTaskService;
  readonly layoutService: DataCubeLayoutService;
  readonly alertService: DataCubeAlertService;

  readonly initializeState = ActionState.create();
  readonly aboutDisplay: DisplayState;
  readonly releaseLogDisplay: DisplayState;
  readonly releaseNotesDisplay: DisplayState;

  readonly creator: LegendDataCubeCreatorState;

  readonly saveState = ActionState.create();
  readonly saverDisplay: LegendDataCubeBlockingWindowState;

  readonly deleteState = ActionState.create();
  dataCubeToDelete?: LightPersistentDataCube | PersistentDataCube | undefined;
  readonly deleteConfirmationDisplay: LegendDataCubeBlockingWindowState;

  readonly loadState = ActionState.create();
  readonly loader: LegendDataCubeLoaderState;
  builder?: LegendDataCubeBuilderState | undefined;
  readonly sourceViewerDisplay: DisplayState;

  sourceLoader?: LegendDataCubeSourceLoaderState | undefined;

  private passedFirstLoad = false;

  constructor(baseStore: LegendDataCubeBaseStore) {
    makeObservable(this, {
      builder: observable,
      setBuilder: action,

      sourceLoader: observable,
      setSourceLoader: action,

      dataCubeToDelete: observable,
      setDataCubeToDelete: action,
    });

    this.application = baseStore.application;
    this.baseStore = baseStore;
    this.engine = baseStore.engine;
    this.depotServerClient = baseStore.depotServerClient;
    this.engineServerClient = baseStore.engineServerClient;
    this.graphManager = baseStore.graphManager;
    this.taskService = baseStore.taskService;
    this.alertService = baseStore.alertService;
    this.layoutService = baseStore.layoutService;

    this.aboutDisplay = this.layoutService.newDisplay(
      'About',
      () => <LegendDataCubeAbout />,
      {
        ...DEFAULT_ALERT_WINDOW_CONFIG,
        height: 220,
        x: -50,
        y: 50,
        center: false,
      },
    );

    this.releaseLogDisplay = this.layoutService.newDisplay(
      'Release Log',
      () => <LegendDataCubeReleaseLogManager showOnlyLatestNotes={false} />,
      {
        ...DEFAULT_ALERT_WINDOW_CONFIG,
        height: 500,
      },
    );
    this.releaseNotesDisplay = this.layoutService.newDisplay(
      'Release Notes',
      () => <LegendDataCubeReleaseLogManager showOnlyLatestNotes={true} />,
      {
        ...DEFAULT_ALERT_WINDOW_CONFIG,
        height: 350,
      },
    );

    this.creator = new LegendDataCubeCreatorState(this);
    this.loader = new LegendDataCubeLoaderState(this);
    this.saverDisplay = new LegendDataCubeBlockingWindowState(
      'Save DataCube',
      () => <LegendDataCubeSaver />,
      {
        ...DEFAULT_ALERT_WINDOW_CONFIG,
        height: 200,
      },
    );
    this.deleteConfirmationDisplay = new LegendDataCubeBlockingWindowState(
      'Delete DataCube',
      () => <LegendDataCubeDeleteConfirmation />,
      {
        ...DEFAULT_ALERT_WINDOW_CONFIG,
        height: 180,
      },
    );
    this.sourceViewerDisplay = this.layoutService.newDisplay(
      'DataCube Source',
      () => <LegendDataCubeSourceViewer />,
      {
        ...DEFAULT_ALERT_WINDOW_CONFIG,
        height: 200,
      },
    );
  }

  setBuilder(val: LegendDataCubeBuilderState | undefined) {
    this.builder = val;
  }

  setSourceLoader(val: LegendDataCubeSourceLoaderState | undefined) {
    this.sourceLoader = val;
  }

  private updateWindowTitle(persistentDataCube: PersistentDataCube) {
    this.application.layoutService.setWindowTitle(
      `\u229E ${persistentDataCube.name}${this.builder ? ` - ${formatDate(new Date(this.builder.startTime), 'HH:mm:ss EEE MMM dd yyyy')}` : ''}`,
    );
  }

  getRecentlyViewedDataCubes() {
    const data = this.application.userDataService.getObjectValue(
      LegendDataCubeUserDataKey.RECENTLY_VIEWED_DATA_CUBES,
    );
    return data && Array.isArray(data) && data.every((id) => isString(id))
      ? data
      : [];
  }

  canCurrentUserManageDataCube(
    persistentDataCube: PersistentDataCube | LightPersistentDataCube,
  ) {
    return (
      persistentDataCube.owner === this.application.identityService.currentUser
    );
  }

  async initialize() {
    if (this.initializeState.isInProgress) {
      return;
    }

    this.initializeState.inProgress();
    try {
      await this.engine.initialize();
      this.initializeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Infrastructure Failure: ${error.message}`,
      });
      this.initializeState.fail();
    }
  }

  async cleanUp() {
    try {
      await this.engine.dispose();
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Infrastructure Failure: ${error.message}`,
      });
    }
  }

  private getSourceLoader(
    specification: DataCubeSpecification,
    persistentDataCube: PersistentDataCube,
  ) {
    const sourceData = specification.source;
    const onSuccess = async () => {
      const dataCubeId = persistentDataCube.id;
      this.finalizeLoad(specification, persistentDataCube, dataCubeId);
      this.loadState.pass();
    };
    const onError = async (error: unknown) => {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `DataCube Load Failure: ${error.message}`,
      });
      this.application.navigationService.navigator.updateCurrentLocation(
        generateBuilderRoute(null),
      );
      this.loadState.fail();
    };
    switch (sourceData._type) {
      case LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE:
        return new LocalFileDataCubeSourceLoaderState(
          this.application,
          this.engine,
          this.alertService,
          sourceData,
          persistentDataCube,
          onSuccess,
          onError,
        );
      default:
        throw new UnsupportedOperationError(
          `Can't create source loader for unsupported type '${sourceData._type}'`,
        );
    }
  }

  async loadDataCube(dataCubeId: string | undefined) {
    // internalize the parameters and clean them from the URL
    const sourceData =
      this.application.navigationService.navigator.getCurrentLocationParameterValue(
        LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.SOURCE_DATA,
      );
    if (sourceData && !dataCubeId) {
      this.application.navigationService.navigator.updateCurrentLocation(
        generateBuilderRoute(null),
      );
      // populate the creator if source data is specified
      try {
        await this.creator.finalize(JSON.parse(atob(sourceData)));
      } catch (error) {
        assertErrorThrown(error);
        this.alertService.alertError(error, {
          message: `DataCube Creation Failure: Can't materialize source from source data. Error: ${error.message}`,
        });
        this.setBuilder(undefined);
      }
    }

    // When user just starts the application with no DataCube ID, and source data
    if (!dataCubeId && !sourceData && !this.builder && !this.passedFirstLoad) {
      this.loader.display.open();
    }
    this.passedFirstLoad = true;

    if (dataCubeId !== this.builder?.persistentDataCube?.id) {
      if (!dataCubeId) {
        this.setBuilder(undefined);
        return;
      }

      this.loadState.inProgress();
      const task = this.taskService.newTask('Loading DataCube...');

      try {
        const persistentDataCube =
          await this.baseStore.graphManager.getDataCube(dataCubeId);
        const specification = DataCubeSpecification.serialization.fromJson(
          persistentDataCube.content,
        );

        const sourceLoader = returnUndefOnError(() =>
          this.getSourceLoader(specification, persistentDataCube),
        );
        if (sourceLoader !== undefined) {
          this.setSourceLoader(sourceLoader);
          sourceLoader.display.open();
          return;
        }

        this.finalizeLoad(specification, persistentDataCube, dataCubeId);
        this.loadState.pass();
        this.engine.sendTelemetry(
          LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE__SUCCESS,
          {
            ...this.engine.getDataFromRawSource(specification.source),
            dataCubeId: dataCubeId,
          },
        );
      } catch (error) {
        assertErrorThrown(error);
        const message = `DataCube Load Failure: ${error.message}`;
        this.engine.sendTelemetry(
          LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE__FAILURE,
          {
            ...this.engine.getDataFromRawSource(
              this.builder?.initialSpecification.source,
            ),
            dataCubeId: dataCubeId,
            error: message,
          },
        );
        this.alertService.alertError(error, {
          message: message,
        });
        this.application.navigationService.navigator.updateCurrentLocation(
          generateBuilderRoute(null),
        );

        this.loadState.fail();
      } finally {
        this.taskService.endTask(task);
      }
    }
  }

  private finalizeLoad(
    specification: DataCubeSpecification,
    persistentDataCube: PersistentDataCube,
    dataCubeId: string,
  ) {
    this.setBuilder(
      new LegendDataCubeBuilderState(specification, persistentDataCube),
    );
    this.updateWindowTitle(persistentDataCube);

    // update the list of stack of recently viewed DataCubes
    const recentlyViewedDataCubes = this.getRecentlyViewedDataCubes();
    const idx = recentlyViewedDataCubes.findIndex(
      (data) => data === dataCubeId,
    );
    if (idx === -1) {
      if (recentlyViewedDataCubes.length >= RECENTLY_VIEWED_DATA_CUBES_LIMIT) {
        recentlyViewedDataCubes.pop();
      }
      recentlyViewedDataCubes.unshift(dataCubeId);
    } else {
      recentlyViewedDataCubes.splice(idx, 1);
      recentlyViewedDataCubes.unshift(dataCubeId);
    }
    this.application.userDataService.persistValue(
      LegendDataCubeUserDataKey.RECENTLY_VIEWED_DATA_CUBES,
      recentlyViewedDataCubes,
    );
  }

  private async generatePersistentDataCube(
    api: DataCubeAPI,
    name: string,
    existingPersistentDataCube?: PersistentDataCube | undefined,
    options?: LegendDataCubeSaveOptions,
  ) {
    const specification = await api.generateSpecification();
    let persistentDataCube: PersistentDataCube;
    if (existingPersistentDataCube) {
      persistentDataCube = existingPersistentDataCube.clone();
    } else {
      persistentDataCube = new PersistentDataCube();
      persistentDataCube.id = uuid();
    }

    if (options !== undefined) {
      specification.options =
        specification.options ?? new DataCubeSpecificationOptions();
      specification.options.autoEnableCache = options.autoEnableCache;

      if (options.syncName && specification.configuration) {
        specification.configuration.name = name;
      }
    }

    persistentDataCube.name = name;
    persistentDataCube.content =
      DataCubeSpecification.serialization.toJson(specification);
    return persistentDataCube;
  }

  async createNewDataCube(name: string, options?: LegendDataCubeSaveOptions) {
    if (!this.builder?.dataCube || this.saveState.isInProgress) {
      return;
    }

    this.saveState.inProgress();
    const task = this.taskService.newTask('Creating DataCube...');

    try {
      const persistentDataCube = await this.generatePersistentDataCube(
        this.builder.dataCube,
        name,
        undefined,
        options,
      );

      const newPersistentDataCube =
        await this.baseStore.graphManager.createDataCube(persistentDataCube);
      // NOTE: reload is the cleanest, least bug-prone handling here
      // but we can opt for just updating the URL to reflect the new DataCube
      // as an optimization. Also, it helps preserve the edition history
      // on the existing data-cube.
      //
      // Another way to avoid reloading the whole app it to force update
      // the <DataCube/> component using the key prop that ties to an ID
      // of the builder.
      this.builder.setPersistentDataCube(newPersistentDataCube);
      this.application.navigationService.navigator.updateCurrentLocation(
        generateBuilderRoute(newPersistentDataCube.id),
      );
      this.updateWindowTitle(persistentDataCube);
      if (options?.syncName) {
        this.builder.dataCube.updateName(name);
      }

      this.saverDisplay.close();
      this.saveState.pass();
      this.engine.sendTelemetry(
        LEGEND_DATACUBE_APP_EVENT.CREATE_DATACUBE__SUCCESS,
        this.engine.getDataFromSource(
          this.builder.dataCube.getProcessedSource(),
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      const message = `DataCube Creation Failure: ${error.message}`;
      this.alertService.alertError(error, {
        message: message,
      });
      this.saveState.fail();
      this.engine.sendTelemetry(
        LEGEND_DATACUBE_APP_EVENT.CREATE_DATACUBE__FAILURE,
        {
          ...this.engine.getDataFromSource(
            this.builder.dataCube.getProcessedSource(),
          ),
          error: message,
        },
      );
    } finally {
      this.taskService.endTask(task);
    }
  }

  async saveDataCube(
    name: string,
    options?: LegendDataCubeSaveOptions & { saveAsNew?: boolean | undefined },
  ) {
    if (!this.builder?.dataCube || this.saveState.isInProgress) {
      return;
    }

    this.saveState.inProgress();
    const task = this.taskService.newTask('Saving DataCube...');

    try {
      const persistentDataCube = await this.generatePersistentDataCube(
        this.builder.dataCube,
        name,
        this.builder.persistentDataCube,
        options,
      );

      if (options?.saveAsNew) {
        persistentDataCube.id = uuid();
        const newPersistentDataCube =
          await this.baseStore.graphManager.createDataCube(persistentDataCube);
        // NOTE: reload is the cleanest, least bug-prone handling here
        // but we can opt for just updating the URL to reflect the new DataCube
        // as an optimization. Also, it helps preserve the edition history
        // on the existing data-cube.
        //
        // Another way to avoid reloading the whole app it to force update
        // the <DataCube/> component using the key prop that ties to an ID
        // of the builder.
        this.builder.setPersistentDataCube(newPersistentDataCube);
        this.application.navigationService.navigator.updateCurrentLocation(
          generateBuilderRoute(newPersistentDataCube.id),
        );
      } else {
        const updatedPersistentDataCube =
          await this.baseStore.graphManager.updateDataCube(persistentDataCube);
        this.builder.setPersistentDataCube(updatedPersistentDataCube);
      }
      this.updateWindowTitle(persistentDataCube);
      if (options?.syncName) {
        this.builder.dataCube.updateName(name);
      }

      this.saverDisplay.close();
      this.saveState.pass();
      this.engine.sendTelemetry(
        options?.saveAsNew
          ? LEGEND_DATACUBE_APP_EVENT.CREATE_DATACUBE__SUCCESS
          : LEGEND_DATACUBE_APP_EVENT.UPDATE_DATACUBE__SUCCESS,
        {
          ...this.engine.getDataFromSource(
            this.builder.dataCube.getProcessedSource(),
          ),
          autoEnableCache: !!options?.autoEnableCache,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      const message = `DataCube Update Failure: ${error.message}`;
      this.engine.sendTelemetry(
        options?.saveAsNew
          ? LEGEND_DATACUBE_APP_EVENT.CREATE_DATACUBE__FAILURE
          : LEGEND_DATACUBE_APP_EVENT.UPDATE_DATACUBE__FAILURE,
        {
          ...this.engine.getDataFromSource(
            this.builder.dataCube.getProcessedSource(),
          ),
          autoEnableCache: !!options?.autoEnableCache,
          error: message,
        },
      );
      this.alertService.alertError(error, {
        message: message,
      });
      this.saveState.fail();
    } finally {
      this.taskService.endTask(task);
    }
  }

  setDataCubeToDelete(
    val: LightPersistentDataCube | PersistentDataCube | undefined,
  ) {
    this.dataCubeToDelete = val;
  }

  async deleteDataCube() {
    if (this.deleteState.isInProgress || !this.dataCubeToDelete) {
      return;
    }
    const dataCubeId = this.dataCubeToDelete.id;

    this.deleteState.inProgress();
    const task = this.taskService.newTask('Deleting DataCube...');

    try {
      const persistentDataCubeToDelete =
        this.dataCubeToDelete instanceof PersistentDataCube
          ? this.dataCubeToDelete
          : await this.baseStore.graphManager.getDataCube(dataCubeId);
      const specification = DataCubeSpecification.serialization.fromJson(
        persistentDataCubeToDelete.content,
      );
      await this.baseStore.graphManager.deleteDataCube(dataCubeId);

      // update the list of stack of recently viewed DataCubes
      const recentlyViewedDataCubes = this.getRecentlyViewedDataCubes();
      const idx = recentlyViewedDataCubes.findIndex(
        (data) => data === dataCubeId,
      );
      if (idx !== -1) {
        recentlyViewedDataCubes.splice(idx, 1);
        this.application.userDataService.persistValue(
          LegendDataCubeUserDataKey.RECENTLY_VIEWED_DATA_CUBES,
          recentlyViewedDataCubes,
        );
      }

      if (this.builder?.persistentDataCube?.id === dataCubeId) {
        this.application.navigationService.navigator.updateCurrentLocation(
          generateBuilderRoute(null),
        );
      }

      if (this.loader.selectedResult?.id === dataCubeId) {
        this.loader.setSelectedResult(undefined);
      }

      this.setDataCubeToDelete(undefined);
      this.deleteConfirmationDisplay.close();
      this.deleteState.pass();
      this.engine.sendTelemetry(
        LEGEND_DATACUBE_APP_EVENT.DELETE_DATACUBE__SUCCESS,
        {
          ...this.engine.getDataFromRawSource(specification.source),
          dataCubeDeletedId: dataCubeId,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      const message = `DataCube Delete Failure: ${error.message}`;
      this.engine.sendTelemetry(
        LEGEND_DATACUBE_APP_EVENT.DELETE_DATACUBE__FAILURE,
        { error: message, dataCubeFailedToDeleteId: this.dataCubeToDelete.id },
      );
      this.alertService.alertError(error, {
        message: message,
      });
      this.deleteState.fail();
    } finally {
      this.taskService.endTask(task);
    }
  }
}
