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
  getNonNullableEntry,
  getNullableLastEntry,
} from '@finos/legend-shared';
import { observable, makeObservable, flow, flowResult, action } from 'mobx';
import { editor as monacoEditorAPI } from 'monaco-editor';
import {
  type Schema,
  type Table,
  type Database,
  type PackageableConnection,
  DatabaseBuilderInput,
  DatabasePattern,
  TargetDatabase,
  Column,
  getSchema,
  guaranteeRelationalDatabaseConnection,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import {
  CODE_EDITOR_LANGUAGE,
  moveCursorToPosition,
} from '@finos/legend-lego/code-editor';

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

export interface DatabaseSchemaExplorerTreeData
  extends TreeData<DatabaseSchemaExplorerTreeNodeData> {
  database: Database;
}

const DUMMY_DATABASE_PACKAGE = 'dummy';
const DUMMY_DATABASE_NAME = 'DummyDB';
const DEFAULT_SQL_TEXT = `--Start building your SQL. Note that you can also drag-and-drop nodes from schema explorer\n`;

export class SQLPlaygroundPanelState {
  readonly editorStore: EditorStore;

  isFetchingSchema = false;
  isExecutingRawSQL = false;

  connection?: PackageableConnection | undefined;
  treeData?: DatabaseSchemaExplorerTreeData | undefined;
  readonly sqlEditorTextModel: monacoEditorAPI.ITextModel;
  sqlEditor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  sqlEditorViewState?: monacoEditorAPI.ICodeEditorViewState | undefined;
  sqlText = DEFAULT_SQL_TEXT;
  sqlExecutionResult?: string | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      isFetchingSchema: observable,
      isExecutingRawSQL: observable,
      connection: observable,
      treeData: observable,
      sqlText: observable,
      sqlExecutionResult: observable,
      sqlEditor: observable.ref,
      sqlEditorViewState: observable.ref,
      setTreeData: action,
      setConnection: action,
      setSQLEditor: action,
      setSQLEditorViewState: action,
      onNodeSelect: flow,
      fetchDatabaseMetadata: flow,
      fetchSchemaMetadata: flow,
      fetchTableMetadata: flow,
      executeRawSQL: flow,
    });

    this.editorStore = editorStore;
    this.sqlEditorTextModel = monacoEditorAPI.createModel(
      this.sqlText,
      CODE_EDITOR_LANGUAGE.SQL,
    );
  }

  setTreeData(val?: DatabaseSchemaExplorerTreeData): void {
    this.treeData = val;
  }

  setConnection(val: PackageableConnection | undefined): void {
    this.connection = val;
    this.sqlEditorTextModel.setValue(DEFAULT_SQL_TEXT);
  }

  setSQLText(val: string): void {
    this.sqlText = val;
  }

  setSQLEditor(val: monacoEditorAPI.IStandaloneCodeEditor | undefined): void {
    this.sqlEditor = val;
    if (val) {
      const lines = this.sqlText.split('\n');
      moveCursorToPosition(val, {
        lineNumber: lines.length,
        column: getNullableLastEntry(lines)?.length ?? 0,
      });
    }
  }

  setSQLEditorViewState(
    val: monacoEditorAPI.ICodeEditorViewState | undefined,
  ): void {
    this.sqlEditorViewState = val;
  }

  *onNodeSelect(
    node: DatabaseSchemaExplorerTreeNodeData,
    treeData: DatabaseSchemaExplorerTreeData,
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
    treeData: DatabaseSchemaExplorerTreeData,
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

      const databaseBuilderInput = new DatabaseBuilderInput(
        guaranteeRelationalDatabaseConnection(this.connection),
      );
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
            dbSchema,
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
      this.isFetchingSchema = false;
    }
  }

  *fetchSchemaMetadata(
    schemaNode: DatabaseSchemaExplorerTreeSchemaNodeData,
    treeData: DatabaseSchemaExplorerTreeData,
  ): GeneratorFn<void> {
    if (!this.connection) {
      return;
    }

    try {
      this.isFetchingSchema = true;

      const schema = schemaNode.schema;
      const databaseBuilderInput = new DatabaseBuilderInput(
        guaranteeRelationalDatabaseConnection(this.connection),
      );
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
            schema,
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
    treeData: DatabaseSchemaExplorerTreeData,
  ): GeneratorFn<void> {
    if (!this.connection) {
      return;
    }

    try {
      this.isFetchingSchema = true;

      const table = tableNode.table;
      const databaseBuilderInput = new DatabaseBuilderInput(
        guaranteeRelationalDatabaseConnection(this.connection),
      );
      databaseBuilderInput.targetDatabase = new TargetDatabase(
        DUMMY_DATABASE_PACKAGE,
        DUMMY_DATABASE_NAME,
      );
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
        .find((schema) => table.schema.name === schema.name)
        ?.tables.find((t) => t.name === table.name);
      if (enrichedTable) {
        table.primaryKey = enrichedTable.primaryKey;
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
              table,
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

  *executeRawSQL(): GeneratorFn<void> {
    if (!this.connection) {
      return;
    }

    try {
      this.isExecutingRawSQL = true;

      let sql = this.sqlText;
      const currentSelection = this.sqlEditor?.getSelection();
      if (currentSelection) {
        const selectionValue =
          this.sqlEditorTextModel.getValueInRange(currentSelection);
        if (selectionValue.trim() !== '') {
          sql = selectionValue;
        }
      }

      this.sqlExecutionResult =
        (yield this.editorStore.graphManagerState.graphManager.executeRawSQL(
          guaranteeRelationalDatabaseConnection(this.connection),
          sql,
        )) as string;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isExecutingRawSQL = false;
    }
  }
}
