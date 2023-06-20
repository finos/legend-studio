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
  getNonNullableEntry,
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
  type Schema,
  type Table,
  type RelationalDatabaseConnection,
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
} from '@finos/legend-graph';
import { connection_setStore } from '../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { GraphEditFormModeState } from '../../../GraphEditFormModeState.js';

export abstract class DatabaseBuilderTreeNodeData implements TreeNodeData {
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

export class SchemaDatabaseBuilderTreeNodeData extends DatabaseBuilderTreeNodeData {
  schema: Schema;

  constructor(id: string, schema: Schema) {
    super(id, schema.name, undefined);
    this.schema = schema;
  }
}

export class TableDatabaseBuilderTreeNodeData extends DatabaseBuilderTreeNodeData {
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

export class ColumnDatabaseBuilderTreeNodeData extends DatabaseBuilderTreeNodeData {
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

export interface DatabaseBuilderTreeData
  extends TreeData<DatabaseBuilderTreeNodeData> {
  database: Database;
}

const DEFAULT_DATABASE_PATH = 'store::MyDatabase';

export class DatabaseBuilderState {
  readonly editorStore: EditorStore;
  readonly connection: RelationalDatabaseConnection;
  readonly isReadOnly: boolean;

  showModal = false;
  databaseGrammarCode = '';
  isBuildingDatabase = false;
  isSavingDatabase = false;
  targetDatabasePath: string;
  treeData?: DatabaseBuilderTreeData | undefined;

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
    isReadOnly: boolean,
  ) {
    makeObservable<DatabaseBuilderState>(this, {
      showModal: observable,
      targetDatabasePath: observable,
      isBuildingDatabase: observable,
      databaseGrammarCode: observable,
      isSavingDatabase: observable,
      currentDatabase: computed,
      setTargetDatabasePath: action,
      setShowModal: action,
      setDatabaseGrammarCode: action,
      setTreeData: action,
      treeData: observable,
      onNodeSelect: flow,
      generateDatabase: flow,
      previewDatabaseModel: flow,
      createOrUpdateDatabase: flow,
      fetchDatabaseMetadata: flow,
      fetchSchemaMetadata: flow,
      fetchTableMetadata: flow,
    });

    this.connection = connection;
    this.editorStore = editorStore;
    this.targetDatabasePath =
      this.currentDatabase?.path ?? DEFAULT_DATABASE_PATH;
    this.isReadOnly = isReadOnly;
  }

  get currentDatabase(): Database | undefined {
    const store = this.connection.store.value;
    if (store instanceof Database && !isStubbed_PackageableElement(store)) {
      return store;
    }
    return undefined;
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
      ?.map((childNode) => treeData.nodes.get(childNode))
      .filter(isNonNullable);
  }

  toggleCheckedNode(
    node: DatabaseBuilderTreeNodeData,
    treeData: DatabaseBuilderTreeData,
  ): void {
    node.setChecked(!node.isChecked);
    if (node instanceof SchemaDatabaseBuilderTreeNodeData) {
      this.getChildNodes(node, treeData)?.forEach((childNode) => {
        childNode.setChecked(node.isChecked);
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
          parent.setChecked(node.isChecked);
        }
      }
    }

    // TODO: support toggling check for columns
    this.setTreeData({ ...treeData });
  }

