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
  type V1_PureModelContextData,
  V1_DataProduct,
  V1_GenericType,
  V1_PackageableType,
  V1_RelationType,
  V1_RelationTypeColumn,
  V1_IngestDefinition,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  isNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';

const DATA_PRODUCT_HEADER_ID = '__data_products_header__';
const INGEST_HEADER_ID = '__ingest_definitions_header__';

export abstract class DataProductExplorerTreeNodeData implements TreeNodeData {
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

export class DataProductExplorerTreeDataProductNodeData extends DataProductExplorerTreeNodeData {
  dataProduct: V1_DataProduct;

  constructor(id: string, dataProduct: V1_DataProduct, parentId?: string) {
    super(id, dataProduct.title ?? '', parentId);
    this.dataProduct = dataProduct;
  }
}

export class DataProductExplorerTreeIngestNodeData extends DataProductExplorerTreeNodeData {
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

export class DataProductExplorerTreeHeaderNodeData extends DataProductExplorerTreeNodeData {}

export class DataProductExplorerTreeAccessPointGroupNodeData extends DataProductExplorerTreeNodeData {
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

export class DataProductExplorerTreeAccessPointNodeData extends DataProductExplorerTreeNodeData {
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

export class DataProductExplorerTreeDatasetNodeData extends DataProductExplorerTreeNodeData {
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

export class DataProductExplorerTreeColumnNodeData extends DataProductExplorerTreeNodeData {
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

export type DataProductExplorerTreeNodeContainerProps = TreeNodeContainerProps<
  DataProductExplorerTreeNodeData,
  {
    toggleCheckedNode: (node: DataProductExplorerTreeNodeData) => void;
    isPartiallySelected: (node: DataProductExplorerTreeNodeData) => boolean;
  }
>;

export class SQLPlaygroundDataProductExplorerState {
  isGeneratingDataProduct = false;
  isUpdatingDatabase = false;
  treeData: TreeData<DataProductExplorerTreeNodeData> | undefined;
  pmcd: V1_PureModelContextData;
  parsedIngestDefinitions: Map<string, V1_IngestDefinition> = new Map();
  parsedDataProducts: Map<string, V1_DataProduct> = new Map();
  dataProductArtifact: V1_DataProductArtifact | undefined;

