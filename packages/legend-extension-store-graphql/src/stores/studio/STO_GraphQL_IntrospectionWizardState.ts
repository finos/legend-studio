/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from '@finos/legend-application-studio';
import type { Entity } from '@finos/legend-storage';
import {
  type GeneratorFn,
  ActionState,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { GraphQLConnection } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';
import { getOwnGraphQLStore } from '../../graph-manager/STO_GraphQL_GraphManagerHelper.js';
import {
  type GraphQLIntrospectionResult,
  GraphQLIntrospectionInput,
  getGraphQLPureGraphManagerExtension,
} from '../../graph-manager/protocol/pure/STO_GraphQL_PureGraphManagerExtension.js';
import { graphQL_store_setSchema } from './STO_GraphQL_GraphModifierHelper.js';

const GRAPHQL_INTROSPECTION_FAILURE = 'graphql-store.introspection.failure';

const PACKAGE_PATH_PATTERN = /^[A-Za-z_]\w*(?:::[A-Za-z_]\w*)*$/;
const ELEMENT_NAME_PATTERN = /^[A-Za-z_]\w*$/;

export class GraphQLIntrospectionWizardState {
  readonly editorStore: EditorStore;
  readonly connection: GraphQLConnection;

  showModal = false;
  targetPackage: string;
  private isTargetPackageCustomized = false;
  mappingName = 'GeneratedMapping';
  grammarPreview = '';
  skippedTypes: string[] = [];
  warnings: string[] = [];
  readonly generateState = ActionState.create();
  readonly applyState = ActionState.create();

  constructor(editorStore: EditorStore, connection: GraphQLConnection) {
    this.editorStore = editorStore;
    this.connection = connection;
    this.targetPackage = this.defaultTargetPackage;

    makeObservable(this, {
      showModal: observable,
      targetPackage: observable,
      mappingName: observable,
      grammarPreview: observable,
      skippedTypes: observable,
      warnings: observable,
      open: action,
      setShowModal: action,
      setTargetPackage: action,
      setMappingName: action,
      generate: flow,
      apply: flow,
    });
  }

  // a sub-package keeps generated classes (e.g. `Query`) from colliding with hand-written ones
  private get defaultTargetPackage(): string {
    return `${this.connection.store.value.package?.path ?? 'model'}::generated`;
  }

  get storePath(): string {
    return this.connection.store.value.path;
  }

  get targetMappingPath(): string {
    return `${this.targetPackage}::${this.mappingName}`;
  }

  get isExecutingAction(): boolean {
    return this.generateState.isInProgress || this.applyState.isInProgress;
  }

  get validationMessage(): string | undefined {
    if (!this.connection.url.trim()) {
      return 'Set the connection URL first: the engine introspects this endpoint';
    }
    if (!PACKAGE_PATH_PATTERN.test(this.targetPackage)) {
      return `Target package must look like 'my::package'`;
    }
    if (!ELEMENT_NAME_PATTERN.test(this.mappingName)) {
      return 'Mapping name must be a valid element name';
    }
    return undefined;
  }

  open(): void {
    // the connection's store may have been changed since this state was created
    if (!this.isTargetPackageCustomized) {
      this.targetPackage = this.defaultTargetPackage;
    }
    this.grammarPreview = '';
    this.skippedTypes = [];
    this.warnings = [];
    this.showModal = true;
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setTargetPackage(val: string): void {
    this.targetPackage = val;
    this.isTargetPackageCustomized = true;
    // the preview was generated for the previous targets
    this.grammarPreview = '';
    this.skippedTypes = [];
    this.warnings = [];
  }

  setMappingName(val: string): void {
    this.mappingName = val;
    this.grammarPreview = '';
    this.skippedTypes = [];
    this.warnings = [];
  }

  *generate(): GeneratorFn<void> {
    const validationMessage = this.validationMessage;
    if (validationMessage) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        validationMessage,
      );
      return;
    }
    try {
      this.generateState.inProgress();
      this.grammarPreview = '';
      this.skippedTypes = [];
      this.warnings = [];
      const result = (yield getGraphQLPureGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      ).generateModelsFromIntrospection(
        new GraphQLIntrospectionInput(
          this.connection.url,
          this.storePath,
          this.targetPackage,
          this.targetPackage,
          this.targetMappingPath,
          this.connection.authenticationSpecification,
        ),
      )) as GraphQLIntrospectionResult;
      this.grammarPreview = result.grammar;
      this.skippedTypes = result.skippedTypes;
      this.warnings = result.warnings;
      if (!result.grammar) {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          'The endpoint exposes no query fields the store can map, nothing was generated',
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPHQL_INTROSPECTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.generateState.complete();
    }
  }

  /**
   * Adds the previewed model to the open graph: the store this connection points at gets
   * the generated schema, every other generated element is added as a new element.
   * Never overwrites: if any generated element already exists, nothing is applied.
   */
  *apply(): GeneratorFn<void> {
    if (!this.grammarPreview) {
      return;
    }
    try {
      this.applyState.inProgress();
      const { graphManagerState } = this.editorStore;
      const entities = (yield graphManagerState.graphManager.pureCodeToEntities(
        this.grammarPreview,
      )) as Entity[];

      const storeEntity = entities.find(
        (entity) => entity.path === this.storePath,
      );
      guaranteeNonNullable(
        storeEntity,
        `Generated model does not contain store '${this.storePath}'`,
      );
      const conflicts = entities
        .filter(
          (entity) =>
            entity.path !== this.storePath &&
            graphManagerState.graph.getNullableElement(entity.path, false),
        )
        .map((entity) => entity.path);
      if (conflicts.length) {
        throw new Error(
          `Can't apply: ${conflicts.length} generated element(s) already exist (${conflicts.join(', ')}). Pick a different target package or mapping name`,
        );
      }

      const generatedGraph = graphManagerState.createNewGraph();
      yield graphManagerState.graphManager.buildGraph(
        generatedGraph,
        entities,
        ActionState.create(),
      );
      const generatedStore = getOwnGraphQLStore(this.storePath, generatedGraph);
      graphQL_store_setSchema(
        this.connection.store.value,
        guaranteeNonNullable(
          generatedStore.schema,
          `Generated store '${this.storePath}' has no schema`,
        ),
      );
      const newElements = generatedGraph.allOwnElements.filter(
        (element) => element !== generatedStore,
      );
      for (const element of newElements) {
        yield flowResult(
          this.editorStore.graphEditorMode.addElement(
            element,
            element.package?.path,
            false,
          ),
        );
      }
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Applied generated model: updated store schema, added ${newElements.length} element(s)`,
      );
      this.setShowModal(false);
      yield flowResult(
        this.editorStore.graphEditorMode.globalCompile({
          message: `Can't compile graph after applying the generated GraphQL model. Redirecting you to text mode`,
        }),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPHQL_INTROSPECTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.applyState.complete();
    }
  }
}
