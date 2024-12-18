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

import type { Entity } from '@finos/legend-storage';
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import {
  type GeneratorFn,
  type Writable,
  assertErrorThrown,
  LogEvent,
  addUniqueEntry,
  guaranteeNonNullable,
  isNonNullable,
  filterByType,
  ActionState,
  getNonNullableEntry,
  guaranteeType,
  assertNonEmptyString,
  assertTrue,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  observable,
  action,
  makeObservable,
  flow,
  flowResult,
  computed,
} from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type RawLambda,
  type PureModel,
  type Runtime,
  type ExecutionResultWithMetadata,
  TDSExecutionResult,
  getColumn,
  PrimitiveType,
  PRIMITIVE_TYPE,
  TDSRow,
  type Schema,
  Table,
  RelationalDatabaseConnection,
  DatabaseBuilderInput,
  DatabasePattern,
  TargetDatabase,
  Column,
  Database,
  resolvePackagePathAndElementName,
  getSchema,
  getNullableSchema,
  getNullableTable,
  isStubbed_PackageableElement,
  isValidFullPath,
  PackageableElementExplicitReference,
  getTable,
  Mapping,
  EngineRuntime,
  StoreConnections,
  IdentifiedConnection,
  getOrCreateGraphPackage,
  extractElementNameFromPath,
  extractPackagePathFromPath,
} from '@finos/legend-graph';
import { GraphEditFormModeState } from '../../../GraphEditFormModeState.js';
import { connection_setStore } from '../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { getTDSColumnDerivedProperyFromType } from '@finos/legend-query-builder';
import { getPrimitiveTypeFromRelationalType } from '../../../utils/MockDataUtils.js';

const GENERATED_PACKAGE = 'generated';
const TDS_LIMIT = 1000;

const buildTableToTDSQueryGrammar = (table: Table): string => {
  const tableName = table.name;
  const schemaName = table.schema.name;
  const db = table.schema._OWNER.path;
  return `|${db}->tableReference(
    '${schemaName}',
    '${tableName}'
  )->tableToTDS()->take(${TDS_LIMIT})`;
};

const buildTableToTDSQueryNonNumericWithColumnGrammar = (
  column: Column,
): string => {
  const table = guaranteeType(column.owner, Table);
  const tableName = table.name;
  const colName = column.name;
  const schemaName = table.schema.name;
  const db = table.schema._OWNER.path;
  const PREVIEW_COLUMN_NAME = 'Count Value';
  const columnGetter = getTDSColumnDerivedProperyFromType(
    getPrimitiveTypeFromRelationalType(column.type) ?? PrimitiveType.STRING,
  );
  return `|${db}->tableReference(
    '${schemaName}',
    '${tableName}'
  )->tableToTDS()->restrict(
    ['${colName}']
  )->groupBy(
    ['${colName}'],
    '${PREVIEW_COLUMN_NAME}'->agg(
      row|$row.${columnGetter}('${colName}'),
      y|$y->count()
    )
  )->sort(
    [
      desc('${colName}'),
      asc('${PREVIEW_COLUMN_NAME}')
    ]
  )->take(${TDS_LIMIT})`;
};

const buildTableToTDSQueryNumericWithColumnGrammar = (
  column: Column,
): string => {
  const table = guaranteeType(column.owner, Table);
  const tableName = table.name;
  const colName = column.name;
  const schemaName = table.schema.name;
  const db = table.schema._OWNER.path;
  const columnGetter = getTDSColumnDerivedProperyFromType(
    getPrimitiveTypeFromRelationalType(column.type) ?? PrimitiveType.STRING,
  );
  return `|${db}->tableReference(
    '${schemaName}',
    '${tableName}'
  )->tableToTDS()->restrict(
    ['${colName}']
  )->groupBy(
    [],
    [
      'Count'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->count()
    ),
      'Distinct Count'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->distinct()->count()
    ),
      'Sum'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->sum()
    ),
      'Min'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->min()
    ),
      'Max'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->max()
    ),
      'Average'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->average()
    ),
      'Std Dev (Population)'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->stdDevPopulation()
    ),
      'Std Dev (Sample)'->agg(
      row|$row.${columnGetter}('${colName}'),
      x|$x->stdDevSample()
    )
    ]
  )`;
};

