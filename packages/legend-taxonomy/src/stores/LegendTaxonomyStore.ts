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

import type { ApplicationStore } from '@finos/legend-application';
import { TAB_SIZE } from '@finos/legend-application';
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import { PanelDisplayState } from '@finos/legend-art';
import {
  DataSpaceViewerState,
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceTaxonomyNodePaths,
  getResolvedDataSpace,
} from '@finos/legend-extension-dsl-data-space';
import type { GraphManagerState } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import type {
  DepotServerClient,
  StoredEntity,
} from '@finos/legend-server-depot';
import {
  LATEST_VERSION_ALIAS,
  ProjectVersionEntities,
  ProjectData,
  generateGAVCoordinates,
} from '@finos/legend-server-depot';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  TelemetryService,
  AssertionError,
  assertNonNullable,
  addUniqueEntry,
  guaranteeNonNullable,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { makeObservable, flow, observable, action, flowResult } from 'mobx';
import type { LegendTaxonomyConfig } from '../application/LegendTaxonomyConfig';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager';
import type { LegendTaxonomyPathParams } from './LegendTaxonomyRouter';
import { generateViewTaxonomyRoute } from './LegendTaxonomyRouter';
import type { TaxonomyServerClient } from './TaxonomyServerClient';

const DATA_SPACE_ID_DELIMITER = '@';
const TAXONOMY_NODE_PATH_DELIMITER = '::';

export class RawDataSpace {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  json: Record<PropertyKey, unknown>;
  taxonomyNodePaths: string[] = [];
  taxonomyNodes: TaxonomyTreeNodeData[] = [];

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
    this.taxonomyNodePaths = extractDataSpaceTaxonomyNodePaths(this.json);
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
  id: string;
  label: string;
  childrenIds: string[] = [];
  rawDataSpaces: RawDataSpace[] = [];

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }
}

export class TaxonomyViewerState {
  taxonomyStore: LegendTaxonomyStore;
  taxonomyNode: TaxonomyTreeNodeData;
  dataSpaceViewerState?: DataSpaceViewerState | undefined;
  currentDataSpace?: RawDataSpace | undefined;
  initDataSpaceViewerState = ActionState.create();

  constructor(
    taxonomyStore: LegendTaxonomyStore,
    taxonomyNode: TaxonomyTreeNodeData,
  ) {
    makeObservable(this, {
      dataSpaceViewerState: observable,
      currentDataSpace: observable,
      clearDataSpaceViewerState: action,
      initializeDataSpaceViewer: flow,
    });
    this.taxonomyStore = taxonomyStore;
    this.taxonomyNode = taxonomyNode;
  }

  clearDataSpaceViewerState(): void {
    this.dataSpaceViewerState = undefined;
    this.currentDataSpace = undefined;
  }

  *initializeDataSpaceViewer(rawDataSpace: RawDataSpace): GeneratorFn<void> {
    try {
      this.initDataSpaceViewerState.inProgress();
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

      // build graph
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
      this.taxonomyStore.graphManagerState.resetGraph();
      // build dependencies
      const dependencyManager =
        this.taxonomyStore.graphManagerState.createEmptyDependencyManager();
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
        .map((e) => ProjectVersionEntities.serialization.fromJson(e))
        .forEach((dependencyInfo) => {
          dependencyEntitiesMap.set(dependencyInfo.id, dependencyInfo.entities);
        });
      yield flowResult(
        this.taxonomyStore.graphManagerState.graphManager.buildDependencies(
          this.taxonomyStore.graphManagerState.coreModel,
          this.taxonomyStore.graphManagerState.systemModel,
          dependencyManager,
          dependencyEntitiesMap,
        ),
      );
      this.taxonomyStore.graphManagerState.graph.setDependencyManager(
        dependencyManager,
      );
      yield flowResult(
        this.taxonomyStore.graphManagerState.graphManager.buildGraph(
          this.taxonomyStore.graphManagerState.graph,
          entities,
        ),
      );

      // resolve data space
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
            groupId: string,
            artifactId: string,
            versionId: string,
            entityPath: string | undefined,
          ): void => {
            this.taxonomyStore.applicationStore.navigator.openNewWindow(
              this.taxonomyStore.applicationStore.navigator.generateLocation(
                `/view/${generateGAVCoordinates(
                  groupId,
                  artifactId,
                  versionId,
                )}${entityPath ? `/entity/${entityPath}` : ''}`,
              ),
            );
          },
        },
      );
      this.dataSpaceViewerState = dataSpaceViewerState;
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

export class LegendTaxonomyStore {
  applicationStore: ApplicationStore<LegendTaxonomyConfig>;
  depotServerClient: DepotServerClient;
  taxonomyServerClient: TaxonomyServerClient;
  graphManagerState: GraphManagerState;
  pluginManager: LegendTaxonomyPluginManager;
  telemetryService = new TelemetryService();

  sideBarDisplayState = new PanelDisplayState({
    initial: 300,
    default: 300,
    snap: 150,
  });
  isInExpandedMode = true;

  initState = ActionState.create();

  dataSpaceIndex = new Map<string, RawDataSpace>();
  treeData?: TreeData<TaxonomyTreeNodeData> | undefined;

  initialDataSpaceId?: string | undefined;
  currentTaxonomyViewerState?: TaxonomyViewerState | undefined;