  constructor(
    pmcd: V1_PureModelContextData,
    dataProductArtifact: V1_DataProductArtifact,
  ) {
    makeObservable(this, {
      isGeneratingDataProduct: observable,
      isUpdatingDatabase: observable,
      treeData: observable,
      pmcd: observable,
      parsedIngestDefinitions: observable,
      parsedDataProducts: observable,
      dataProductArtifact: observable,
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

    this.pmcd = pmcd;
    this.dataProductArtifact = dataProductArtifact;

    if (pmcd.elements.length > 0) {
      this.parsePMCD(pmcd);
    }
  }

  setTreeData(
    builderTreeData?: TreeData<DataProductExplorerTreeNodeData>,
  ): void {
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

  getDatasetsForIngest(ingestPath: string): V1_IngestDataset[] {
    const ingest = this.parsedIngestDefinitions.get(ingestPath);
    if (!ingest) {
      return [];
    }
    const content = ingest.content as {
      datasets?: V1_IngestDataset[];
    };
    return content.datasets ?? [];
  }

  getAccessPointsForDataProduct(dataProductPath: string): V1_AccessPoint[] {
    const dataProduct = this.parsedDataProducts.get(dataProductPath);
    if (!dataProduct?.accessPointGroups) {
      return [];
    }
    return dataProduct.accessPointGroups.flatMap((group) => group.accessPoints);
  }

  getColumnsForDataset(
    ingestPath: string,
    datasetName: string,
  ): V1_RelationTypeColumn[] {
    const datasets = this.getDatasetsForIngest(ingestPath);
    const dataset = datasets.find((ds) => ds.name === datasetName);
    return dataset?.source.schema.columns ?? [];
  }

  *fetchProjectData(): GeneratorFn<void> {
    try {
      this.isGeneratingDataProduct = true;

      const rootIds: string[] = [];
      const nodes = new Map<string, DataProductExplorerTreeNodeData>();

      const artifactDataProductPath =
        this.dataProductArtifact?.dataProduct.path;
      if (artifactDataProductPath) {
        const matchingDataProduct = this.parsedDataProducts.get(
          artifactDataProductPath,
        );
        if (matchingDataProduct) {
          rootIds.push(DATA_PRODUCT_HEADER_ID);
          const dataProductHeaderNode =
            new DataProductExplorerTreeHeaderNodeData(
              DATA_PRODUCT_HEADER_ID,
              'Data Products',
            );
          nodes.set(DATA_PRODUCT_HEADER_ID, dataProductHeaderNode);

          const dpId = artifactDataProductPath;
          const dpNode = new DataProductExplorerTreeDataProductNodeData(
            dpId,
            matchingDataProduct,
            DATA_PRODUCT_HEADER_ID,
          );
          nodes.set(dpId, dpNode);
          dataProductHeaderNode.childrenIds = [dpId];
        }
      }

      const ingestEntries = this.getIngestDefinitionEntries();
      if (ingestEntries.length > 0) {
        rootIds.push(INGEST_HEADER_ID);
        const ingestHeaderNode = new DataProductExplorerTreeHeaderNodeData(
          INGEST_HEADER_ID,
          'Ingest Definitions',
        );
        nodes.set(INGEST_HEADER_ID, ingestHeaderNode);

        const ingestChildIds: string[] = [];
        ingestEntries.forEach(([ingestPath, ingest]) => {
          const ingestNode = new DataProductExplorerTreeIngestNodeData(
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
    } finally {
      this.isGeneratingDataProduct = false;
    }
  }

  *onNodeSelect(
    node: DataProductExplorerTreeNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    if (!node.childrenIds) {
      if (node instanceof DataProductExplorerTreeDataProductNodeData) {
        yield flowResult(this.fetchDataProductMetadata(node, treeData));
      } else if (node instanceof DataProductExplorerTreeIngestNodeData) {
        yield flowResult(this.fetchIngestMetadata(node, treeData));
      } else if (
        node instanceof DataProductExplorerTreeAccessPointGroupNodeData
      ) {
        yield flowResult(this.fetchAccessPointGroupMetadata(node, treeData));
      } else if (node instanceof DataProductExplorerTreeAccessPointNodeData) {
        yield flowResult(this.fetchAccessPointMetadata(node, treeData));
      } else if (node instanceof DataProductExplorerTreeDatasetNodeData) {
        yield flowResult(this.fetchDatasetMetadata(node, treeData));
      }
    }

    node.isOpen = !node.isOpen;
    this.setTreeData({ ...treeData });
  }

  *fetchDataProductMetadata(
    node: DataProductExplorerTreeDataProductNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getDataProductChildren(n),
    );
  }

  *fetchIngestMetadata(
    node: DataProductExplorerTreeIngestNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getIngestChildren(n),
    );
  }

  *fetchAccessPointGroupMetadata(
    node: DataProductExplorerTreeAccessPointGroupNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getAccessPointGroupChildren(n),
    );
  }

  *fetchAccessPointMetadata(
    node: DataProductExplorerTreeAccessPointNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getAccessPointChildren(n),
    );
  }

  *fetchDatasetMetadata(
    node: DataProductExplorerTreeDatasetNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    yield* this.fetchChildNodes(node, treeData, (n) =>
      this.getDatasetChildren(n),
    );
  }

  private *fetchChildNodes<T extends DataProductExplorerTreeNodeData>(
    node: T,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
    getChildren: (node: T) => DataProductExplorerTreeNodeData[],
  ): GeneratorFn<void> {
    try {
      this.isGeneratingDataProduct = true;

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
    } finally {
      this.isGeneratingDataProduct = false;
    }
  }

  protected getDataProductChildren(
    node: DataProductExplorerTreeDataProductNodeData,
  ): DataProductExplorerTreeNodeData[] {
    const dataProduct = this.parsedDataProducts.get(node.id);
    if (!dataProduct?.accessPointGroups) {
      return [];
    }

    return dataProduct.accessPointGroups.map((apg) => {
      const apgId = `${node.id}.${apg.id}`;
      return new DataProductExplorerTreeAccessPointGroupNodeData(
        apgId,
        node.id,
        apg.id,
        apg.title ?? apg.id,
        node.id,
      );
    });
  }

  protected getAccessPointGroupChildren(
    node: DataProductExplorerTreeAccessPointGroupNodeData,
  ): DataProductExplorerTreeNodeData[] {
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
        new DataProductExplorerTreeAccessPointNodeData(
          ap.id,
          node.id,
          ap,
          dataProductPath,
        ),
    );
  }

  protected getIngestChildren(
    node: DataProductExplorerTreeIngestNodeData,
  ): DataProductExplorerTreeNodeData[] {
    const content = node.ingestDefinition.content as {
      datasets?: V1_IngestDataset[];
    };
    const datasets = content.datasets ?? [];
    return datasets.map((dataset) => {
      const datasetId = `${node.id}::${dataset.name}`;
      return new DataProductExplorerTreeDatasetNodeData(
        datasetId,
        node.id,
        dataset,
      );
    });
  }

  protected getAccessPointChildren(
    node: DataProductExplorerTreeAccessPointNodeData,
  ): DataProductExplorerTreeNodeData[] {
    if (!this.dataProductArtifact) {
      return [];
    }

    const dataProductPath = node.dataProductPath;
    if (!dataProductPath || !this.parsedDataProducts.get(dataProductPath)) {
      return [];
    }

    const accessPointImplementation = this.dataProductArtifact.accessPointGroups
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
        return new DataProductExplorerTreeColumnNodeData(
          colId,
          node.id,
          node.accessPoint,
          col,
        );
      });
  }

  protected getDatasetChildren(
    node: DataProductExplorerTreeDatasetNodeData,
  ): DataProductExplorerTreeNodeData[] {
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

        return new DataProductExplorerTreeColumnNodeData(
          colId,
          node.id,
          node.dataset,
          relationColumn,
        );
      });
  }

  getChildNodes(
    node: DataProductExplorerTreeNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): DataProductExplorerTreeNodeData[] | undefined {
    return node.childrenIds
      ?.map((childNode) => treeData.nodes.get(childNode))
      .filter(isNonNullable);
  }

  toggleCheckedNode(
    node: DataProductExplorerTreeNodeData,
    treeData: TreeData<DataProductExplorerTreeNodeData>,
  ): void {
    node.setChecked(!node.isChecked);
    if (node instanceof DataProductExplorerTreeDataProductNodeData) {
      this.getChildNodes(node, treeData)?.forEach((childNode) => {
        childNode.setChecked(node.isChecked);
      });
    } else if (
      node instanceof DataProductExplorerTreeAccessPointNodeData ||
      node instanceof DataProductExplorerTreeColumnNodeData
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
