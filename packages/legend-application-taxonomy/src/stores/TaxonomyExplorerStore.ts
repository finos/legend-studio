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

import { CommandRegistrar, TAB_SIZE } from '@finos/legend-application';
import {
  type TreeData,
  type TreeNodeData,
  NonBlockingDialogState,
  PanelDisplayState,
} from '@finos/legend-art';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceTaxonomyNodes,
} from '@finos/legend-extension-dsl-data-space';
import { BasicGraphManagerState } from '@finos/legend-graph';
import type {
  DepotServerClient,
  StoredEntity,
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
} from '@finos/legend-shared';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { makeObservable, flow, observable, action, flowResult } from 'mobx';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager.js';
import { LEGEND_TAXONOMY_APP_EVENT } from './LegendTaxonomyAppEvent.js';
import type { LegendTaxonomyApplicationStore } from './LegendTaxonomyBaseStore.js';
import { LEGEND_TAXONOMY_COMMAND_KEY } from './LegendTaxonomyCommand.js';
import {
  generateExploreTaxonomyTreeRoute,
  type LegendTaxonomyPathParams,
} from './LegendTaxonomyRouter.js';
import { TaxonomyNodeViewerState } from './TaxonomyNodeViewerState.js';
import {
  type TaxonomyServerClient,
  TaxonomyNodeData,
} from './TaxonomyServerClient.js';

const DATA_SPACE_ID_DELIMITER = '@';
const TAXONOMY_NODE_PATH_DELIMITER = '::';

export class DataSpaceTaxonomyContext {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
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
    this.taxonomyNodes = extractDataSpaceTaxonomyNodes(json);
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
  dataSpaceTaxonomyContexts: DataSpaceTaxonomyContext[] = [];

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  get taxonomyPath(): string {
    return this.id;
  }
}

export class TaxonomyExplorerStore implements CommandRegistrar {
  applicationStore: LegendTaxonomyApplicationStore;
  depotServerClient: DepotServerClient;
  taxonomyServerClient: TaxonomyServerClient;
  graphManagerState: BasicGraphManagerState;
  pluginManager: LegendTaxonomyPluginManager;

  sideBarDisplayState = new PanelDisplayState({
    initial: 300,
    default: 300,
    snap: 150,
  });
  searchTaxonomyNodeCommandState = new NonBlockingDialogState();

  initState = ActionState.create();

  dataSpaceIndex = new Map<string, DataSpaceTaxonomyContext>();
  treeData?: TreeData<TaxonomyTreeNodeData> | undefined;

  initialTaxonomyPath?: string | undefined;
  initialDataSpaceId?: string | undefined;
  currentTaxonomyNodeViewerState?: TaxonomyNodeViewerState | undefined;

  constructor(
    applicationStore: LegendTaxonomyApplicationStore,
    taxonomyServerClient: TaxonomyServerClient,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      treeData: observable.ref,
      currentTaxonomyNodeViewerState: observable,
      setTreeData: action,
      setCurrentTaxonomyNodeViewerState: action,
      internalizeDataSpacePath: action,
      initialize: flow,
    });
    this.applicationStore = applicationStore;
    this.taxonomyServerClient = taxonomyServerClient;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = new BasicGraphManagerState(
      applicationStore.pluginManager,
      applicationStore.log,
    );
    this.pluginManager = applicationStore.pluginManager;

    // Register plugins
    this.taxonomyServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
  }

  setTreeData(val: TreeData<TaxonomyTreeNodeData>): void {
    this.treeData = val;
  }

  setCurrentTaxonomyNodeViewerState(
    val: TaxonomyNodeViewerState | undefined,
  ): void {
    this.currentTaxonomyNodeViewerState = val;
  }

  registerCommands(): void {
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_TAXONOMY_COMMAND_KEY.SEARCH_TAXONOMY,
      action: () => this.searchTaxonomyNodeCommandState.open(),
    });
  }

  deregisterCommands(): void {
    [LEGEND_TAXONOMY_COMMAND_KEY.SEARCH_TAXONOMY].forEach((key) =>
      this.applicationStore.commandCenter.deregisterCommand(key),
    );
  }

  internalizeDataSpacePath(params: LegendTaxonomyPathParams): void {
    const { taxonomyPath, gav, dataSpacePath } = params;
    if (taxonomyPath) {
      this.initialTaxonomyPath = taxonomyPath;
      if (gav && dataSpacePath) {
        this.initialDataSpaceId = `${gav}${DATA_SPACE_ID_DELIMITER}${dataSpacePath}`;
      }
      this.applicationStore.navigator.goToLocation(
        generateExploreTaxonomyTreeRoute(
          this.applicationStore.config.currentTaxonomyTreeOption.key,
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
    Array.from(this.dataSpaceIndex.values()).forEach(
      (dataSpaceTaxonomyContext) => {
        const taxonomyNodeIds = dataSpaceTaxonomyContext.taxonomyNodes;
        taxonomyNodeIds.forEach((nodeId) => {
          const taxonomyNodeData = taxonomyData.find(
            (nodeData) => nodeData.guid === nodeId,
          );
          if (taxonomyNodeData) {
            let currentPath = taxonomyNodeData.package;
            while (currentPath) {
              const treeNode = treeData.nodes.get(currentPath);
              if (treeNode) {
                addUniqueEntry(
                  treeNode.dataSpaceTaxonomyContexts,
                  dataSpaceTaxonomyContext,
                );
              }
              const idx = currentPath.lastIndexOf(TAXONOMY_NODE_PATH_DELIMITER);
              currentPath = idx === -1 ? '' : currentPath.substring(0, idx);
            }
          }
        });
      },
    );

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
            new DataSpaceTaxonomyContext(
              storedEntity.groupId,
              storedEntity.artifactId,
              storedEntity.versionId,
              storedEntity.entity.path,
              storedEntity.entity.content,
            ),
        )
        // NOTE: only care about data space tagged with taxonomy information
        .filter(
          (dataSpaceTaxonomyContext) =>
            dataSpaceTaxonomyContext.taxonomyNodes.length,
        )
        .forEach((dataSpaceTaxonomyContext) => {
          this.dataSpaceIndex.set(
            dataSpaceTaxonomyContext.id,
            dataSpaceTaxonomyContext,
          );
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
              const dataSpaceContextToOpen =
                node.dataSpaceTaxonomyContexts.find(
                  (dataSpaceTaxonomyContext) =>
                    dataSpaceTaxonomyContext.id === this.initialDataSpaceId,
                );
              const initialDataSpaceId = this.initialDataSpaceId;
              this.initialDataSpaceId = undefined;
              if (dataSpaceContextToOpen) {
                assertNonNullable(this.currentTaxonomyNodeViewerState);
                yield flowResult(
                  this.currentTaxonomyNodeViewerState.initializeDataSpaceViewer(
                    dataSpaceContextToOpen,
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
