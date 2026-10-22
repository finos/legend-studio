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

import type { JsonObject } from '@finos/legend-cube';
import type {
  CubeDataSpaceDescription,
  CubeDataSpaceEdit,
  CubeDataSpaceEditor,
  CubeDataSpaceEditorSession,
  CubeDataSpaceEditorTarget,
  CubeDataSpaceExecutionContext,
  CubeDataSpaceSummary,
  CubeProjectCoordinates,
} from '@finos/legend-cube-builder';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  getDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import { GraphManagerState, LegendSDLC, RawLambda } from '@finos/legend-graph';
import { QueryBuilderTDSState } from '@finos/legend-query-builder';
import {
  DepotScope,
  type DepotServerClient,
  type StoredEntity,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import type { Entity, EntitiesWithOrigin } from '@finos/legend-storage';
import {
  action,
  flow,
  flowResult,
  type IReactionDisposer,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { createElement, type ReactNode } from 'react';
import { LegendAnalyticsDataSpaceQueryBuilder } from '../../components/data-space/LegendAnalyticsDataSpaceQueryBuilder.js';
import type { LegendAnalyticsApplicationStore } from '../LegendAnalyticsBaseStore.js';
import { buildCubeDataSpaceQuery } from './LegendAnalyticsCubeDataSpaceQuery.js';
import { LegendAnalyticsCubeQueryBuilderState } from './LegendAnalyticsCubeQueryBuilderState.js';

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

/** The path a packageable element pointer names, e.g. an execution context's mapping */
const pointerPathOf = (value: unknown): string | undefined =>
  isJsonObject(value) ? textOf(value.path) : undefined;

/**
 * A data space at a version, from its entity's content as depot keeps it:
 * each execution context with its mapping and default runtime. A context
 * without either, e.g. one whose mapping comes from a data product, isn't
 * listed: a cube can't run it.
 */
export const readCubeDataSpaceDescription = (
  path: string,
  content: unknown,
): CubeDataSpaceDescription => {
  const fields = isJsonObject(content) ? content : {};
  const contexts = Array.isArray(fields.executionContexts)
    ? fields.executionContexts
    : [];
  const executionContexts: CubeDataSpaceExecutionContext[] = contexts
    .filter(isJsonObject)
    .flatMap((context) => {
      const name = textOf(context.name);
      const mapping = pointerPathOf(context.mapping);
      const runtime = pointerPathOf(context.defaultRuntime);
      return name !== undefined &&
        mapping !== undefined &&
        runtime !== undefined
        ? [{ name, title: textOf(context.title), mapping, runtime }]
        : [];
    });
  const listed = textOf(fields.defaultExecutionContext);
  const [first] = executionContexts;
  if (!first) {
    throw new Error(
      `Data space "${path}" has no execution context with a mapping and a runtime, which a cube runs with`,
    );
  }
  return {
    path,
    title: textOf(fields.title),
    executionContexts,
    defaultExecutionContext: executionContexts.some(
      (context) => context.name === listed,
    )
      ? (listed as string)
      : first.name,
  };
};

/**
 * The released data spaces in depot, as the Data Space tab lists them: one
 * per project and path, its title and description from its content
 */
export const readCubeDataSpaceSummaries = (
  storedEntities: readonly StoredEntity[],
): CubeDataSpaceSummary[] => {
  const summaries = new Map<string, CubeDataSpaceSummary>();
  storedEntities.forEach((stored) => {
    const { path, content } = stored.entity;
    const key = `${stored.groupId}:${stored.artifactId}:${path}`;
    if (!summaries.has(key)) {
      summaries.set(key, {
        path,
        title: textOf(content.title),
        description: textOf(content.description),
        project: {
          groupId: stored.groupId,
          artifactId: stored.artifactId,
          versionId: stored.versionId,
        },
      });
    }
  });
  return [...summaries.values()].sort((a, b) =>
    (a.title ?? a.path).localeCompare(b.title ?? b.path),
  );
};

const getProjectKey = (project: CubeProjectCoordinates): string =>
  `${project.groupId}:${project.artifactId}:${project.versionId}`;

/**
 * A data space source's query builder (PLAN §11.25), while the source's
 * node editor shows it: it loads the data space's project, then opens the
 * query builder on the source's execution context and query. Its edit is the
 * query builder's query as a source, built again as the query changes.
 */
export class LegendAnalyticsDataSpaceEditorSession
  implements CubeDataSpaceEditorSession
{
  readonly editor: LegendAnalyticsDataSpaceEditor;
  readonly target: CubeDataSpaceEditorTarget;
  isLoading = true;
  loadError: string | undefined;
  hasChanges = false;
  edit: CubeDataSpaceEdit | undefined;
  editProblem: string | undefined;
  queryBuilderState: LegendAnalyticsCubeQueryBuilderState | undefined;

  /** The query builder's state as it opened: an edit differs from it */
  private openedKey: string | undefined;
  private disposeTracking: IReactionDisposer | undefined;
  private isDisposed = false;

  constructor(
    editor: LegendAnalyticsDataSpaceEditor,
    target: CubeDataSpaceEditorTarget,
  ) {
    makeObservable<LegendAnalyticsDataSpaceEditorSession, 'update'>(this, {
      isLoading: observable,
      loadError: observable,
      hasChanges: observable,
      edit: observable.ref,
      editProblem: observable,
      queryBuilderState: observable.ref,
      load: flow,
      update: action,
    });
    this.editor = editor;
    this.target = target;
    flowResult(this.load()).catch(editor.applicationStore.alertUnhandledError);
  }

  /** What changes when the user edits: the query builder's state, its context and runtime */
  private get changeKey(): string {
    const state = this.queryBuilderState;
    if (!state) {
      return '';
    }
    const { runtimeValue } = state.executionContextState;
    return JSON.stringify([
      state.hashCode,
      state.executionContext.name,
      state.sourceClass?.path ?? null,
      runtimeValue ? runtimeValue.hashCode : null,
    ]);
  }

  /**
   * What the edit is built from: the change key, and the types of derived
   * columns, which the engine gives after the column is made and which the
   * query builder's hash doesn't hold
   */
  private get trackedKey(): string {
    const implementation =
      this.queryBuilderState?.fetchStructureState.implementation;
    return JSON.stringify([
      this.changeKey,
      implementation instanceof QueryBuilderTDSState
        ? implementation.projectionColumns.map(
            (column) => column.getColumnType()?.path ?? null,
          )
        : [],
    ]);
  }

  *load(): GeneratorFn<void> {
    const { target } = this;
    try {
      const graphManagerState = (yield this.editor.loadGraph(
        target.project,
      )) as GraphManagerState;
      if (this.isDisposed) {
        return;
      }
      const dataSpace = getDataSpace(target.dataSpace, graphManagerState.graph);
      const executionContext =
        (dataSpace.executionContexts ?? []).find(
          (context) => context.name === target.executionContext,
        ) ?? dataSpace.defaultExecutionContext;
      if (!executionContext) {
        throw new Error(
          `Data space "${dataSpace.path}" has no execution context "${target.executionContext}"`,
        );
      }
      const state = new LegendAnalyticsCubeQueryBuilderState(
        this.editor.applicationStore,
        graphManagerState,
        dataSpace,
        executionContext,
      );
      yield state.propagateExecutionContextChange();
      if (target.query) {
        state.initializeWithQuery(
          new RawLambda(
            target.query.parameters as object | undefined,
            target.query.body as object | undefined,
          ),
        );
      }
      // a post-filter or window panel a setting opened: those are Cube's steps
      const { implementation } = state.fetchStructureState;
      if (implementation instanceof QueryBuilderTDSState) {
        implementation.setShowPostFilterPanel(false);
        implementation.setShowWindowFuncPanel(false);
      }
      this.queryBuilderState = state;
      this.openedKey = this.changeKey;
      this.update();
      this.disposeTracking = reaction(
        () => this.trackedKey,
        () => this.update(),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.loadError = error.message;
    } finally {
      this.isLoading = false;
    }
  }

  /** The query builder's query, as a source or why it isn't one */
  private update(): void {
    const state = this.queryBuilderState;
    if (!state) {
      return;
    }
    // builds with the typed writer switched on and back: one action
    const result = runInAction(() => buildCubeDataSpaceQuery(state));
    this.hasChanges = this.changeKey !== this.openedKey;
    if ('edit' in result) {
      this.edit = result.edit;
      this.editProblem = undefined;
    } else {
      this.edit = undefined;
      this.editProblem = result.problem;
    }
  }

  /** The editor closed: the project's graph stays, for the next one */
  dispose(): void {
    this.isDisposed = true;
    this.disposeTracking?.();
  }
}

/**
 * Legend Analytics' data space editor for Legend Cube (PLAN §11.25): the
 * depot's released data spaces, and each source's query builder on its data
 * space's project, whose graph is built once per version for the visit,
 * as Legend Query builds a data space's full graph
 */
export class LegendAnalyticsDataSpaceEditor implements CubeDataSpaceEditor {
  readonly applicationStore: LegendAnalyticsApplicationStore;
  readonly depotServerClient: DepotServerClient;
  /** Each project's graph, by version: one build per visit, shared by the sessions */
  private readonly graphs = new Map<string, Promise<GraphManagerState>>();

  constructor(
    applicationStore: LegendAnalyticsApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
  }

  async listDataSpaces(): Promise<readonly CubeDataSpaceSummary[]> {
    const storedEntities =
      (await this.depotServerClient.getEntitiesByClassifier(
        DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
        { scope: DepotScope.RELEASES },
      )) as unknown as StoredEntity[];
    return readCubeDataSpaceSummaries(storedEntities);
  }

  async describeDataSpace(
    project: CubeProjectCoordinates,
    dataSpace: string,
  ): Promise<CubeDataSpaceDescription> {
    const entity = await this.depotServerClient.getVersionEntity(
      project.groupId,
      project.artifactId,
      project.versionId,
      dataSpace,
    );
    return readCubeDataSpaceDescription(dataSpace, entity.content);
  }

  /**
   * The project's graph at the version: its entities and its dependencies'
   * from depot, built once and shared; a build that failed is built again
   * when asked again
   */
  loadGraph(project: CubeProjectCoordinates): Promise<GraphManagerState> {
    const key = getProjectKey(project);
    const loaded = this.graphs.get(key);
    if (loaded) {
      return loaded;
    }
    const loading = this.buildGraph(project).catch((error: unknown) => {
      this.graphs.delete(key);
      throw error;
    });
    this.graphs.set(key, loading);
    return loading;
  }

  private async buildGraph(
    project: CubeProjectCoordinates,
  ): Promise<GraphManagerState> {
    const { applicationStore, depotServerClient } = this;
    const { config } = applicationStore;
    const graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    await graphManagerState.graphManager.initialize(
      {
        env: config.env,
        tabSize: 2,
        clientConfig: {
          baseUrl: config.engineServerUrl,
          queryBaseUrl: config.engineQueryServerUrl,
          queryClientName: config.engineQueryClientName,
          enableCompression: true,
          useCookieAuthOnly: config.engineUseCookieAuthOnly,
        },
      },
      { tracerService: applicationStore.tracerService },
    );
    await graphManagerState.initializeSystem();
    const storeProject = StoreProjectData.serialization.fromJson(
      await depotServerClient.getProject(project.groupId, project.artifactId),
    );
    const [entities, dependencyEntitiesIndex] = (await Promise.all([
      depotServerClient.getEntities(storeProject, project.versionId),
      depotServerClient.getIndexedDependencyEntities(
        storeProject,
        project.versionId,
      ),
    ])) as unknown as [Entity[], Map<string, EntitiesWithOrigin>];
    const dependencyManager =
      graphManagerState.graphManager.createDependencyManager();
    graphManagerState.graph.dependencyManager = dependencyManager;
    await graphManagerState.graphManager.buildDependencies(
      graphManagerState.coreModel,
      graphManagerState.systemModel,
      dependencyManager,
      dependencyEntitiesIndex,
      graphManagerState.dependenciesBuildState,
    );
    await graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      entities,
      graphManagerState.graphBuildState,
      {
        origin: new LegendSDLC(
          project.groupId,
          project.artifactId,
          project.versionId,
        ),
      },
    );
    return graphManagerState;
  }

  openSession(
    target: CubeDataSpaceEditorTarget,
  ): LegendAnalyticsDataSpaceEditorSession {
    return new LegendAnalyticsDataSpaceEditorSession(this, target);
  }

  renderSession(session: CubeDataSpaceEditorSession): ReactNode {
    return session instanceof LegendAnalyticsDataSpaceEditorSession
      ? createElement(LegendAnalyticsDataSpaceQueryBuilder, { session })
      : null;
  }
}
