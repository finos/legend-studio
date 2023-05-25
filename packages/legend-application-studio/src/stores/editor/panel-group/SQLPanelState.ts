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

import type { TreeData, TreeNodeData } from '@finos/legend-art';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  addUniqueEntry,
  isNonNullable,
  filterByType,
  ActionState,
  guaranteeType,
  getNonNullableEntry,
} from '@finos/legend-shared';
import { observable, makeObservable, flow, flowResult } from 'mobx';
import {
  type Schema,
  type PackageableElement,
  type Table,
  type Database,
  RelationalDatabaseConnection,
  DatabaseBuilderInput,
  DatabasePattern,
  TargetDatabase,
  Column,
  getSchema,
  PackageableConnection,
} from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';

export const guaranteeRelationalDatabaseConnection = (
  val: PackageableElement | undefined,
): RelationalDatabaseConnection =>
  guaranteeType(
    guaranteeType(val, PackageableConnection).connectionValue,
    RelationalDatabaseConnection,
  );

export abstract class DatabaseSchemaExplorerTreeNodeData
  implements TreeNodeData
{
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  parentId?: string | undefined;
  childrenIds?: string[] | undefined;

  constructor(id: string, label: string, parentId: string | undefined) {
    this.id = id;
    this.label = label;
    this.parentId = parentId;
  }
}

export class DatabaseSchemaExplorerTreeSchemaNodeData extends DatabaseSchemaExplorerTreeNodeData {
  schema: Schema;

  constructor(id: string, parentId: string | undefined, schema: Schema) {
    super(id, schema.name, parentId);
    this.schema = schema;
  }
}

export class DatabaseSchemaExplorerTreeTableNodeData extends DatabaseSchemaExplorerTreeNodeData {
  table: Table;

  constructor(id: string, parentId: string | undefined, table: Table) {
    super(id, table.name, parentId);
    this.table = table;
  }
}

export class DatabaseSchemaExplorerTreeColumnNodeData extends DatabaseSchemaExplorerTreeNodeData {
  column: Column;

  constructor(id: string, parentId: string | undefined, column: Column) {
    super(id, column.name, parentId);
    this.column = column;
  }
}

export interface DatabaseBuilderTreeData
  extends TreeData<DatabaseSchemaExplorerTreeNodeData> {
  database: Database;
}

const DUMMY_DATABASE_PACKAGE = 'dummy';
const DUMMY_DATABASE_NAME = 'DummyDB';

export class SQLPanelState {
  readonly editorStore: EditorStore;

  isFetchingSchema = false;
  connection?: RelationalDatabaseConnection | undefined;
  treeData?: DatabaseBuilderTreeData | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      connection: observable,
      isFetchingSchema: observable,
      treeData: observable,
      onNodeSelect: flow,
      fetchDatabaseMetadata: flow,
      fetchSchemaMetadata: flow,
      fetchTableMetadata: flow,
    });

    this.editorStore = editorStore;
  }

  setTreeData(builderTreeData?: DatabaseBuilderTreeData): void {
    this.treeData = builderTreeData;
  }

  *onNodeSelect(
    node: DatabaseSchemaExplorerTreeNodeData,
    treeData: DatabaseBuilderTreeData,
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
    treeData: DatabaseBuilderTreeData,
  ): DatabaseSchemaExplorerTreeNodeData[] | undefined {
    return node.childrenIds
      ?.map((n) => treeData.nodes.get(n))
      .filter(isNonNullable);
  }

  *fetchDatabaseMetadata(): GeneratorFn<void> {
    if (!this.connection) {
      return;
    }

    try {
      this.isFetchingSchema = true;
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        DUMMY_DATABASE_PACKAGE,
        DUMMY_DATABASE_NAME,
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
        .forEach((dbSchema) => {
          const schemaId = dbSchema.name;
          rootIds.push(schemaId);
          const schemaNode = new DatabaseSchemaExplorerTreeSchemaNodeData(
            schemaId,
            undefined,
            dbSchema,
          );
          // schemaNode.isChecked = Boolean(
          //   this.currentDatabase?.schemas.find(
          //     (cSchema) => cSchema.name === dbSchema.name,
          //   ),
          // );
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
      this.isFetchingSchema = false;
    }
  }

  *fetchSchemaMetadata(
    schemaNode: DatabaseSchemaExplorerTreeSchemaNodeData,
    treeData: DatabaseBuilderTreeData,
  ): GeneratorFn<void> {
    if (!this.connection) {
      return;
    }

    try {
      this.isFetchingSchema = true;
      const schema = schemaNode.schema;
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        DUMMY_DATABASE_PACKAGE,
        DUMMY_DATABASE_NAME,
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
            table,
          );
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
      this.isFetchingSchema = false;
    }
  }

  *fetchTableMetadata(
    tableNode: DatabaseSchemaExplorerTreeTableNodeData,
    treeData: DatabaseBuilderTreeData,
  ): GeneratorFn<void> {
    if (!this.connection) {
      return;
    }

    try {
      const databaseBuilderInput = new DatabaseBuilderInput(this.connection);
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        DUMMY_DATABASE_PACKAGE,
        DUMMY_DATABASE_NAME,
      );
      const config = databaseBuilderInput.config;
      config.maxTables = undefined;
      config.enrichTables = true;
      config.enrichColumns = true;
      config.enrichPrimaryKeys = true;
      const table = tableNode.table;
      config.patterns = [new DatabasePattern(table.schema.name, table.name)];

      const database = (yield this.buildIntermediateDatabase(
        databaseBuilderInput,
      )) as Database;
      const enrichedTable = database.schemas
        .find((schema) => table.schema.name === schema.name)
        ?.tables.find((t) => t.name === table.name);
      if (enrichedTable) {
        const columns = enrichedTable.columns.filter(filterByType(Column));
        tableNode.table.columns = columns;
        tableNode.childrenIds?.forEach((c) => treeData.nodes.delete(c));
        tableNode.childrenIds = undefined;
        const childrenIds: string[] = [];
        const tableId = tableNode.id;
        columns
          .slice()
          .sort((colA, colB) => colA.name.localeCompare(colB.name))
          .forEach((col) => {
            const columnId = `${tableId}.${col.name}`;
            const columnNode = new DatabaseSchemaExplorerTreeColumnNodeData(
              columnId,
              tableId,
              col,
            );
            col.owner = tableNode.table;
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
      this.isFetchingSchema = false;
    }
  }

  /**
   * This will build the intermediate database from the specified
   * schema exploration input; this information can be further used
   * to enrich the explorer tree
   */
  private async buildIntermediateDatabase(
    input: DatabaseBuilderInput,
  ): Promise<Database> {
    const entities =
      await this.editorStore.graphManagerState.graphManager.buildDatabase(
        input,
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
}
