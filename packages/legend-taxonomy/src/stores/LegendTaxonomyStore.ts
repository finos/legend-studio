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

import { type ApplicationStore, TAB_SIZE } from '@finos/legend-application';
import {
  type TreeData,
  type TreeNodeData,
  HotkeyConfiguration,
  NonBlockingDialogState,
  PanelDisplayState,
} from '@finos/legend-art';
import {
  DataSpaceViewerState,
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceTaxonomyNodes,
  getResolvedDataSpace,
} from '@finos/legend-extension-dsl-data-space';
import type { ClassView } from '@finos/legend-extension-dsl-diagram';
import {
  type GraphBuilderReport,
  type GraphManagerState,
  GraphManagerTelemetry,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import {
  type DepotServerClient,
  type StoredEntity,
  parseGAVCoordinates,
  LATEST_VERSION_ALIAS,
  ProjectVersionEntities,
  ProjectData,
  generateGAVCoordinates,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  AssertionError,
  assertNonNullable,
  addUniqueEntry,
  guaranteeNonNullable,
  ActionState,
  assertErrorThrown,
  StopWatch,
} from '@finos/legend-shared';
import {
  makeObservable,
  flow,
  observable,
  action,
  flowResult,
  computed,
} from 'mobx';
import type { LegendTaxonomyConfig } from '../application/LegendTaxonomyConfig';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager';
import { LEGEND_TAXONOMY_APP_EVENT } from './LegendTaxonomyAppEvent';
import {
  generateViewTaxonomyRoute,
  type LegendTaxonomyPathParams,
  type LegendTaxonomyStandaloneDataSpaceViewerParams,
} from './LegendTaxonomyRouter';
import {
  type TaxonomyServerClient,
  TaxonomyNodeData,
} from './TaxonomyServerClient';

const DATA_SPACE_ID_DELIMITER = '@';
const TAXONOMY_NODE_PATH_DELIMITER = '::';

export class RawDataSpace {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  json: Record<PropertyKey, unknown>;
  taxonomyNodes: string[] = [];

  constructor(
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
    json: Record<PropertyKey, unknown>,
  ) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.path = path;
    this.json = json;
    this.taxonomyNodes = extractDataSpaceTaxonomyNodes(this.json);
  }

  get id(): string {
    return `${generateGAVCoordinates(
      this.groupId,
      this.artifactId,
      this.versionId,
    )}${DATA_SPACE_ID_DELIMITER}${this.path}`;
  }
}

export class TaxonomyTreeNodeData implements TreeNodeData {
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  readonly label: string;
  readonly id: string;
  taxonomyData?: TaxonomyNodeData | undefined;
  childrenIds: string[] = [];
  rawDataSpaces: RawDataSpace[] = [];

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  get taxonomyPath(): string {
    return this.id;
  }
}

interface TaxonomyNodeDataSpaceOption {
  label: string;
  value: RawDataSpace;
}

export const buildTaxonomyNodeDataSpaceOption = (
  value: RawDataSpace,
): TaxonomyNodeDataSpaceOption => ({
  label: value.path,
  value,
});

export class TaxonomyNodeViewerState {
  taxonomyStore: LegendTaxonomyStore;
  taxonomyNode: TaxonomyTreeNodeData;
  initDataSpaceViewerState = ActionState.create();
  dataSpaceViewerState?: DataSpaceViewerState | undefined;
  currentDataSpace?: RawDataSpace | undefined;
  dataSpaceSearchText = '';

  constructor(
    taxonomyStore: LegendTaxonomyStore,
    taxonomyNode: TaxonomyTreeNodeData,
  ) {
    makeObservable(this, {
      dataSpaceViewerState: observable,
      currentDataSpace: observable,
      dataSpaceSearchText: observable,
      dataSpaceOptions: computed,
      clearDataSpaceViewerState: action,
      setDataSpaceSearchText: action,
      initializeDataSpaceViewer: flow,
    });
    this.taxonomyStore = taxonomyStore;
    this.taxonomyNode = taxonomyNode;
  }

