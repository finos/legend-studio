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
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import { PanelDisplayState } from '@finos/legend-art';
import type { GraphManagerState } from '@finos/legend-graph';
import type {
  DepotServerClient,
  StoredEntity,
} from '@finos/legend-server-depot';
import { generateGAVCoordinates } from '@finos/legend-server-depot';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  addUniqueEntry,
  guaranteeNonNullable,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import type { StudioConfig, StudioPluginManager } from '@finos/legend-studio';
import { makeObservable, flow, observable, action } from 'mobx';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  extractDataSpaceTaxonomyNodePaths,
} from '../../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';

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
  currentDataSpace?: RawDataSpace | undefined;

  constructor(
    enterpriseModelExplorerStore: EnterpriseModelExplorerStore,
    taxonomyNode: TaxonomyTreeNodeData,
  ) {
    makeObservable(this, {
      currentDataSpace: observable,
      setCurrentDataSpace: action,
    });
    this.enterpriseModelExplorerStore = enterpriseModelExplorerStore;
    this.taxonomyNode = taxonomyNode;
  }

  setCurrentDataSpace(val: RawDataSpace | undefined): void {
    this.currentDataSpace = val;
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

  initialDataSpaceId?: string;
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

      // NOTE: here we build the full tree, which might be expensive when we have a big
      // tree in the future, we might have to come up with a better algorithm then
      // to incrementally build the tree
      this.initializeTaxonomyTreeData();

      // navigate to the taxonomy tree node
      // params.taxonomyPath

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.initState.fail();
      this.applicationStore.notifyError(error);
    }
  }
}