const buildTableToTDSQueryColumnQuery = (column: Column): [string, boolean] => {
  const type =
    getPrimitiveTypeFromRelationalType(column.type) ?? PrimitiveType.STRING;
  const numerics = [
    PRIMITIVE_TYPE.NUMBER,
    PRIMITIVE_TYPE.INTEGER,
    PRIMITIVE_TYPE.DECIMAL,
    PRIMITIVE_TYPE.FLOAT,
  ];
  if (numerics.includes(type.path as PRIMITIVE_TYPE)) {
    return [buildTableToTDSQueryNumericWithColumnGrammar(column), true];
  }

  return [buildTableToTDSQueryNonNumericWithColumnGrammar(column), false];
};

// 1. mapping
// 2. connection
// 3. runtime

const buildTDSModel = (
  graph: PureModel,
  connection: RelationalDatabaseConnection,
  db: Database,
): {
  mapping: Mapping;
  runtime: Runtime;
} => {
  // mapping
  const mappingName = 'EmptyMapping';
  const _mapping = new Mapping(mappingName);
  graph.addElement(_mapping, GENERATED_PACKAGE);
  const engineRuntime = new EngineRuntime();
  engineRuntime.mappings = [
    PackageableElementExplicitReference.create(_mapping),
  ];
  const _storeConnection = new StoreConnections(
    PackageableElementExplicitReference.create(db),
  );
  // copy over new connection
  const newconnection = new RelationalDatabaseConnection(
    PackageableElementExplicitReference.create(db),
    connection.type,
    connection.datasourceSpecification,
    connection.authenticationStrategy,
  );
  newconnection.localMode = connection.localMode;
  newconnection.timeZone = connection.timeZone;
  _storeConnection.storeConnections = [
    new IdentifiedConnection('connection1', newconnection),
  ];
  engineRuntime.connections = [_storeConnection];
  return {
    runtime: engineRuntime,
    mapping: _mapping,
  };
};