  constructor(
    applicationStore: ApplicationStore<LegendTaxonomyConfig>,
    taxonomyServerClient: TaxonomyServerClient,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    pluginManager: LegendTaxonomyPluginManager,
  ) {
    makeObservable(this, {
      isInExpandedMode: observable,
      treeData: observable.ref,
      currentTaxonomyViewerState: observable,
      initialize: flow,
      setExpandedMode: action,
      setTreeData: action,
      setCurrentTaxonomyViewerState: action,
    });
    this.applicationStore = applicationStore;
    this.taxonomyServerClient = taxonomyServerClient;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = graphManagerState;
    this.pluginManager = pluginManager;

    // Register plugins
    this.taxonomyServerClient.registerTracerServicePlugins(
      this.pluginManager.getTracerServicePlugins(),
    );
    this.depotServerClient.registerTracerServicePlugins(
      this.pluginManager.getTracerServicePlugins(),
    );
    this.telemetryService.registerPlugins(
      this.pluginManager.getTelemetryServicePlugins(),
    );
  }

  setExpandedMode(val: boolean): void {
    this.isInExpandedMode = val;
  }

  setTreeData(val: TreeData<TaxonomyTreeNodeData>): void {
    this.treeData = val;
  }

  setCurrentTaxonomyViewerState(val: TaxonomyViewerState | undefined): void {
    this.currentTaxonomyViewerState = val;
  }

  internalizeDataSpacePath(params: LegendTaxonomyPathParams): void {
    const { gav, dataSpacePath } = params;
    if (gav && dataSpacePath) {
      this.initialDataSpaceId = `${gav}${DATA_SPACE_ID_DELIMITER}${dataSpacePath}`;
      this.applicationStore.navigator.goTo(
        generateViewTaxonomyRoute(
          this.applicationStore.config.currentTaxonomyServerOption,
        ),
      );
    }
  }

  private processTaxonomyTreeNodeData(
    treeData: TreeData<TaxonomyTreeNodeData>,
    rawDataSpace: RawDataSpace,
    taxonomyPath: string,
    parentNode: TaxonomyTreeNodeData | undefined,
  ): TaxonomyTreeNodeData {
    const idx = taxonomyPath.indexOf(TAXONOMY_NODE_PATH_DELIMITER);
    let taxonomy: string;
    let remainingTaxonomyNodePath: string | undefined = undefined;
    if (idx === -1) {
      taxonomy = taxonomyPath;
    } else {
      taxonomy = taxonomyPath.substring(0, idx);
      remainingTaxonomyNodePath = taxonomyPath.substring(
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
    addUniqueEntry(node.rawDataSpaces, rawDataSpace);
    addUniqueEntry(rawDataSpace.taxonomyNodes, node);
    if (remainingTaxonomyNodePath) {
      const childNode = this.processTaxonomyTreeNodeData(
        treeData,
        rawDataSpace,
        remainingTaxonomyNodePath,
        node,
      );
      addUniqueEntry(node.childrenIds, childNode.id);
    }

    return node;
  }

  private initializeTaxonomyTreeData(): void {
    const rootIds: string[] = [];
    const nodes = new Map<string, TaxonomyTreeNodeData>();
    const treeData = { rootIds, nodes };
    Array.from(this.dataSpaceIndex.values()).forEach((rawDataSpace) => {
      const taxonomyNodes = rawDataSpace.taxonomyNodePaths;
      taxonomyNodes.forEach((taxonomyPath) => {
        const rootNode = this.processTaxonomyTreeNodeData(
          treeData,
          rawDataSpace,
          taxonomyPath,
          undefined,
        );
        addUniqueEntry(rootIds, rootNode.id);
      });
    });
    this.setTreeData({ rootIds, nodes });
  }

  *initialize(params: LegendTaxonomyPathParams): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();
    try {
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
        .filter((rawDataSpace) => rawDataSpace.taxonomyNodePaths.length)
        .forEach((rawDataSpace) => {
          this.dataSpaceIndex.set(rawDataSpace.id, rawDataSpace);
        });

      yield flowResult(
        this.graphManagerState.graphManager.initialize(
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
            tracerServicePlugins: this.pluginManager.getTracerServicePlugins(),
          },
        ),
      );

      yield flowResult(this.graphManagerState.initializeSystem());

      // NOTE: here we build the full tree, which might be expensive when we have a big
      // tree in the future, we might have to come up with a better algorithm then
      // to incrementally build the tree
      this.initializeTaxonomyTreeData();

      if (this.treeData) {
        const taxonomyPath = params.taxonomyPath;
        if (taxonomyPath) {
          const node = this.treeData.nodes.get(taxonomyPath);
          if (node) {
            node.isOpen = true;
            const taxonomyPathParts = taxonomyPath.split(
              TAXONOMY_NODE_PATH_DELIMITER,
            );
            let currentTaxonomyPath = '';
            for (let i = 0; i < taxonomyPathParts.length; ++i) {
              currentTaxonomyPath += `${
                i !== 0 ? TAXONOMY_NODE_PATH_DELIMITER : ''
              }${taxonomyPathParts[i]}`;
              const nodeToOpen = guaranteeNonNullable(
                this.treeData.nodes.get(currentTaxonomyPath),
              );
              nodeToOpen.isOpen = true;
              this.setTreeData({ ...this.treeData });
            }
            this.setCurrentTaxonomyViewerState(
              new TaxonomyViewerState(this, node),
            );

            // open data space if specified
            if (this.initialDataSpaceId) {
              const dataSpaceToOpen = node.rawDataSpaces.find(
                (rawDataSpace) => rawDataSpace.id === this.initialDataSpaceId,
              );
              const initialDataSpaceId = this.initialDataSpaceId;
              this.initialDataSpaceId = undefined;
              if (dataSpaceToOpen) {
                assertNonNullable(this.currentTaxonomyViewerState);
                yield flowResult(
                  this.currentTaxonomyViewerState.initializeDataSpaceViewer(
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
}