  get dataSpaceOptions(): TaxonomyNodeDataSpaceOption[] {
    return this.taxonomyNode.rawDataSpaces
      .map(buildTaxonomyNodeDataSpaceOption)
      .filter(
        (option) =>
          !this.dataSpaceSearchText ||
          option.value.path
            .toLowerCase()
            .includes(this.dataSpaceSearchText.trim().toLowerCase()),
      );
  }

  setDataSpaceSearchText(val: string): void {
    this.dataSpaceSearchText = val;
  }

  clearDataSpaceViewerState(): void {
    this.dataSpaceViewerState = undefined;
    this.currentDataSpace = undefined;
  }

  *initializeDataSpaceViewer(rawDataSpace: RawDataSpace): GeneratorFn<void> {
    try {
      this.initDataSpaceViewerState.inProgress();
      const stopWatch = new StopWatch();

      // reset
      this.taxonomyStore.graphManagerState.resetGraph();

      const groupId = guaranteeNonNullable(
        rawDataSpace.json.groupId,
        `Data space 'groupId' field is missing`,
      ) as string;
      const artifactId = guaranteeNonNullable(
        rawDataSpace.json.artifactId,
        `Data space 'artifactId' field is missing`,
      ) as string;
      const versionId = guaranteeNonNullable(
        rawDataSpace.json.versionId,
        `Data space 'versionId' field is missing`,
      ) as string;

      // fetch entities
      stopWatch.record();
      this.initDataSpaceViewerState.setMessage(`Fetching entities...`);
      const projectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.taxonomyStore.depotServerClient.getProject(groupId, artifactId),
        )) as PlainObject<ProjectData>,
      );
      const resolvedVersionId =
        versionId === LATEST_VERSION_ALIAS
          ? projectData.latestVersion
          : versionId;
      const entities =
        (yield this.taxonomyStore.depotServerClient.getVersionEntities(
          groupId,
          artifactId,
          resolvedVersionId,
        )) as Entity[];
      this.initDataSpaceViewerState.setMessage(undefined);
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

      // fetch dependencies
      stopWatch.record();
      const dependencyManager =
        this.taxonomyStore.graphManagerState.createEmptyDependencyManager();
      this.taxonomyStore.graphManagerState.graph.dependencyManager =
        dependencyManager;
      dependencyManager.buildState.setMessage(`Fetching dependencies...`);
      const dependencyEntitiesMap = new Map<string, Entity[]>();
      (
        (yield this.taxonomyStore.depotServerClient.getDependencyEntities(
          groupId,
          artifactId,
          resolvedVersionId,
          true,
          false,
        )) as PlainObject<ProjectVersionEntities>[]
      )
        .map(ProjectVersionEntities.serialization.fromJson)
        .forEach((dependencyInfo) => {
          dependencyEntitiesMap.set(dependencyInfo.id, dependencyInfo.entities);
        });
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

      // build dependencies
      const dependency_buildReport =
        (yield this.taxonomyStore.graphManagerState.graphManager.buildDependencies(
          this.taxonomyStore.graphManagerState.coreModel,
          this.taxonomyStore.graphManagerState.systemModel,
          dependencyManager,
          dependencyEntitiesMap,
        )) as GraphBuilderReport;
      dependency_buildReport.timings[
        GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED
      ] = stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

      // build graph
      const graph_buildReport =
        (yield this.taxonomyStore.graphManagerState.graphManager.buildGraph(
          this.taxonomyStore.graphManagerState.graph,
          entities,
        )) as GraphBuilderReport;
      graph_buildReport.timings[GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED] =
        stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

      // report
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED);
      const graphBuilderReportData = {
        timings: {
          [GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED]: stopWatch.getRecord(
            GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED,
          ),
        },
        dependencies: dependency_buildReport,
        graph: graph_buildReport,
      };
      this.taxonomyStore.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
        graphBuilderReportData,
      );
      GraphManagerTelemetry.logEvent_GraphInitialized(
        this.taxonomyStore.applicationStore.telemetryService,
        graphBuilderReportData,
      );

      // build dataspace
      this.initDataSpaceViewerState.setMessage(`Building dataspace...`);
      const resolvedDataSpace = getResolvedDataSpace(
        rawDataSpace.json,
        this.taxonomyStore.graphManagerState.graph,
      );
      const dataSpaceViewerState = new DataSpaceViewerState(
        this.taxonomyStore.graphManagerState,
        rawDataSpace.groupId,
        rawDataSpace.artifactId,
        rawDataSpace.versionId,
        resolvedDataSpace,
        {
          viewProject: (
            _groupId: string,
            _artifactId: string,
            _versionId: string,
            entityPath: string | undefined,
          ): void => {
            this.taxonomyStore.applicationStore.navigator.openNewWindow(
              `${
                this.taxonomyStore.applicationStore.config.studioUrl
              }/view/archive/${generateGAVCoordinates(
                _groupId,
                _artifactId,
                _versionId,
              )}${entityPath ? `/entity/${entityPath}` : ''}`,
            );
          },
        },
      );
      dataSpaceViewerState.onDiagramClassDoubleClick = (
        classView: ClassView,
      ): void => {
        this.taxonomyStore.applicationStore.navigator.openNewWindow(
          `${this.taxonomyStore.applicationStore.config.queryUrl}/create/` +
            `${dataSpaceViewerState.dataSpace.groupId}/` +
            `${dataSpaceViewerState.dataSpace.artifactId}/` +
            `${dataSpaceViewerState.dataSpace.versionId}/` +
            `${dataSpaceViewerState.currentExecutionContext.mapping.value.path}/` +
            `${dataSpaceViewerState.currentRuntime.path}/` +
            `${classView.class.value.path}/`,
        );
      };
      this.dataSpaceViewerState = dataSpaceViewerState;
      this.initDataSpaceViewerState.setMessage(undefined);

      this.currentDataSpace = rawDataSpace;
    } catch (error) {
      assertErrorThrown(error);
      this.taxonomyStore.applicationStore.notifyError(error);
      this.clearDataSpaceViewerState();
    } finally {
      this.initDataSpaceViewerState.complete();
    }
  }
}

