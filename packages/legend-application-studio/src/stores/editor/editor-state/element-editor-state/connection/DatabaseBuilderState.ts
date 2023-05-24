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
  assertNonEmptyString,
  assertTrue,
  guaranteeNonNullable,
  isNonNullable,
  filterByType,
  ActionState,
  guaranteeType,
} from '@finos/legend-shared';
import { observable, action, makeObservable, flow, flowResult } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type Schema,
  type PackageableElement,
  type Table,
  RelationalDatabaseConnection,
  DatabaseBuilderInput,
  DatabasePattern,
  TargetDatabase,
  PackageableElementExplicitReference,
  Column,
  Database,
  isValidFullPath,
  resolvePackagePathAndElementName,
  isStubbed_PackageableElement,
  getSchema,
  getNullableSchema,
  getNullableTable,
  PackageableConnection,
} from '@finos/legend-graph';
import { connection_setStore } from '../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { GraphEditFormModeState } from '../../../GraphEditFormModeState.js';

export const guaranteeRelationalDatabaseConnection = (
  val: PackageableElement | undefined,
): RelationalDatabaseConnection =>
  guaranteeType(
    guaranteeType(val, PackageableConnection).connectionValue,
    RelationalDatabaseConnection,
  );

export abstract class DatabaseBuilderTreeNodeData implements TreeNodeData {
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  parentId?: string | undefined;
  childrenIds?: string[] | undefined;
  isChecked = false;

  constructor(id: string, label: string, parentId: string | undefined) {
    this.id = id;
    this.label = label;
    this.parentId = parentId;
  }
}

export class SchemaDatabaseBuilderTreeNodeData extends DatabaseBuilderTreeNodeData {
  schema: Schema;

  constructor(id: string, parentId: string | undefined, schema: Schema) {
    super(id, schema.name, parentId);
    this.schema = schema;
  }
}

export class TableDatabaseBuilderTreeNodeData extends DatabaseBuilderTreeNodeData {
  table: Table;

  constructor(id: string, parentId: string | undefined, table: Table) {
    super(id, table.name, parentId);
    this.table = table;
  }
}

export class ColumnDatabaseBuilderTreeNodeData extends DatabaseBuilderTreeNodeData {
  column: Column;

  constructor(id: string, parentId: string | undefined, column: Column) {
    super(id, column.name, parentId);
    this.column = column;
  }
}

export interface DatabaseBuilderTreeData
  extends TreeData<DatabaseBuilderTreeNodeData> {
  database: Database;
}

