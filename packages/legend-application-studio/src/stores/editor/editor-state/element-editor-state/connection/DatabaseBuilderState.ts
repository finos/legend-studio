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
} from '@finos/legend-shared';
import { observable, action, makeObservable, flow, flowResult } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type Schema,
  type Table,
  type RelationalDatabaseConnection,
  DatabaseBuilderInput,
  DatabasePattern,
  TargetDatabase,
  Column,
  Database,
  resolvePackagePathAndElementName,
  getSchema,
  getNullableSchema,
  getNullableTable,
} from '@finos/legend-graph';
import { GraphEditFormModeState } from '../../../GraphEditFormModeState.js';

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

export class DatabaseSchemaExplorerState {
  readonly editorStore: EditorStore;
  readonly connection: RelationalDatabaseConnection;
  readonly database: Database;

  isGeneratingDatabase = false;
  isUpdatingDatabase = false;
  treeData?: DatabaseExplorerTreeData | undefined;

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    makeObservable(this, {
      isGeneratingDatabase: observable,
      isUpdatingDatabase: observable,
      treeData: observable,
      setTreeData: action,
      onNodeSelect: flow,
      fetchDatabaseMetadata: flow,
      fetchSchemaMetadata: flow,
      fetchTableMetadata: flow,
      generateDatabase: flow,
      updateDatabase: flow,
    });

    this.connection = connection;
    this.database = guaranteeType(connection.store.value, Database);
    this.editorStore = editorStore;
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
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        guaranteeNonNullable(this.database.package).path,
        this.database.name,
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
        .slice()
        .sort((schemaA, schemaB) => schemaA.name.localeCompare(schemaB.name))
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
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        guaranteeNonNullable(this.database.package).path,
        this.database.name,
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
      const [packagePath, name] = resolvePackagePathAndElementName(
        this.database.path,
      );
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
          .slice()
          .sort((colA, colB) => colA.name.localeCompare(colB.name))
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

  *generateDatabase(): GeneratorFn<Entity> {
    try {
      this.isGeneratingDatabase = true;

      const treeData = guaranteeNonNullable(this.treeData);
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        guaranteeNonNullable(this.database.package).path,
        this.database.name,
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

  *updateDatabase(): GeneratorFn<void> {
    if (!this.treeData) {
      return;
    }

    try {
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
      const schemas = Array.from(this.treeData.nodes.values())
        .map((schemaNode) => {
          if (schemaNode instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
            return schemaNode.schema;
          }
          return undefined;
        })
        .filter(isNonNullable);
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