enum LEGEND_TAXONOMY_HOTKEY {
  SEARCH_TAXONOMY = 'SEARCH_TAXONOMY',
}

const LEGEND_TAXONOMY_HOTKEY_MAP = Object.freeze({
  [LEGEND_TAXONOMY_HOTKEY.SEARCH_TAXONOMY]: 'ctrl+p',
});

export class LegendTaxonomyStore {
  applicationStore: ApplicationStore<LegendTaxonomyConfig>;
  depotServerClient: DepotServerClient;
  taxonomyServerClient: TaxonomyServerClient;
  graphManagerState: GraphManagerState;
  pluginManager: LegendTaxonomyPluginManager;

  sideBarDisplayState = new PanelDisplayState({
    initial: 300,
    default: 300,
    snap: 150,
  });
  isInExpandedMode = true;
  hotkeys: HotkeyConfiguration[] = [];
  searchTaxonomyNodeCommandState = new NonBlockingDialogState();

  initState = ActionState.create();

  dataSpaceIndex = new Map<string, RawDataSpace>();
  treeData?: TreeData<TaxonomyTreeNodeData> | undefined;

  initialTaxonomyPath?: string | undefined;
  initialDataSpaceId?: string | undefined;
  currentTaxonomyNodeViewerState?: TaxonomyNodeViewerState | undefined;

  // standalone data space viewer
  initStandaloneDataSpaceViewerState = ActionState.create();
  standaloneDataSpaceViewerState?: DataSpaceViewerState | undefined;

  constructor(
    applicationStore: ApplicationStore<LegendTaxonomyConfig>,
    taxonomyServerClient: TaxonomyServerClient,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    pluginManager: LegendTaxonomyPluginManager,
  ) {
    makeObservable(this, {
      isInExpandedMode: observable,
      standaloneDataSpaceViewerState: observable,
      treeData: observable.ref,
      currentTaxonomyNodeViewerState: observable,
      initialize: flow,
      initializeStandaloneDataSpaceViewer: flow,
      setExpandedMode: action,
      setTreeData: action,
      setCurrentTaxonomyNodeViewerState: action,
    });
    this.applicationStore = applicationStore;
    this.taxonomyServerClient = taxonomyServerClient;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = graphManagerState;
    this.pluginManager = pluginManager;

    // Register plugins
    this.taxonomyServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    // Hotkeys
    this.hotkeys = [
      new HotkeyConfiguration(
        LEGEND_TAXONOMY_HOTKEY.SEARCH_TAXONOMY,
        [LEGEND_TAXONOMY_HOTKEY_MAP.SEARCH_TAXONOMY],
        (event?: KeyboardEvent): void => {
          event?.preventDefault();
          this.searchTaxonomyNodeCommandState.open();
        },
      ),
    ];
  }

