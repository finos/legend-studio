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
import type { GraphManagerState } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import type {
  DepotServerClient,
  StoredEntity,
} from '@finos/legend-server-depot';
import {
  ProjectVersionEntities,
  ProjectData,
  generateGAVCoordinates,
} from '@finos/legend-server-depot';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import { AssertionError, assertNonNullable } from '@finos/legend-shared';
import {
  addUniqueEntry,
  guaranteeNonNullable,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import type { StudioConfig, StudioPluginManager } from '@finos/legend-studio';
import { makeObservable, flow, observable, action, flowResult } from 'mobx';
import { generatePath } from 'react-router';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceTaxonomyNodePaths,
  getResolvedDataSpace,
} from '../../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';
import { DataSpaceViewerState } from '../DataSpaceViewerState';

export enum ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN {
  TAXONOMY_PATH = 'taxonomyPath',
  GAV = 'gav',
  DATA_SPACE_PATH = 'dataSpacePath',
}

export const ENTERPRISE_MODEL_EXPLORER_ROUTE_PATTERN = Object.freeze({
  ENTERPRISE_VIEW: `/enterprise/`,
  ENTERPRISE_VIEW_BY_TAXONOMY_NODE: `/enterprise/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.TAXONOMY_PATH}`,
  ENTERPRISE_VIEW_BY_DATA_SPACE: `/enterprise/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.TAXONOMY_PATH}/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.GAV}/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.DATA_SPACE_PATH}`,
});

export interface EnterpriseModelExplorerPathParams {
  [ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.TAXONOMY_PATH]?: string;
  [ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.GAV]?: string;
  [ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.DATA_SPACE_PATH]?: string;
}

export const generateTaxonomyNodeRoute = (taxonomyNodePath: string): string =>
  generatePath(
    ENTERPRISE_MODEL_EXPLORER_ROUTE_PATTERN.ENTERPRISE_VIEW_BY_TAXONOMY_NODE,
    {
      taxonomyPath: taxonomyNodePath,
    },
  );

export const generateDataSpaceRoute = (
  taxonomyNodePath: string,
  GAVCoordinates: string,
  dataSpacePath: string,
): string =>
  generatePath(
    ENTERPRISE_MODEL_EXPLORER_ROUTE_PATTERN.ENTERPRISE_VIEW_BY_DATA_SPACE,
    {
      taxonomyPath: taxonomyNodePath,
      gav: GAVCoordinates,
      dataSpacePath,
    },
  );

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
  enterpriseModelExplorerStore: EnterpriseModelExplorerStore;
  taxonomyNode: TaxonomyTreeNodeData;
  dataSpaceViewerState?: DataSpaceViewerState | undefined;
  currentDataSpace?: RawDataSpace | undefined;
  initDataSpaceViewerState = ActionState.create();

  constructor(
    enterpriseModelExplorerStore: EnterpriseModelExplorerStore,
    taxonomyNode: TaxonomyTreeNodeData,
  ) {
    makeObservable(this, {
      dataSpaceViewerState: observable,
      currentDataSpace: observable,
      clearDataSpaceViewerState: action,
      initializeDataSpaceViewer: flow,
    });
    this.enterpriseModelExplorerStore = enterpriseModelExplorerStore;
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
      const LATEST_VERSION_ALIAS = 'latest';
      const projectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.enterpriseModelExplorerStore.depotServerClient.getProject(
            groupId,
            artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      const resolvedVersionId =
        versionId === LATEST_VERSION_ALIAS
          ? projectData.latestVersion
          : versionId;
      const entities =
        (yield this.enterpriseModelExplorerStore.depotServerClient.getVersionEntities(
          groupId,
          artifactId,
          resolvedVersionId,
        )) as Entity[];
      this.enterpriseModelExplorerStore.graphManagerState.resetGraph();
      // build dependencies
      const dependencyManager =
        this.enterpriseModelExplorerStore.graphManagerState.createEmptyDependencyManager();
      const dependencyEntitiesMap = new Map<string, Entity[]>();
      (
        (yield this.enterpriseModelExplorerStore.depotServerClient.getDependencyEntities(
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
        this.enterpriseModelExplorerStore.graphManagerState.graphManager.buildDependencies(
          this.enterpriseModelExplorerStore.graphManagerState.coreModel,
          this.enterpriseModelExplorerStore.graphManagerState.systemModel,
          dependencyManager,
          dependencyEntitiesMap,
        ),
      );
      this.enterpriseModelExplorerStore.graphManagerState.graph.setDependencyManager(
        dependencyManager,
      );
      yield flowResult(
        this.enterpriseModelExplorerStore.graphManagerState.graphManager.buildGraph(
          this.enterpriseModelExplorerStore.graphManagerState.graph,
          entities,
        ),
      );

      // resolve data space
      const resolvedDataSpace = getResolvedDataSpace(
        rawDataSpace.json,
        this.enterpriseModelExplorerStore.graphManagerState.graph,
      );
      const dataSpaceViewerState = new DataSpaceViewerState(
        this.enterpriseModelExplorerStore.graphManagerState,
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
            this.enterpriseModelExplorerStore.applicationStore.navigator.openNewWindow(
              this.enterpriseModelExplorerStore.applicationStore.navigator.generateLocation(
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
      this.enterpriseModelExplorerStore.applicationStore.notifyError(error);
      this.clearDataSpaceViewerState();
    } finally {
      this.initDataSpaceViewerState.complete();
    }
  }
}

export class EnterpriseModelExplorerStore {
  applicationStore: ApplicationStore<StudioConfig>;
  depotServerClient: DepotServerClient;
  graphManagerState: GraphManagerState;
  pluginManager: StudioPluginManager;

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
    applicationStore: ApplicationStore<StudioConfig>,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    pluginManager: StudioPluginManager,
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
    this.depotServerClient = depotServerClient;
    this.graphManagerState = graphManagerState;
    this.pluginManager = pluginManager;
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

  internalizeDataSpacePath(params: EnterpriseModelExplorerPathParams): void {
    const { gav, dataSpacePath } = params;
    if (gav && dataSpacePath) {
      this.initialDataSpaceId = `${gav}${DATA_SPACE_ID_DELIMITER}${dataSpacePath}`;
      this.applicationStore.navigator.goTo(
        ENTERPRISE_MODEL_EXPLORER_ROUTE_PATTERN.ENTERPRISE_VIEW,
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

  *initialize(params: EnterpriseModelExplorerPathParams): GeneratorFn<void> {
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