export class DatabaseBuilderState {
  editorStore: EditorStore;
  connection: RelationalDatabaseConnection;
  showModal = false;
  databaseGrammarCode = '';
  isBuildingDatabase = false;
  isSavingDatabase = false;
  targetDatabasePath: string;
  treeData?: DatabaseBuilderTreeData | undefined;
  isReadOnly: boolean;

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
    isReadOnly: boolean,
  ) {
    makeObservable<
      DatabaseBuilderState,
      'buildDatabaseFromInput' | 'buildDatabaseGrammar'
    >(this, {
      showModal: observable,
      targetDatabasePath: observable,
      isBuildingDatabase: observable,
      databaseGrammarCode: observable,
      isSavingDatabase: observable,
      setTargetDatabasePath: action,
      setShowModal: action,
      setDatabaseGrammarCode: action,
      setTreeData: action,
      treeData: observable,
      onNodeSelect: flow,
      buildDatabaseGrammar: flow,
      buildDatabaseFromInput: flow,
      buildDatabaseWithTreeData: flow,
      createOrUpdateDatabase: flow,
      fetchSchemaDefinitions: flow,
      fetchSchemaMetadata: flow,
      fetchTableMetadata: flow,
    });

    this.connection = connection;
    this.editorStore = editorStore;
    this.targetDatabasePath = this.currentDatabase?.path ?? 'store::MyDatabase';
    this.isReadOnly = isReadOnly;
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setTreeData(builderTreeData?: DatabaseBuilderTreeData): void {
    this.treeData = builderTreeData;
  }

  setDatabaseGrammarCode(val: string): void {
    this.databaseGrammarCode = val;
  }

  setTargetDatabasePath(val: string): void {
    this.targetDatabasePath = val;
  }

  *onNodeSelect(
    node: DatabaseBuilderTreeNodeData,
    treeData: DatabaseBuilderTreeData,
  ): GeneratorFn<void> {
    if (
      node instanceof SchemaDatabaseBuilderTreeNodeData &&
      !node.childrenIds
    ) {
      yield flowResult(this.fetchSchemaMetadata(node, treeData));
    } else if (
      node instanceof TableDatabaseBuilderTreeNodeData &&
      !node.childrenIds
    ) {
      yield flowResult(this.fetchTableMetadata(node, treeData));
    }
    node.isOpen = !node.isOpen;
    this.setTreeData({ ...treeData });
  }

  getChildNodes(
    node: DatabaseBuilderTreeNodeData,
    treeData: DatabaseBuilderTreeData,
  ): DatabaseBuilderTreeNodeData[] | undefined {
    return node.childrenIds
      ?.map((n) => treeData.nodes.get(n))
      .filter(isNonNullable);
  }

  toggleCheckedNode(
    node: DatabaseBuilderTreeNodeData,
    treeData: DatabaseBuilderTreeData,
  ): void {
    node.isChecked = !node.isChecked;
    if (node instanceof SchemaDatabaseBuilderTreeNodeData) {
      this.getChildNodes(node, treeData)?.forEach((n) => {
        n.isChecked = node.isChecked;
      });
    } else if (node instanceof TableDatabaseBuilderTreeNodeData) {
      if (node.parentId) {
        const parent = treeData.nodes.get(node.parentId);
        if (
          parent &&
          this.getChildNodes(parent, treeData)?.every(
            (e) => e.isChecked === node.isChecked,
          )
        ) {
          parent.isChecked = node.isChecked;
        }
      }
    }
    // TODO: handle ColumnDatabaseBuilderTreeNodeData
    this.setTreeData({ ...treeData });
  }

  private buildNonEnrichedDbBuilderInput(
    schema?: string,
  ): DatabaseBuilderInput {
    const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
    const [packagePath, databaseName] = this.getDatabasePackageAndName();
    databaseBuilderInput.targetDatabase = new TargetDatabase(
      packagePath,
      databaseName,
    );
    databaseBuilderInput.config.maxTables = undefined;
    databaseBuilderInput.config.enrichTables = Boolean(schema);
    databaseBuilderInput.config.patterns = [
      new DatabasePattern(schema, undefined),
    ];
    return databaseBuilderInput;
  }

  *fetchSchemaDefinitions(): GeneratorFn<void> {
    try {
      this.isBuildingDatabase = true;
      const databaseBuilderInput = this.buildNonEnrichedDbBuilderInput();
      const database = (yield flowResult(
        this.buildDatabaseFromInput(databaseBuilderInput),
      )) as Database;
      const rootIds: string[] = [];
      const nodes = new Map<string, DatabaseBuilderTreeNodeData>();
      database.schemas
        .slice()
        .sort((schemaA, schemaB) => schemaA.name.localeCompare(schemaB.name))
        .forEach((dbSchema) => {
          const schemaId = dbSchema.name;
          rootIds.push(schemaId);
          const schemaNode = new SchemaDatabaseBuilderTreeNodeData(
            schemaId,
            undefined,
            dbSchema,
          );
          schemaNode.isChecked = Boolean(
            this.currentDatabase?.schemas.find(
              (cSchema) => cSchema.name === dbSchema.name,
            ),
          );
          nodes.set(schemaId, schemaNode);
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
      this.isBuildingDatabase = false;
    }
  }

  *fetchSchemaMetadata(
    schemaNode: SchemaDatabaseBuilderTreeNodeData,
    treeData: DatabaseBuilderTreeData,
  ): GeneratorFn<void> {
    try {
      this.isBuildingDatabase = true;
      const schema = schemaNode.schema;
      const databaseBuilderInput = this.buildNonEnrichedDbBuilderInput(
        schema.name,
      );
      const database = (yield flowResult(
        this.buildDatabaseFromInput(databaseBuilderInput),
      )) as Database;
      const tables = getSchema(database, schema.name).tables;
      const childrenIds = schemaNode.childrenIds ?? [];
      schema.tables = tables;
      tables
        .slice()
        .sort((tableA, tableB) => tableA.name.localeCompare(tableB.name))
        .forEach((table) => {
          table.schema = schema;
          const tableId = `${schema.name}.${table.name}`;
          const tableNode = new TableDatabaseBuilderTreeNodeData(
            tableId,
            schemaNode.id,
            table,
          );

          if (this.currentDatabase) {
            const matchingSchema = getNullableSchema(
              this.currentDatabase,
              schema.name,
            );
            tableNode.isChecked = Boolean(
              matchingSchema
                ? getNullableTable(matchingSchema, table.name)
                : undefined,
            );
          } else {
            tableNode.isChecked = false;
          }

          treeData.nodes.set(tableId, tableNode);
          addUniqueEntry(childrenIds, tableId);
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
      this.isBuildingDatabase = false;
    }
  }

  *fetchTableMetadata(
    tableNode: TableDatabaseBuilderTreeNodeData,
    treeData: DatabaseBuilderTreeData,
  ): GeneratorFn<void> {
    try {
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, databaseName] = resolvePackagePathAndElementName(
        this.targetDatabasePath,
      );
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        databaseName,
      );
      const config = databaseBuilderInput.config;
      config.maxTables = undefined;
      config.enrichTables = true;
      config.enrichColumns = true;
      config.enrichPrimaryKeys = true;
      const table = tableNode.table;
      config.patterns = [new DatabasePattern(table.schema.name, table.name)];
      const database = (yield flowResult(
        this.buildDatabaseFromInput(databaseBuilderInput),
      )) as Database;
      const enrichedTable = database.schemas
        .find((s) => table.schema.name === s.name)
        ?.tables.find((t) => t.name === table.name);
      if (enrichedTable) {
        this.addColumnsNodeToTableNode(tableNode, enrichedTable, treeData);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isBuildingDatabase = false;
    }
  }

  private addColumnsNodeToTableNode(
    tableNode: TableDatabaseBuilderTreeNodeData,
    enrichedTable: Table,
    treeData: DatabaseBuilderTreeData,
  ): void {
    const columns = enrichedTable.columns.filter(filterByType(Column));
    tableNode.table.columns = columns;
    this.removeChildren(tableNode, treeData);
    const childrenIds: string[] = [];
    const tableId = tableNode.id;
    columns
      .slice()
      .sort((colA, colB) => colA.name.localeCompare(colB.name))
      .forEach((c) => {
        const columnId = `${tableId}.${c.name}`;
        const columnNode = new ColumnDatabaseBuilderTreeNodeData(
          columnId,
          tableId,
          c,
        );
        c.owner = tableNode.table;
        treeData.nodes.set(columnId, columnNode);
        addUniqueEntry(childrenIds, columnId);
      });
    tableNode.childrenIds = childrenIds;
  }

  private removeChildren(
    node: DatabaseBuilderTreeNodeData,
    treeData: DatabaseBuilderTreeData,
  ): void {
    const currentChildren = node.childrenIds;
    if (currentChildren) {
      currentChildren.forEach((c) => treeData.nodes.delete(c));
      node.childrenIds = undefined;
    }
  }

  private getDatabasePackageAndName(): [string, string] {
    if (this.currentDatabase) {
      return [
        guaranteeNonNullable(this.currentDatabase.package).path,
        this.currentDatabase.name,
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

  *buildDatabaseWithTreeData(): GeneratorFn<void> {
    try {
      if (this.treeData) {
        const dbTreeData = this.treeData;
        this.isBuildingDatabase = true;
        const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
        const [packagePath, databaseName] = this.getDatabasePackageAndName();
        databaseBuilderInput.targetDatabase = new TargetDatabase(
          packagePath,
          databaseName,
        );
        const config = databaseBuilderInput.config;
        config.maxTables = undefined;
        config.enrichTables = true;
        config.enrichColumns = true;
        config.enrichPrimaryKeys = true;
        dbTreeData.rootIds
          .map((e) => dbTreeData.nodes.get(e))
          .filter(isNonNullable)
          .forEach((schemaNode) => {
            if (schemaNode instanceof SchemaDatabaseBuilderTreeNodeData) {
              const tableNodes = this.getChildNodes(schemaNode, dbTreeData);
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
                    t instanceof TableDatabaseBuilderTreeNodeData &&
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
        const dbGrammar =
          (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
            entities,
          )) as string;
        this.setDatabaseGrammarCode(dbGrammar);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isBuildingDatabase = false;
    }
  }

  private getSchemasFromTreeNode(tree: DatabaseBuilderTreeData): Schema[] {
    return Array.from(tree.nodes.values())
      .map((e) => {
        if (e instanceof SchemaDatabaseBuilderTreeNodeData) {
          return e.schema;
        }
        return undefined;
      })
      .filter(isNonNullable);
  }

  private *buildDatabaseGrammar(grammar: string): GeneratorFn<Database> {
    const entities =
      (yield this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
        grammar,
      )) as Entity[];
    const dbGraph = this.editorStore.graphManagerState.createNewGraph();
    (yield this.editorStore.graphManagerState.graphManager.buildGraph(
      dbGraph,
      entities,
      ActionState.create(),
    )) as Entity[];
    assertTrue(
      dbGraph.ownDatabases.length === 1,
      'Expected one database to be generated from grammar',
    );
    return dbGraph.ownDatabases[0] as Database;
  }

  private *buildDatabaseFromInput(
    databaseBuilderInput: DatabaseBuilderInput,
  ): GeneratorFn<Database> {
    const entities =
      (yield this.editorStore.graphManagerState.graphManager.buildDatabase(
        databaseBuilderInput,
      )) as Entity[];
    const dbGraph = this.editorStore.graphManagerState.createNewGraph();
    (yield this.editorStore.graphManagerState.graphManager.buildGraph(
      dbGraph,
      entities,
      ActionState.create(),
    )) as Entity[];
    assertTrue(
      dbGraph.ownDatabases.length === 1,
      'Expected one database to be generated from input',
    );
    return dbGraph.ownDatabases[0] as Database;
  }

  *createOrUpdateDatabase(): GeneratorFn<void> {
    try {
      this.isSavingDatabase = true;
      assertNonEmptyString(
        this.databaseGrammarCode,
        'Database grammar is empty',
      );
      const database = (yield flowResult(
        this.buildDatabaseGrammar(this.databaseGrammarCode),
      )) as Database;
      let currentDatabase: Database;
      const isUpdating = Boolean(this.currentDatabase);
      if (!this.currentDatabase) {
        const newDatabase = new Database(database.name);
        connection_setStore(
          this.connection,
          PackageableElementExplicitReference.create(newDatabase),
        );
        const packagePath = guaranteeNonNullable(
          database.package?.name,
          'Database package is missing',
        );
        yield flowResult(
          this.editorStore.graphEditorMode.addElement(
            newDatabase,
            packagePath,
            false,
          ),
        );
        currentDatabase = newDatabase;
      } else {
        currentDatabase = this.currentDatabase;
      }
      if (this.treeData) {
        const schemas = this.getSchemasFromTreeNode(this.treeData);
        this.updateDatabase(currentDatabase, database, schemas);
        this.editorStore.applicationStore.notificationService.notifySuccess(
          `Database successfully '${isUpdating ? 'updated' : 'created'}.`,
        );
        this.fetchSchemaDefinitions();
        if (isUpdating) {
          yield flowResult(
            this.editorStore
              .getGraphEditorMode(GraphEditFormModeState)
              .globalCompile({
                message: `Can't compile graph after editing database. Redirecting you to text mode`,
              }),
          );
        }
      }
      this.setShowModal(false);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isSavingDatabase = false;
    }
  }

  updateDatabase(
    current: Database,
    generatedDb: Database,
    allSchemas: Schema[],
  ): void {
    // remove shemas not defined
    current.schemas = current.schemas.filter((schema) => {
      if (
        allSchemas.find((c) => c.name === schema.name) &&
        !generatedDb.schemas.find((c) => c.name === schema.name)
      ) {
        return false;
      }
      return true;
    });
    // update existing schemas
    generatedDb.schemas.forEach((schema) => {
      (schema as Writable<Schema>)._OWNER = current;
      const currentSchemaIndex = current.schemas.findIndex(
        (c) => c.name === schema.name,
      );
      if (currentSchemaIndex !== -1) {
        current.schemas[currentSchemaIndex] = schema;
      } else {
        current.schemas.push(schema);
      }
    });
  }

  get currentDatabase(): Database | undefined {
    const store = this.connection.store.value;
    if (store instanceof Database && !isStubbed_PackageableElement(store)) {
      return store;
    }
    return undefined;
  }
}