  setExpandedMode(val: boolean): void {
    this.isInExpandedMode = val;
  }

  setTreeData(val: TreeData<TaxonomyTreeNodeData>): void {
    this.treeData = val;
  }

  setCurrentTaxonomyNodeViewerState(
    val: TaxonomyNodeViewerState | undefined,
  ): void {
    this.currentTaxonomyNodeViewerState = val;
  }

  internalizeDataSpacePath(params: LegendTaxonomyPathParams): void {
    const { taxonomyPath, gav, dataSpacePath } = params;
    if (taxonomyPath) {
      this.initialTaxonomyPath = taxonomyPath;
      if (gav && dataSpacePath) {
        this.initialDataSpaceId = `${gav}${DATA_SPACE_ID_DELIMITER}${dataSpacePath}`;
      }
      this.applicationStore.navigator.goTo(
        generateViewTaxonomyRoute(
          this.applicationStore.config.currentTaxonomyServerOption,
        ),
      );
    }
  }

  private processTaxonomyTreeNodeData(
    treeData: TreeData<TaxonomyTreeNodeData>,
    taxonomyNodeData: TaxonomyNodeData,
    taxonomyNodePath: string,
    parentNode: TaxonomyTreeNodeData | undefined,
  ): TaxonomyTreeNodeData {
    const idx = taxonomyNodePath.indexOf(TAXONOMY_NODE_PATH_DELIMITER);
    let taxonomy: string;
    let remainingTaxonomyNodePath: string | undefined = undefined;
    if (idx === -1) {
      taxonomy = taxonomyNodePath;
    } else {
      taxonomy = taxonomyNodePath.substring(0, idx);
      remainingTaxonomyNodePath = taxonomyNodePath.substring(
        idx + TAXONOMY_NODE_PATH_DELIMITER.length,
      );
    }
    const nodeId = parentNode
      ? `${parentNode.id}${TAXONOMY_NODE_PATH_DELIMITER}${taxonomy}`
      : taxonomy;
    if (!treeData.nodes.has(nodeId)) {
      const newNode = new TaxonomyTreeNodeData(nodeId, taxonomy);
      treeData.nodes.set(nodeId, newNode);
    }
    const node = guaranteeNonNullable(treeData.nodes.get(nodeId));
    if (remainingTaxonomyNodePath) {
      const childNode = this.processTaxonomyTreeNodeData(
        treeData,
        taxonomyNodeData,
        remainingTaxonomyNodePath,
        node,
      );
      addUniqueEntry(node.childrenIds, childNode.id);
    } else {
      node.taxonomyData = taxonomyNodeData;
    }
    return node;
  }