  *fetchDatabaseMetadata(): GeneratorFn<void> {
    try {
      this.isBuildingDatabase = true;
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, databaseName] = this.getDatabasePackageAndName();
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        databaseName,
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
      const nodes = new Map<string, DatabaseBuilderTreeNodeData>();
      database.schemas
        .slice()
        .sort((schemaA, schemaB) => schemaA.name.localeCompare(schemaB.name))
        .forEach((schema) => {
          const schemaId = schema.name;
          rootIds.push(schemaId);
          const schemaNode = new SchemaDatabaseBuilderTreeNodeData(
            schemaId,
            schema,
          );
          nodes.set(schemaId, schemaNode);

          schemaNode.setChecked(
            Boolean(
              this.currentDatabase?.schemas.find(
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
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, databaseName] = this.getDatabasePackageAndName();
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        databaseName,
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
        .slice()
        .sort((tableA, tableB) => tableA.name.localeCompare(tableB.name))
        .forEach((table) => {
          table.schema = schema;
          const tableId = `${schema.name}.${table.name}`;
          const tableNode = new TableDatabaseBuilderTreeNodeData(
            tableId,
            schemaNode.id,
            schema,
            table,
          );
          treeData.nodes.set(tableId, tableNode);
          addUniqueEntry(childrenIds, tableId);

          if (this.currentDatabase) {
            const matchingSchema = getNullableSchema(
              this.currentDatabase,
              schema.name,
            );
            tableNode.setChecked(
              Boolean(
                matchingSchema
                  ? getNullableTable(matchingSchema, table.name)
                  : undefined,
              ),
            );
          } else {
            tableNode.setChecked(false);
          }
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
      this.isBuildingDatabase = true;

      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      const [packagePath, databaseName] = resolvePackagePathAndElementName(
        this.targetDatabasePath,
      );
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        packagePath,
        databaseName,
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
          .slice()
          .sort((colA, colB) => colA.name.localeCompare(colB.name))
          .forEach((column) => {
            const columnId = `${tableId}.${column.name}`;
            const columnNode = new ColumnDatabaseBuilderTreeNodeData(
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
      this.isBuildingDatabase = false;
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

  async buildIntermediateDatabase(
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

  *generateDatabase(): GeneratorFn<Entity> {
    try {
      this.isBuildingDatabase = true;

      const treeData = guaranteeNonNullable(this.treeData);
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
      treeData.rootIds
        .map((e) => treeData.nodes.get(e))
        .filter(isNonNullable)
        .forEach((schemaNode) => {
          if (schemaNode instanceof SchemaDatabaseBuilderTreeNodeData) {
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
      return getNonNullableEntry(
        entities,
        0,
        'Expected a database to be generated',
      );
    } finally {
      this.isBuildingDatabase = false;
    }
  }

  *previewDatabaseModel(): GeneratorFn<void> {
    if (!this.treeData) {
      return;
    }

    try {
      this.setDatabaseGrammarCode(
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [(yield flowResult(this.generateDatabase())) as Entity],
        )) as string,
      );
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

  *createOrUpdateDatabase(): GeneratorFn<void> {
    if (!this.treeData) {
      return;
    }

    try {
      this.isSavingDatabase = true;

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
      const schemas = Array.from(this.treeData.nodes.values())
        .map((schemaNode) => {
          if (schemaNode instanceof SchemaDatabaseBuilderTreeNodeData) {
            return schemaNode.schema;
          }
          return undefined;
        })
        .filter(isNonNullable);
      this.updateDatabase(currentDatabase, database, schemas);
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Database successfully '${isUpdating ? 'updated' : 'created'}.`,
      );
      this.fetchDatabaseMetadata();
      if (isUpdating) {
        yield flowResult(
          this.editorStore
            .getGraphEditorMode(GraphEditFormModeState)
            .globalCompile({
              message: `Can't compile graph after editing database. Redirecting you to text mode`,
            }),
        );
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
    generatedDatabase: Database,
    allSchemas: Schema[],
  ): void {
    // remove undefined schemas
    current.schemas = current.schemas.filter((schema) => {
      if (
        allSchemas.find((item) => item.name === schema.name) &&
        !generatedDatabase.schemas.find((c) => c.name === schema.name)
      ) {
        return false;
      }
      return true;
    });

    // update existing schemas
    generatedDatabase.schemas.forEach((schema) => {
      (schema as Writable<Schema>)._OWNER = current;
      const currentSchemaIndex = current.schemas.findIndex(
        (item) => item.name === schema.name,
      );
      if (currentSchemaIndex !== -1) {
        current.schemas[currentSchemaIndex] = schema;
      } else {
        current.schemas.push(schema);
      }
    });
  }
}