export abstract class DatabaseSchemaExplorerTreeNodeData
  implements TreeNodeData
{
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  parentId?: string | undefined;
  childrenIds?: string[] | undefined;
  isChecked = false;

  constructor(id: string, label: string, parentId: string | undefined) {
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

export class DatabaseSchemaExplorerTreeSchemaNodeData extends DatabaseSchemaExplorerTreeNodeData {
  schema: Schema;

  constructor(id: string, schema: Schema) {
    super(id, schema.name, undefined);
    this.schema = schema;
  }
}

export class DatabaseSchemaExplorerTreeTableNodeData extends DatabaseSchemaExplorerTreeNodeData {
  override parentId: string;
  owner: Schema;
  table: Table;

  constructor(id: string, parentId: string, owner: Schema, table: Table) {
    super(id, table.name, parentId);
    this.parentId = parentId;
    this.owner = owner;
    this.table = table;
  }
}

export class DatabaseSchemaExplorerTreeColumnNodeData extends DatabaseSchemaExplorerTreeNodeData {
  override parentId: string;
  owner: Table;
  column: Column;

  constructor(id: string, parentId: string, owner: Table, column: Column) {
    super(id, column.name, parentId);
    this.parentId = parentId;
    this.owner = owner;
    this.column = column;
  }
}

export interface DatabaseExplorerTreeData
  extends TreeData<DatabaseSchemaExplorerTreeNodeData> {
  database: Database;
}

export const DEFAULT_DATABASE_PATH = 'store::MyDatabase';

export class DatabaseSchemaExplorerState {
  readonly editorStore: EditorStore;
  readonly connection: RelationalDatabaseConnection;
  database: Database;
  targetDatabasePath: string;
  makeTargetDatabasePathEditable?: boolean;

  isGeneratingDatabase = false;
  isUpdatingDatabase = false;
  treeData?: DatabaseExplorerTreeData | undefined;
  previewer: TDSExecutionResult | undefined;
  previewDataState = ActionState.create();

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    makeObservable(this, {
      isGeneratingDatabase: observable,
      isUpdatingDatabase: observable,
      database: observable,
      treeData: observable,
      targetDatabasePath: observable,
      previewer: observable,
      previewDataState: observable,
      makeTargetDatabasePathEditable: observable,
      isCreatingNewDatabase: computed,
      resolveDatabasePackageAndName: computed,
      setTreeData: action,
      setTargetDatabasePath: action,
      setMakeTargetDatabasePathEditable: action,
      onNodeSelect: flow,
      fetchDatabaseMetadata: flow,
      fetchSchemaMetadata: flow,
      fetchTableMetadata: flow,
      generateDatabase: flow,
      updateDatabase: flow,
      updateDatabaseAndGraph: flow,
      previewData: flow,
    });

    this.connection = connection;
    this.database = guaranteeType(connection.store.value, Database);
    this.editorStore = editorStore;
    this.targetDatabasePath = DEFAULT_DATABASE_PATH;
  }

  get isCreatingNewDatabase(): boolean {
    return isStubbed_PackageableElement(this.connection.store.value);
  }

  setMakeTargetDatabasePathEditable(val: boolean): void {
    this.makeTargetDatabasePathEditable = val;
  }

  get resolveDatabasePackageAndName(): [string, string] {
    if (!this.isCreatingNewDatabase && !this.makeTargetDatabasePathEditable) {
      return [
        guaranteeNonNullable(this.database.package).path,
        this.database.name,
      ];
    }
    assertNonEmptyString(this.targetDatabasePath, 'Must specify database path');
    assertTrue(
      isValidFullPath(this.targetDatabasePath),
      'Invalid database path',
    );
    return resolvePackagePathAndElementName(
      this.targetDatabasePath,
      this.targetDatabasePath,
    );
  }

  setTargetDatabasePath(val: string): void {
    this.targetDatabasePath = val;
  }

  setTreeData(builderTreeData?: DatabaseExplorerTreeData): void {
    this.treeData = builderTreeData;
  }

  *onNodeSelect(
    node: DatabaseSchemaExplorerTreeNodeData,
    treeData: DatabaseExplorerTreeData,
  ): GeneratorFn<void> {
    if (
      node instanceof DatabaseSchemaExplorerTreeSchemaNodeData &&
      !node.childrenIds
    ) {
      yield flowResult(this.fetchSchemaMetadata(node, treeData));
    } else if (
      node instanceof DatabaseSchemaExplorerTreeTableNodeData &&
      !node.childrenIds
    ) {
      yield flowResult(this.fetchTableMetadata(node, treeData));
    }
    node.isOpen = !node.isOpen;
    this.setTreeData({ ...treeData });
  }

  getChildNodes(
    node: DatabaseSchemaExplorerTreeNodeData,
    treeData: DatabaseExplorerTreeData,
  ): DatabaseSchemaExplorerTreeNodeData[] | undefined {
    return node.childrenIds
      ?.map((childNode) => treeData.nodes.get(childNode))
      .filter(isNonNullable);
  }

  toggleCheckedNode(
    node: DatabaseSchemaExplorerTreeNodeData,
    treeData: DatabaseExplorerTreeData,
  ): void {
    node.setChecked(!node.isChecked);
    if (node instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
      this.getChildNodes(node, treeData)?.forEach((childNode) => {
        childNode.setChecked(node.isChecked);
      });
    } else if (node instanceof DatabaseSchemaExplorerTreeTableNodeData) {
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

    // TODO: support toggling check for columns
    this.setTreeData({ ...treeData });
  }

  *fetchDatabaseMetadata(): GeneratorFn<void> {
    try {
      this.isGeneratingDatabase = true;
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, name] = this.resolveDatabasePackageAndName;
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        name,
      );
      databaseBuilderInput.config.maxTables = undefined;
      databaseBuilderInput.config.enrichTables = false;
      databaseBuilderInput.config.patterns = [
        new DatabasePattern(undefined, undefined),
      ];
      const database = (yield this.buildIntermediateDatabase(
        databaseBuilderInput,
      )) as Database;

      const rootIds: string[] = [];
      const nodes = new Map<string, DatabaseSchemaExplorerTreeNodeData>();
      database.schemas
        .toSorted((schemaA, schemaB) =>
          schemaA.name.localeCompare(schemaB.name),
        )
        .forEach((schema) => {
          const schemaId = schema.name;
          rootIds.push(schemaId);
          const schemaNode = new DatabaseSchemaExplorerTreeSchemaNodeData(
            schemaId,
            schema,
          );
          nodes.set(schemaId, schemaNode);

          schemaNode.setChecked(
            Boolean(
              this.database.schemas.find(
                (cSchema) => cSchema.name === schema.name,
              ),
            ),
          );
        });
      const treeData = { rootIds, nodes, database };
      this.setTreeData(treeData);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingDatabase = false;
    }
  }

  *fetchSchemaMetadata(
    schemaNode: DatabaseSchemaExplorerTreeSchemaNodeData,
    treeData: DatabaseExplorerTreeData,
  ): GeneratorFn<void> {
    try {
      this.isGeneratingDatabase = true;

      const schema = schemaNode.schema;
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, name] = this.resolveDatabasePackageAndName;
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        name,
      );
      databaseBuilderInput.config.maxTables = undefined;
      databaseBuilderInput.config.enrichTables = true;
      databaseBuilderInput.config.patterns = [
        new DatabasePattern(schema.name, undefined),
      ];
      const database = (yield this.buildIntermediateDatabase(
        databaseBuilderInput,
      )) as Database;

      const tables = getSchema(database, schema.name).tables;
      const childrenIds = schemaNode.childrenIds ?? [];
      schema.tables = tables;
      tables
        .toSorted((tableA, tableB) => tableA.name.localeCompare(tableB.name))
        .forEach((table) => {
          table.schema = schema;
          const tableId = `${schema.name}.${table.name}`;
          const tableNode = new DatabaseSchemaExplorerTreeTableNodeData(
            tableId,
            schemaNode.id,
            schema,
            table,
          );
          treeData.nodes.set(tableId, tableNode);
          addUniqueEntry(childrenIds, tableId);

          const matchingSchema = getNullableSchema(this.database, schema.name);
          tableNode.setChecked(
            Boolean(
              matchingSchema
                ? getNullableTable(matchingSchema, table.name)
                : undefined,
            ),
          );
        });
      schemaNode.childrenIds = childrenIds;
      this.setTreeData({ ...treeData });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingDatabase = false;
    }
  }

  *fetchTableMetadata(
    tableNode: DatabaseSchemaExplorerTreeTableNodeData,
    treeData: DatabaseExplorerTreeData,
  ): GeneratorFn<void> {
    try {
      this.isGeneratingDatabase = true;

      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, name] = this.resolveDatabasePackageAndName;
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        name,
      );
      const table = tableNode.table;
      const config = databaseBuilderInput.config;
      config.maxTables = undefined;
      config.enrichTables = true;
      config.enrichColumns = true;
      config.enrichPrimaryKeys = true;
      config.patterns = [new DatabasePattern(table.schema.name, table.name)];
      const database = (yield this.buildIntermediateDatabase(
        databaseBuilderInput,
      )) as Database;

      const enrichedTable = database.schemas
        .find((s) => table.schema.name === s.name)
        ?.tables.find((t) => t.name === table.name);
      if (enrichedTable) {
        table.primaryKey = enrichedTable.primaryKey;
        const columns = enrichedTable.columns.filter(filterByType(Column));
        tableNode.table.columns = columns;
        tableNode.childrenIds?.forEach((childId) =>
          treeData.nodes.delete(childId),
        );
        tableNode.childrenIds = undefined;
        const childrenIds: string[] = [];
        const tableId = tableNode.id;
        columns
          .toSorted((colA, colB) => colA.name.localeCompare(colB.name))
          .forEach((column) => {
            const columnId = `${tableId}.${column.name}`;
            const columnNode = new DatabaseSchemaExplorerTreeColumnNodeData(
              columnId,
              tableId,
              table,
              column,
            );
            column.owner = tableNode.table;
            treeData.nodes.set(columnId, columnNode);
            addUniqueEntry(childrenIds, columnId);
          });
        tableNode.childrenIds = childrenIds;
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingDatabase = false;
    }
  }

  private async buildIntermediateDatabase(
    databaseBuilderInput: DatabaseBuilderInput,
  ): Promise<Database> {
    const entities =
      await this.editorStore.graphManagerState.graphManager.buildDatabase(
        databaseBuilderInput,
      );
    const graph = this.editorStore.graphManagerState.createNewGraph();
    await this.editorStore.graphManagerState.graphManager.buildGraph(
      graph,
      entities,
      ActionState.create(),
    );
    return getNonNullableEntry(
      graph.ownDatabases,
      0,
      'Expected one database to be generated from input',
    );
  }

  *previewData(node: DatabaseSchemaExplorerTreeNodeData): GeneratorFn<void> {
    try {
      this.previewer = undefined;
      this.previewDataState.inProgress();
      let column: Column | undefined;
      let table: Table | undefined;
      if (node instanceof DatabaseSchemaExplorerTreeTableNodeData) {
        table = node.table;
      } else if (node instanceof DatabaseSchemaExplorerTreeColumnNodeData) {
        table = guaranteeType(node.column.owner, Table);
        column = node.column;
      } else {
        throw new UnsupportedOperationError(
          'Preview data only supported for column and table',
        );
      }
      const schemaName = table.schema.name;
      const tableName = table.name;
      const dummyPackage = 'generation';
      const dummyName = 'myDB';
      const dummyDbPath = `${dummyPackage}::${dummyName}`;
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        dummyPackage,
        dummyName,
      );
      const config = databaseBuilderInput.config;
      config.maxTables = undefined;
      config.enrichTables = true;
      config.enrichColumns = true;
      config.enrichPrimaryKeys = true;
      config.patterns.push(new DatabasePattern(table.schema.name, table.name));
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.buildDatabase(
          databaseBuilderInput,
        )) as Entity[];
      assertTrue(entities.length === 1);
      const dbEntity = guaranteeNonNullable(entities[0]);
      const emptyGraph = this.editorStore.graphManagerState.createNewGraph();
      (yield this.editorStore.graphManagerState.graphManager.buildGraph(
        emptyGraph,
        [dbEntity],
        ActionState.create(),
      )) as Entity[];
      const generatedDb = emptyGraph.getDatabase(dummyDbPath);
      const resolvedTable = getTable(
        getSchema(generatedDb, schemaName),
        tableName,
      );
      let queryGrammar: string;
      let resolveResult = false;
      if (column) {
        const resolvedColumn = getColumn(resolvedTable, column.name);
        const grammarResult = buildTableToTDSQueryColumnQuery(resolvedColumn);
        queryGrammar = grammarResult[0];
        resolveResult = grammarResult[1];
      } else {
        queryGrammar = buildTableToTDSQueryGrammar(resolvedTable);
      }
      const rawLambda =
        (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
          queryGrammar,
          'QUERY',
        )) as RawLambda;
      const { mapping, runtime } = buildTDSModel(
        emptyGraph,
        this.connection,
        generatedDb,
      );
      const execPlan = (
        (yield this.editorStore.graphManagerState.graphManager.runQuery(
          rawLambda,
          mapping,
          runtime,
          emptyGraph,
        )) as ExecutionResultWithMetadata
      ).executionResult;
      let tdsResult = guaranteeType(
        execPlan,
        TDSExecutionResult,
        'Execution from `tabletoTDS` expected to be TDS',
      );
      if (resolveResult) {
        const newResult = new TDSExecutionResult();
        newResult.result.columns = ['Aggregation', 'Value'];
        newResult.result.rows = tdsResult.result.columns.map((col, idx) => {
          const _row = new TDSRow();
          _row.values = [
            col,
            guaranteeNonNullable(
              guaranteeNonNullable(tdsResult.result.rows[0]).values[idx],
            ),
          ];
          return _row;
        });
        tdsResult = newResult;
      }
      this.previewer = tdsResult;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to preview data: ${error.message}`,
      );
    } finally {
      this.previewDataState.complete();
    }
  }

  *generateDatabase(): GeneratorFn<Entity> {
    try {
      this.isGeneratingDatabase = true;

      const treeData = guaranteeNonNullable(this.treeData);
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, name] = this.resolveDatabasePackageAndName;
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        name,
      );
      const config = databaseBuilderInput.config;
      config.maxTables = undefined;
      config.enrichTables = true;
      config.enrichColumns = true;
      config.enrichPrimaryKeys = true;
      treeData.rootIds
        .map((e) => treeData.nodes.get(e))
        .filter(isNonNullable)
        .forEach((schemaNode) => {
          if (schemaNode instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
            const tableNodes = this.getChildNodes(schemaNode, treeData);
            const allChecked = tableNodes?.every((t) => t.isChecked === true);
            if (
              allChecked ||
              (schemaNode.isChecked && !schemaNode.childrenIds)
            ) {
              config.patterns.push(
                new DatabasePattern(schemaNode.schema.name, undefined),
              );
            } else {
              tableNodes?.forEach((t) => {
                if (
                  t instanceof DatabaseSchemaExplorerTreeTableNodeData &&
                  t.isChecked
                ) {
                  config.patterns.push(
                    new DatabasePattern(schemaNode.schema.name, t.table.name),
                  );
                }
              });
            }
          }
        });
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.buildDatabase(
          databaseBuilderInput,
        )) as Entity[];
      return getNonNullableEntry(
        entities,
        0,
        'Expected a database to be generated',
      );
    } finally {
      this.isGeneratingDatabase = false;
    }
  }

  // this method just updates database
  *updateDatabase(forceRename?: boolean): GeneratorFn<Database> {
    this.isUpdatingDatabase = true;
    const graph = this.editorStore.graphManagerState.createNewGraph();
    (yield this.editorStore.graphManagerState.graphManager.buildGraph(
      graph,
      [(yield flowResult(this.generateDatabase())) as Entity],
      ActionState.create(),
    )) as Entity[];
    const database = getNonNullableEntry(
      graph.ownDatabases,
      0,
      'Expected one database to be generated from input',
    );
    // remove undefined schemas
    const schemas = Array.from(
      guaranteeNonNullable(this.treeData).nodes.values(),
    )
      .map((schemaNode) => {
        if (schemaNode instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
          return schemaNode.schema;
        }
        return undefined;
      })
      .filter(isNonNullable);

    // update this.database packge and name
    if (forceRename || this.database.name === '' || !this.database.package) {
      this.database.package = getOrCreateGraphPackage(
        graph,
        extractPackagePathFromPath(this.targetDatabasePath),
        undefined,
      );
      this.database.name = extractElementNameFromPath(this.targetDatabasePath);
    }
    // update schemas
    this.database.schemas = this.database.schemas.filter((schema) => {
      if (
        schemas.find((item) => item.name === schema.name) &&
        !database.schemas.find((s) => s.name === schema.name)
      ) {
        return false;
      }
      return true;
    });
    // update existing schemas
    database.schemas.forEach((schema) => {
      (schema as Writable<Schema>)._OWNER = this.database;
      const currentSchemaIndex = this.database.schemas.findIndex(
        (item) => item.name === schema.name,
      );
      if (currentSchemaIndex !== -1) {
        this.database.schemas[currentSchemaIndex] = schema;
      } else {
        this.database.schemas.push(schema);
      }
    });
    this.isUpdatingDatabase = false;
    return database;
  }

  // this method updates database and add database to the graph
  *updateDatabaseAndGraph(): GeneratorFn<void> {
    if (!this.treeData) {
      return;
    }
    try {
      const createDatabase =
        this.isCreatingNewDatabase &&
        !this.editorStore.graphManagerState.graph.databases.includes(
          this.database,
        );
      this.isUpdatingDatabase = true;
      const database = (yield flowResult(this.updateDatabase())) as Database;
      if (createDatabase) {
        connection_setStore(
          this.connection,
          PackageableElementExplicitReference.create(database),
        );
        const packagePath = guaranteeNonNullable(
          database.package?.name,
          'Database package is missing',
        );
        yield flowResult(
          this.editorStore.graphEditorMode.addElement(
            database,
            packagePath,
            false,
          ),
        );
      }
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Database successfully updated`,
      );
      yield flowResult(
        this.editorStore
          .getGraphEditorMode(GraphEditFormModeState)
          .globalCompile({
            message: `Can't compile graph after editing database. Redirecting you to text mode`,
          }),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isUpdatingDatabase = false;
    }
  }
}