  private initializeTaxonomyTreeData(taxonomyData: TaxonomyNodeData[]): void {
    const rootIds: string[] = [];
    const nodes = new Map<string, TaxonomyTreeNodeData>();
    const treeData = { rootIds, nodes };

    // validate taxonomy data
    const uniqueNodeIds = new Set<string>();
    const uniquePackages = new Set<string>();
    let isTaxonomyTreeDataValid = true;
    for (const taxonomyNodeData of taxonomyData) {
      if (uniqueNodeIds.has(taxonomyNodeData.guid)) {
        isTaxonomyTreeDataValid = false;
        this.applicationStore.log.warn(
          LogEvent.create(
            LEGEND_TAXONOMY_APP_EVENT.TAXONOMY_DATA_CHECK_FAILURE,
          ),
          `Found duplicated taxonomy node with ID '${taxonomyNodeData.guid}'`,
        );
      }
      uniqueNodeIds.add(taxonomyNodeData.guid);
      if (uniquePackages.has(taxonomyNodeData.package)) {
        isTaxonomyTreeDataValid = false;
        this.applicationStore.log.warn(
          LogEvent.create(
            LEGEND_TAXONOMY_APP_EVENT.TAXONOMY_DATA_CHECK_FAILURE,
          ),
          `Found duplicated taxonomy node with package '${taxonomyNodeData.package}'`,
        );
      }
      uniquePackages.add(taxonomyNodeData.package);
    }
    if (!isTaxonomyTreeDataValid) {
      this.applicationStore.notifyWarning(
        `Found duplication in taxonomy data: taxonomy accuracy might be affected`,
      );
    }

    // build tree
    taxonomyData.forEach((taxonomyNodeData) => {
      const rootNode = this.processTaxonomyTreeNodeData(
        treeData,
        taxonomyNodeData,
        taxonomyNodeData.package,
        undefined,
      );
      addUniqueEntry(rootIds, rootNode.id);
    });

    // Add dataspaces to tree nodes
    // NOTE: If we add a dataspace to a node, we will also add it to all of its ancestor nodes
    Array.from(this.dataSpaceIndex.values()).forEach((rawDataSpace) => {
      const taxonomyNodeIds = rawDataSpace.taxonomyNodes;
      taxonomyNodeIds.forEach((nodeId) => {
        const taxonomyNodeData = taxonomyData.find(
          (nodeData) => nodeData.guid === nodeId,
        );
        if (taxonomyNodeData) {
          let currentPath = taxonomyNodeData.package;
          while (currentPath) {
            const treeNode = treeData.nodes.get(currentPath);
            if (treeNode) {
              addUniqueEntry(treeNode.rawDataSpaces, rawDataSpace);
            }
            const idx = currentPath.lastIndexOf(TAXONOMY_NODE_PATH_DELIMITER);
            currentPath = idx === -1 ? '' : currentPath.substring(0, idx);
          }
        }
      });
    });

    this.setTreeData({ rootIds, nodes });
  }

