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

import type {
  TreeNodeData,
  TreeData,
  TreeNodeContainerProps,
} from '@finos/legend-art';
import { makeObservable, observable, action, flow, flowResult } from 'mobx';
import {
  type V1_AccessPoint,
  type V1_DataProductArtifact,
  type V1_IngestDataset,
  type V1_IngestDefinitionContent,
  V1_PureModelContextData,
  V1_DataProduct,
  V1_RelationType,
  V1_RelationTypeColumn,
  V1_IngestDefinition,
  V1_entitiesToPureModelContextData,
  type PureProtocolProcessorPlugin,
  V1_PackageableType,
  V1_GenericType,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  isNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';

const DATA_PRODUCT_HEADER_ID = '__data_products_header__';
const INGEST_HEADER_ID = '__ingest_definitions_header__';

export abstract class AccessorExplorerTreeNodeData implements TreeNodeData {
  isOpen?: boolean;
  id: string;
  label: string;
  parentId: string | undefined;
  childrenIds: string[] | undefined;
  isChecked = false;

  constructor(id: string, label: string, parentId?: string) {
    makeObservable(this, {
      isChecked: observable,
      setChecked: action,
    });

    this.id = id;
    this.label = label;
    this.parentId = parentId;
  }

  setChecked(val: boolean): void {
    this.isChecked = val;
  }
}

export class AccessorExplorerTreeDataProductNodeData extends AccessorExplorerTreeNodeData {
  dataProduct: V1_DataProduct;

  constructor(id: string, dataProduct: V1_DataProduct, parentId?: string) {
    super(id, dataProduct.title ?? '', parentId);
    this.dataProduct = dataProduct;
  }
}

export class AccessorExplorerTreeIngestNodeData extends AccessorExplorerTreeNodeData {
  ingestDefinition: V1_IngestDefinition;

  constructor(
    id: string,
    ingestDefinition: V1_IngestDefinition,
    parentId?: string,
  ) {
    super(id, ingestDefinition.name, parentId);
    this.ingestDefinition = ingestDefinition;
  }
}

export class AccessorExplorerTreeHeaderNodeData extends AccessorExplorerTreeNodeData {}

export class AccessorExplorerTreeAccessPointGroupNodeData extends AccessorExplorerTreeNodeData {
  override parentId: string | undefined;
  accessPointGroupId: string;
  accessPointGroupTitle: string;
  dataProductPath: string;

  constructor(
    id: string,
    parentId: string | undefined,
    accessPointGroupId: string,
    accessPointGroupTitle: string,
    dataProductPath: string,
  ) {
    super(id, accessPointGroupTitle, parentId);
    this.parentId = parentId;
    this.accessPointGroupId = accessPointGroupId;
    this.accessPointGroupTitle = accessPointGroupTitle;
    this.dataProductPath = dataProductPath;
  }
}

export class AccessorExplorerTreeAccessPointNodeData extends AccessorExplorerTreeNodeData {
  override parentId: string | undefined;
  accessPoint: V1_AccessPoint;
  dataProductPath: string;

  constructor(
    id: string,
    parentId: string | undefined,
    accessPoint: V1_AccessPoint,
    dataProductPath: string,
  ) {
    super(id, accessPoint.id, parentId);
    this.parentId = parentId;
    this.accessPoint = accessPoint;
    this.dataProductPath = dataProductPath;
  }
}

export class AccessorExplorerTreeDatasetNodeData extends AccessorExplorerTreeNodeData {
  override parentId: string | undefined;
  dataset: V1_IngestDataset;

  constructor(
    id: string,
    parentId: string | undefined,
    dataset: V1_IngestDataset,
  ) {
    super(id, dataset.name, parentId);
    this.parentId = parentId;
    this.dataset = dataset;
  }
}

export class AccessorExplorerTreeColumnNodeData extends AccessorExplorerTreeNodeData {
  override parentId: string;
  owner: V1_AccessPoint | V1_IngestDataset;
  column: V1_RelationTypeColumn;

  constructor(
    id: string,
    parentId: string,
    owner: V1_AccessPoint | V1_IngestDataset,
    column: V1_RelationTypeColumn,
  ) {
    super(id, column.name, parentId);
    this.parentId = parentId;
    this.owner = owner;
    this.column = column;
  }
}

export type AccessorExplorerTreeNodeContainerProps = TreeNodeContainerProps<
  AccessorExplorerTreeNodeData,
  {
    toggleCheckedNode: (node: AccessorExplorerTreeNodeData) => void;
    isPartiallySelected: (node: AccessorExplorerTreeNodeData) => boolean;
  }
>;

export class SQLPlaygroundAccessorExplorerState {
  isGeneratingAccessor = false;
  treeData: TreeData<AccessorExplorerTreeNodeData> | undefined;
  parsedIngestDefinitions: Map<string, V1_IngestDefinition> = new Map();
  parsedDataProducts: Map<string, V1_DataProduct> = new Map();
  fetchDataProductArtifact: (
    dataProductPath: string,
  ) => Promise<V1_DataProductArtifact | undefined>;
  artifactCache: Map<string, V1_DataProductArtifact> = new Map();
  private entities: Entity[];
  private plugins: PureProtocolProcessorPlugin[];

  constructor(
    entities: Entity[],
    plugins: PureProtocolProcessorPlugin[],
    fetchDataProductArtifact: (
      dataProductPath: string,
    ) => Promise<V1_DataProductArtifact | undefined>,
  ) {
    makeObservable(this, {
      isGeneratingAccessor: observable,
      treeData: observable,
      parsedIngestDefinitions: observable,
      parsedDataProducts: observable,
      artifactCache: observable,
      setTreeData: action,
      parsePMCD: action,
      onNodeSelect: flow,
      fetchProjectData: flow,
      fetchAccessPointGroupMetadata: flow,
      fetchDataProductMetadata: flow,
      fetchIngestMetadata: flow,
      fetchAccessPointMetadata: flow,
      fetchDatasetMetadata: flow,
    });

    this.entities = entities;
    this.plugins = plugins;
    this.fetchDataProductArtifact = fetchDataProductArtifact;
  }

  setTreeData(builderTreeData?: TreeData<AccessorExplorerTreeNodeData>): void {
    this.treeData = builderTreeData;
  }

  parsePMCD(pmcd: V1_PureModelContextData): void {
    this.parsedIngestDefinitions.clear();
    this.parsedDataProducts.clear();
    pmcd.elements.forEach((element) => {
      if (element instanceof V1_IngestDefinition) {
        this.parsedIngestDefinitions.set(element.path, element);
      } else if (element instanceof V1_DataProduct) {
        this.parsedDataProducts.set(element.path, element);
      }
    });
  }

  getIngestDefinitionEntries(): Array<[string, V1_IngestDefinition]> {
    return Array.from(this.parsedIngestDefinitions.entries());
  }

  getDataProducts(): V1_DataProduct[] {
    return Array.from(this.parsedDataProducts.values());
  }

  *fetchProjectData(): GeneratorFn<void> {
    try {
      this.isGeneratingAccessor = true;

      const pmcd = new V1_PureModelContextData();
      yield V1_entitiesToPureModelContextData(
        this.entities,
        pmcd,
        this.plugins,
      );
      this.parsePMCD(pmcd);
      const rootIds: string[] = [];
      const nodes = new Map<string, AccessorExplorerTreeNodeData>();

      const dataProducts = this.getDataProducts();
      if (dataProducts.length > 0) {
        rootIds.push(DATA_PRODUCT_HEADER_ID);
        const dataProductHeaderNode = new AccessorExplorerTreeHeaderNodeData(
          DATA_PRODUCT_HEADER_ID,
          'Data Products',
        );
        nodes.set(DATA_PRODUCT_HEADER_ID, dataProductHeaderNode);

        const dataProductChildIds: string[] = [];
        dataProducts.forEach((dataProduct) => {
          const dpId = dataProduct.path;
          const dpNode = new AccessorExplorerTreeDataProductNodeData(
            dpId,
            dataProduct,
            DATA_PRODUCT_HEADER_ID,
          );
          nodes.set(dpId, dpNode);
          dataProductChildIds.push(dpId);
        });
        dataProductHeaderNode.childrenIds = dataProductChildIds;
      }

      const ingestEntries = this.getIngestDefinitionEntries();
      if (ingestEntries.length > 0) {
        rootIds.push(INGEST_HEADER_ID);
        const ingestHeaderNode = new AccessorExplorerTreeHeaderNodeData(
          INGEST_HEADER_ID,
          'Ingest Definitions',
        );
        nodes.set(INGEST_HEADER_ID, ingestHeaderNode);

        const ingestChildIds: string[] = [];
        ingestEntries.forEach(([ingestPath, ingest]) => {
          const ingestNode = new AccessorExplorerTreeIngestNodeData(
            ingestPath,
            ingest,
            INGEST_HEADER_ID,
          );
          nodes.set(ingestPath, ingestNode);
          ingestChildIds.push(ingestPath);
        });
        ingestHeaderNode.childrenIds = ingestChildIds;
      }

      const treeData = { rootIds, nodes };
      this.setTreeData(treeData);
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    } finally {
      this.isGeneratingAccessor = false;
    }
  }

  *onNodeSelect(
    node: AccessorExplorerTreeNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    if (!node.childrenIds) {
      if (node instanceof AccessorExplorerTreeDataProductNodeData) {
        yield flowResult(this.fetchDataProductMetadata(node, treeData));
      } else if (node instanceof AccessorExplorerTreeIngestNodeData) {
        yield flowResult(this.fetchIngestMetadata(node, treeData));
      } else if (node instanceof AccessorExplorerTreeAccessPointGroupNodeData) {
        yield flowResult(this.fetchAccessPointGroupMetadata(node, treeData));
      } else if (node instanceof AccessorExplorerTreeAccessPointNodeData) {
        yield flowResult(this.fetchAccessPointMetadata(node, treeData));
      } else if (node instanceof AccessorExplorerTreeDatasetNodeData) {
        yield flowResult(this.fetchDatasetMetadata(node, treeData));
      }
    }

    node.isOpen = !node.isOpen;
    this.setTreeData({ ...treeData });
  }

  *fetchDataProductMetadata(
    node: AccessorExplorerTreeDataProductNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getDataProductChildren(n),
    );
  }

  *fetchIngestMetadata(
    node: AccessorExplorerTreeIngestNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getIngestChildren(n),
    );
  }

  *fetchAccessPointGroupMetadata(
    node: AccessorExplorerTreeAccessPointGroupNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getAccessPointGroupChildren(n),
    );
  }

  *fetchAccessPointMetadata(
    node: AccessorExplorerTreeAccessPointNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    const dataProductPath = node.dataProductPath;
    if (dataProductPath && !this.artifactCache.has(dataProductPath)) {
      try {
        this.isGeneratingAccessor = true;
        const artifact = (yield this.fetchDataProductArtifact(
          dataProductPath,
        )) as V1_DataProductArtifact | undefined;
        if (artifact) {
          this.artifactCache.set(dataProductPath, artifact);
        }
      } catch (error) {
        assertErrorThrown(error);
        throw error;
      } finally {
        this.isGeneratingAccessor = false;
      }
    }
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getAccessPointChildren(n),
    );
  }

  *fetchDatasetMetadata(
    node: AccessorExplorerTreeDatasetNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getDatasetChildren(n),
    );
  }

  private *fetchChildNodes<T extends AccessorExplorerTreeNodeData>(
    node: T,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
    getChildren: (node: T) => AccessorExplorerTreeNodeData[],
  ): GeneratorFn<void> {
    try {
      node.childrenIds?.forEach((childId) => treeData.nodes.delete(childId));
      node.childrenIds = undefined;

      const children = getChildren(node);

      const rootIds: string[] = [];
      children.forEach((child) => {
        rootIds.push(child.id);
        treeData.nodes.set(child.id, child);
      });

      node.childrenIds = rootIds;
      this.setTreeData(treeData);
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  protected getDataProductChildren(
    node: AccessorExplorerTreeDataProductNodeData,
  ): AccessorExplorerTreeNodeData[] {
    const dataProduct = this.parsedDataProducts.get(node.id);
    if (!dataProduct?.accessPointGroups) {
      return [];
    }

    return dataProduct.accessPointGroups.map((apg) => {
      const apgId = `${node.id}.${apg.id}`;
      return new AccessorExplorerTreeAccessPointGroupNodeData(
        apgId,
        node.id,
        apg.id,
        apg.title ?? apg.id,
        node.id,
      );
    });
  }

  protected getAccessPointGroupChildren(
    node: AccessorExplorerTreeAccessPointGroupNodeData,
  ): AccessorExplorerTreeNodeData[] {
    const dataProductPath = node.dataProductPath;
    if (!dataProductPath) {
      return [];
    }

    const dataProduct = this.parsedDataProducts.get(dataProductPath);
    const accessPointGroup = dataProduct?.accessPointGroups.find(
      (apg) => apg.id === node.accessPointGroupId,
    );

    if (!accessPointGroup?.accessPoints) {
      return [];
    }

    return accessPointGroup.accessPoints.map(
      (ap) =>
        new AccessorExplorerTreeAccessPointNodeData(
          ap.id,
          node.id,
          ap,
          dataProductPath,
        ),
    );
  }

  protected getIngestChildren(
    node: AccessorExplorerTreeIngestNodeData,
  ): AccessorExplorerTreeNodeData[] {
    const content = node.ingestDefinition.content as V1_IngestDefinitionContent;
    const datasets = content.datasets ?? [];
    return datasets.map((dataset) => {
      const datasetId = `${node.id}::${dataset.name}`;
      return new AccessorExplorerTreeDatasetNodeData(
        datasetId,
        node.id,
        dataset,
      );
    });
  }

  protected getAccessPointChildren(
    node: AccessorExplorerTreeAccessPointNodeData,
  ): AccessorExplorerTreeNodeData[] {
    const dataProductPath = node.dataProductPath;
    if (!dataProductPath || !this.parsedDataProducts.get(dataProductPath)) {
      return [];
    }

    const dataProductArtifact = this.artifactCache.get(dataProductPath);
    if (!dataProductArtifact) {
      return [];
    }

    const accessPointImplementation = dataProductArtifact.accessPointGroups
      .flatMap((apg) => apg.accessPointImplementations)
      .find((apImpl) => apImpl.id === node.accessPoint.id);

    if (!accessPointImplementation?.lambdaGenericType) {
      return [];
    }

    const relationType =
      accessPointImplementation.lambdaGenericType.typeArguments
        .map((typeArg) => typeArg.rawType)
        .find((rawType) => rawType instanceof V1_RelationType);

    if (!relationType?.columns) {
      return [];
    }

    return relationType.columns
      .sort((colA, colB) => colA.name.localeCompare(colB.name))
      .map((col) => {
        const colId = `${node.id}::${col.name}`;
        return new AccessorExplorerTreeColumnNodeData(
          colId,
          node.id,
          node.accessPoint,
          col,
        );
      });
  }

  protected getDatasetChildren(
    node: AccessorExplorerTreeDatasetNodeData,
  ): AccessorExplorerTreeNodeData[] {
    const columns = node.dataset.source.schema.columns;

    if (columns.length === 0) {
      return [];
    }

    return columns
      .sort((colA, colB) => colA.name.localeCompare(colB.name))
      .map((col) => {
        const colId = `${node.id}::${col.name}`;

        const packageableType = new V1_PackageableType();
        packageableType.fullPath = (
          col.genericType.rawType as V1_PackageableType
        ).fullPath;

        const genericType = new V1_GenericType();
        genericType.rawType = packageableType;

        const relationColumn = new V1_RelationTypeColumn();
        relationColumn.name = col.name;
        relationColumn.genericType = genericType;

        return new AccessorExplorerTreeColumnNodeData(
          colId,
          node.id,
          node.dataset,
          relationColumn,
        );
      });
  }

  getChildNodes(
    node: AccessorExplorerTreeNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): AccessorExplorerTreeNodeData[] | undefined {
    return node.childrenIds
      ?.map((childNode) => treeData.nodes.get(childNode))
      .filter(isNonNullable);
  }

  toggleCheckedNode(
    node: AccessorExplorerTreeNodeData,
    treeData: TreeData<AccessorExplorerTreeNodeData>,
  ): void {
    node.setChecked(!node.isChecked);
    if (node instanceof AccessorExplorerTreeDataProductNodeData) {
      this.getChildNodes(node, treeData)?.forEach((childNode) => {
        childNode.setChecked(node.isChecked);
      });
    } else if (
      node instanceof AccessorExplorerTreeAccessPointNodeData ||
      node instanceof AccessorExplorerTreeColumnNodeData
    ) {
      if (node.parentId) {
        const parent = treeData.nodes.get(node.parentId);
        if (
          parent &&
          this.getChildNodes(parent, treeData)?.every(
            (e) => e.isChecked === node.isChecked,
          )
        ) {
          parent.setChecked(node.isChecked);
        }
      }
    }

    this.setTreeData({ ...treeData });
  }
}
