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
  type Writable,
  guaranteeNonNullable,
  IllegalStateError,
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
  getNullableSchema,
  getNullableTable,
} from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import {
  CODE_EDITOR_LANGUAGE,
  moveCursorToPosition,
} from '@finos/legend-lego/code-editor';
import type { CommandRegistrar } from '@finos/legend-application';
import { STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY } from '../../../__lib__/STO_Relational_LegendStudioCommand.js';
import { PANEL_MODE } from '../EditorConfig.js';
import type { Entity } from '@finos/legend-storage';
import { GraphEditFormModeState } from '../GraphEditFormModeState.js';

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

export interface DatabaseSchemaExplorerTreeData
  extends TreeData<DatabaseSchemaExplorerTreeNodeData> {
  database: Database;
}

const DUMMY_DATABASE_PACKAGE = 'dummy';
const DUMMY_DATABASE_NAME = 'DummyDB';
const DEFAULT_SQL_TEXT = `--Start building your SQL. Note that you can also drag-and-drop nodes from schema explorer\n`;

export class SQLPlaygroundPanelState implements CommandRegistrar {
  readonly editorStore: EditorStore;

  isFetchingSchema = false;
  isExecutingRawSQL = false;

  connection?: PackageableConnection | undefined;
  database?: Database | undefined;
  treeData?: DatabaseSchemaExplorerTreeData | undefined;
  readonly sqlEditorTextModel: monacoEditorAPI.ITextModel;
  sqlEditor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  sqlEditorViewState?: monacoEditorAPI.ICodeEditorViewState | undefined;
  sqlText = DEFAULT_SQL_TEXT;
  sqlExecutionResult?: string | undefined;

  isBuildingDatabase = false;
  isUpdatingDatabase = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      isFetchingSchema: observable,
      isExecutingRawSQL: observable,
      connection: observable,
      database: observable,
      treeData: observable,
      sqlText: observable,
      resetSQL: action,
      sqlExecutionResult: observable,
      sqlEditor: observable.ref,
      sqlEditorViewState: observable.ref,
      isBuildingDatabase: observable,
      isUpdatingDatabase: observable,
      setTreeData: action,
      setConnection: action,
      setSQLEditor: action,
      setSQLEditorViewState: action,
      setSQLText: action,
      onNodeSelect: flow,
      fetchDatabaseMetadata: flow,
      fetchSchemaMetadata: flow,
      fetchTableMetadata: flow,
      executeRawSQL: flow,
      generateDatabase: flow,
      updateDatabase: flow,
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
    if (val) {
      this.database = guaranteeRelationalDatabaseConnection(val).store.value;
    }
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

  resetSQL(): void {
    this.setSQLText(DEFAULT_SQL_TEXT);
    this.sqlEditorTextModel.setValue(DEFAULT_SQL_TEXT);
    this.sqlExecutionResult = undefined;
  }

  setSQLEditorViewState(
    val: monacoEditorAPI.ICodeEditorViewState | undefined,
  ): void {
    this.sqlEditorViewState = val;
  }

  registerCommands(): void {
    this.editorStore.applicationStore.commandService.registerCommand({
      key: STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY.SQL_PLAYGROUND_EXECUTE,
      trigger: () =>
        this.editorStore.isInitialized &&
        this.editorStore.activePanelMode === PANEL_MODE.SQL_PLAYGROUND &&
        Boolean(this.connection) &&
        Boolean(this.sqlText.length),
      action: () => {
        flowResult(this.executeRawSQL()).catch(
          this.editorStore.applicationStore.alertUnhandledError,
        );
      },
    });
  }

  deregisterCommands(): void {
    [STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY.SQL_PLAYGROUND_EXECUTE].forEach(
      (key) =>
        this.editorStore.applicationStore.commandService.deregisterCommand(key),
    );
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
      ?.map((childNode) => treeData.nodes.get(childNode))
      .filter(isNonNullable);
  }

  toggleCheckedNode(
    node: DatabaseSchemaExplorerTreeNodeData,
    treeData: DatabaseSchemaExplorerTreeData,
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

          schemaNode.setChecked(
            Boolean(
              this.database?.schemas.find(
                (schema) => schema.name === dbSchema.name,
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

          if (this.database) {
            const matchingSchema = getNullableSchema(
              this.database,
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
    if (!this.connection || this.isExecutingRawSQL) {
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

  *generateDatabase(): GeneratorFn<Entity> {
    if (!this.database || !this.connection || !this.treeData) {
      throw new IllegalStateError(
        `Can't build database: builder is not properly set up`,
      );
    }

    try {
      this.isBuildingDatabase = true;

      const treeData = this.treeData;
      const databaseBuilderInput = new DatabaseBuilderInput(
        guaranteeRelationalDatabaseConnection(this.connection),
      );
      const packagePath = guaranteeNonNullable(this.database.package).path;
      const databaseName = this.database.name;
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
      this.isBuildingDatabase = false;
    }
  }

  *updateDatabase(): GeneratorFn<void> {
    if (!this.treeData || !this.database || !this.connection) {
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
      const generatedDatabase = getNonNullableEntry(
        graph.ownDatabases,
        0,
        'Expected one database to be generated from input',
      );

      const currentDatabase = this.database;

      // remove undefined schemas
      const schemas = Array.from(this.treeData.nodes.values())
        .map((schemaNode) => {
          if (schemaNode instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
            return schemaNode.schema;
          }
          return undefined;
        })
        .filter(isNonNullable);
      currentDatabase.schemas = currentDatabase.schemas.filter((schema) => {
        if (
          schemas.find((item) => item.name === schema.name) &&
          !generatedDatabase.schemas.find((s) => s.name === schema.name)
        ) {
          return false;
        }
        return true;
      });

      // update existing schemas
      generatedDatabase.schemas.forEach((schema) => {
        (schema as Writable<Schema>)._OWNER = currentDatabase;
        const currentSchemaIndex = currentDatabase.schemas.findIndex(
          (item) => item.name === schema.name,
        );
        if (currentSchemaIndex !== -1) {
          currentDatabase.schemas[currentSchemaIndex] = schema;
        } else {
          currentDatabase.schemas.push(schema);
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