  openTaxonomyTreeNodeWithPath(
    taxonomyPath: string,
  ): TaxonomyTreeNodeData | undefined {
    assertNonNullable(
      this.treeData,
      `Can't open taxonomy tree node: taxonomy tree data has not been initialized`,
    );
    const node = this.treeData.nodes.get(taxonomyPath);
    if (node) {
      node.isOpen = true;
      const taxonomyPathParts = taxonomyPath.split(
        TAXONOMY_NODE_PATH_DELIMITER,
      );
      let currentTaxonomyPath = '';
      for (let i = 0; i < taxonomyPathParts.length; ++i) {
        currentTaxonomyPath += `${i !== 0 ? TAXONOMY_NODE_PATH_DELIMITER : ''}${
          taxonomyPathParts[i]
        }`;
        const nodeToOpen = guaranteeNonNullable(
          this.treeData.nodes.get(currentTaxonomyPath),
        );
        nodeToOpen.isOpen = true;
        this.setTreeData({ ...this.treeData });
      }
      this.setCurrentTaxonomyNodeViewerState(
        new TaxonomyNodeViewerState(this, node),
      );
    }
    return node;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();
    try {
      // Get taxonomy tree data
      const taxonomyData = (
        (yield this.taxonomyServerClient.getTaxonomyData()) as PlainObject<TaxonomyNodeData>[]
      ).map((nodeDataJson) =>
        TaxonomyNodeData.serialization.fromJson(nodeDataJson),
      );

      // Get all dataspaces
      (
        (yield this.depotServerClient.getEntitiesByClassifierPath(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
        )) as StoredEntity[]
      )
        .map(
          (storedEntity) =>
            new RawDataSpace(
              storedEntity.groupId,
              storedEntity.artifactId,
              storedEntity.versionId,
              storedEntity.entity.path,
              storedEntity.entity.content,
            ),
        )
        // NOTE: only care about data space tagged with taxonomy information
        .filter((rawDataSpace) => rawDataSpace.taxonomyNodes.length)
        .forEach((rawDataSpace) => {
          this.dataSpaceIndex.set(rawDataSpace.id, rawDataSpace);
        });

      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      );

      yield this.graphManagerState.initializeSystem();

      // NOTE: here we build the full tree, which might be expensive when we have a big
      // tree in the future, we might have to come up with a better algorithm then
      // to incrementally build the tree
      this.initializeTaxonomyTreeData(taxonomyData);

      if (this.treeData) {
        const taxonomyPath = this.initialTaxonomyPath;
        if (taxonomyPath) {
          const node = this.openTaxonomyTreeNodeWithPath(taxonomyPath);
          if (node) {
            // open data space if specified
            if (this.initialDataSpaceId) {
              const dataSpaceToOpen = node.rawDataSpaces.find(
                (rawDataSpace) => rawDataSpace.id === this.initialDataSpaceId,
              );
              const initialDataSpaceId = this.initialDataSpaceId;
              this.initialDataSpaceId = undefined;
              if (dataSpaceToOpen) {
                assertNonNullable(this.currentTaxonomyNodeViewerState);
                yield flowResult(
                  this.currentTaxonomyNodeViewerState.initializeDataSpaceViewer(
                    dataSpaceToOpen,
                  ),
                );
              } else {
                throw new AssertionError(
                  `Can't find data space with ID '${initialDataSpaceId}' in taxonomy node with path '${taxonomyPath}'`,
                );
              }
            }
          } else {
            throw new AssertionError(
              `Can't find taxonomy node with path '${taxonomyPath}'`,
            );
          }
        }
      }

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.initState.fail();
      this.applicationStore.notifyError(error);
    }
  }

  *initializeStandaloneDataSpaceViewer(
    params: LegendTaxonomyStandaloneDataSpaceViewerParams,
  ): GeneratorFn<void> {
    if (!this.initStandaloneDataSpaceViewerState.isInInitialState) {
      return;
    }
    this.initStandaloneDataSpaceViewerState.inProgress();
    const stopWatch = new StopWatch();

    try {
      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      );

      yield this.graphManagerState.initializeSystem();

      // reset
      this.graphManagerState.resetGraph();

      // analyze the dataspace
      this.initStandaloneDataSpaceViewerState.setMessage(
        `Analyzing dataspace...`,
      );
      const { dataSpacePath, gav } = params;
      const dataSpaceGAVCoordinates = parseGAVCoordinates(gav);
      const dataSpaceProjectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(
            dataSpaceGAVCoordinates.groupId,
            dataSpaceGAVCoordinates.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      const resolvedDataSpaceVersionId =
        dataSpaceGAVCoordinates.versionId === LATEST_VERSION_ALIAS
          ? dataSpaceProjectData.latestVersion
          : dataSpaceGAVCoordinates.versionId;
      this.depotServerClient.get;
      const dataSpaceEntity = (yield this.depotServerClient.getVersionEntity(
        dataSpaceGAVCoordinates.groupId,
        dataSpaceGAVCoordinates.artifactId,
        resolvedDataSpaceVersionId,
        dataSpacePath,
      )) as Entity;

      const groupId = guaranteeNonNullable(
        dataSpaceEntity.content.groupId,
        `Data space 'groupId' field is missing`,
      ) as string;
      const artifactId = guaranteeNonNullable(
        dataSpaceEntity.content.artifactId,
        `Data space 'artifactId' field is missing`,
      ) as string;
      const versionId = guaranteeNonNullable(
        dataSpaceEntity.content.versionId,
        `Data space 'versionId' field is missing`,
      ) as string;

      const projectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(groupId, artifactId),
        )) as PlainObject<ProjectData>,
      );
      const resolvedVersionId =
        versionId === LATEST_VERSION_ALIAS
          ? projectData.latestVersion
          : versionId;

      // fetch entities
      stopWatch.record();
      this.initStandaloneDataSpaceViewerState.setMessage(
        `Fetching entities...`,
      );
      const entities = (yield this.depotServerClient.getVersionEntities(
        groupId,
        artifactId,
        resolvedVersionId,
      )) as Entity[];
      this.initStandaloneDataSpaceViewerState.setMessage(undefined);
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

      // build dependencies
      stopWatch.record();
      const dependencyManager =
        this.graphManagerState.createEmptyDependencyManager();
      this.graphManagerState.graph.dependencyManager = dependencyManager;
      dependencyManager.buildState.setMessage(`Fetching dependencies...`);
      const dependencyEntitiesMap = new Map<string, Entity[]>();
      (
        (yield this.depotServerClient.getDependencyEntities(
          groupId,
          artifactId,
          resolvedVersionId,
          true,
          false,
        )) as PlainObject<ProjectVersionEntities>[]
      )
        .map(ProjectVersionEntities.serialization.fromJson)
        .forEach((dependencyInfo) => {
          dependencyEntitiesMap.set(dependencyInfo.id, dependencyInfo.entities);
        });
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

      const dependency_buildReport =
        (yield this.graphManagerState.graphManager.buildDependencies(
          this.graphManagerState.coreModel,
          this.graphManagerState.systemModel,
          dependencyManager,
          dependencyEntitiesMap,
        )) as GraphBuilderReport;
      dependency_buildReport.timings[
        GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED
      ] = stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

      // build graph
      const graph_buildReport =
        (yield this.graphManagerState.graphManager.buildGraph(
          this.graphManagerState.graph,
          entities,
        )) as GraphBuilderReport;
      graph_buildReport.timings[GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED] =
        stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED);

      // report
      stopWatch.record();
      const graphBuilderReportData = {
        timings: {
          [GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED]: stopWatch.elapsed,
        },
        dependencies: dependency_buildReport,
        graph: graph_buildReport,
      };
      this.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
        graphBuilderReportData,
      );
      GraphManagerTelemetry.logEvent_GraphInitialized(
        this.applicationStore.telemetryService,
        graphBuilderReportData,
      );

      // build dataspace
      this.initStandaloneDataSpaceViewerState.setMessage(
        `Building dataspace...`,
      );
      const resolvedDataSpace = getResolvedDataSpace(
        dataSpaceEntity.content,
        this.graphManagerState.graph,
      );

      const dataSpaceViewerState = new DataSpaceViewerState(
        this.graphManagerState,
        groupId,
        artifactId,
        versionId,
        resolvedDataSpace,
        {
          viewProject: (
            _groupId: string,
            _artifactId: string,
            _versionId: string,
            entityPath: string | undefined,
          ): void => {
            this.applicationStore.navigator.openNewWindow(
              `${
                this.applicationStore.config.studioUrl
              }/view/archive/${generateGAVCoordinates(
                _groupId,
                _artifactId,
                _versionId,
              )}${entityPath ? `/entity/${entityPath}` : ''}`,
            );
          },
        },
      );
      dataSpaceViewerState.onDiagramClassDoubleClick = (
        classView: ClassView,
      ): void => {
        this.applicationStore.navigator.openNewWindow(
          `${this.applicationStore.config.queryUrl}/create/` +
            `${dataSpaceViewerState.dataSpace.groupId}/` +
            `${dataSpaceViewerState.dataSpace.artifactId}/` +
            `${dataSpaceViewerState.dataSpace.versionId}/` +
            `${dataSpaceViewerState.currentExecutionContext.mapping.value.path}/` +
            `${dataSpaceViewerState.currentRuntime.path}/` +
            `${classView.class.value.path}/`,
        );
      };
      this.standaloneDataSpaceViewerState = dataSpaceViewerState;
      this.initStandaloneDataSpaceViewerState.setMessage(undefined);

      this.initStandaloneDataSpaceViewerState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.initStandaloneDataSpaceViewerState.fail();
      this.applicationStore.notifyError(error);
    }
  }

  queryUsingDataSpace(dataSpaceViewerState: DataSpaceViewerState): void {
    this.applicationStore.navigator.openNewWindow(
      `${this.applicationStore.config.queryUrl}/create/` +
        `${dataSpaceViewerState.dataSpace.groupId}/` +
        `${dataSpaceViewerState.dataSpace.artifactId}/` +
        `${dataSpaceViewerState.dataSpace.versionId}/` +
        `${dataSpaceViewerState.currentExecutionContext.mapping.value.path}/` +
        `${dataSpaceViewerState.currentRuntime.path}`,
    );
  }
}
