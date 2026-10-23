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
  DATASPACE_ANALYTICS_FILE_NAME,
  type DataSpaceAnalysisResult,
  DSL_DataSpace_getGraphManagerExtension,
  getDataSpace,
  retrieveDataspaceArtifactsCache,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  GraphManagerState,
  type PureModel,
  RawLambda,
} from '@finos/legend-graph';
import { QueryBuilderTDSState } from '@finos/legend-query-builder';
import {
  DepotScope,
  type DepotServerClient,
  type StoredEntity,
  StoreProjectData,
} from '@finos/legend-server-depot';
import {
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import type { Entity, StoredFileGeneration } from '@finos/legend-storage';
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

/** Why a data space can't be opened: depot has none of its analytics, which a release generates */
export const getCubeDataSpaceNoAnalyticsMessage = (
  project: CubeProjectCoordinates,
  dataSpace: string,
): string =>
  `Depot has no analytics for data space "${dataSpace}" at ${getProjectKey(project)}, which Legend Cube opens a data space from: a release of its project generates them`;

/** A file of a data space's analytics, read: its path, and its content as JSON */
const readArtifactFile = (
  artifact: PlainObject<StoredFileGeneration>,
): { path: string; content: unknown } | undefined => {
  const { file } = artifact;
  return isJsonObject(file) &&
    typeof file.path === 'string' &&
    typeof file.content === 'string'
    ? { path: file.path, content: JSON.parse(file.content) as unknown }
    : undefined;
};

/**
 * What a data space's analytics describe: each execution context's name and
 * mapping, and the mappings whose classes they hold (a mapping model
 * coverage partition each); none without the analysis itself
 */
export const readCubeDataSpaceAnalytics = (
  artifacts: readonly PlainObject<StoredFileGeneration>[],
):
  | {
      executionContexts: { name: string; mapping: string | undefined }[];
      coveredMappings: Set<string>;
    }
  | undefined => {
  const files = artifacts
    .map(readArtifactFile)
    .filter((file) => file !== undefined);
  const analysis = files.find((file) =>
    file.path.endsWith(DATASPACE_ANALYTICS_FILE_NAME),
  )?.content;
  if (!isJsonObject(analysis)) {
    return undefined;
  }
  const contexts = Array.isArray(analysis.executionContexts)
    ? analysis.executionContexts
    : [];
  return {
    executionContexts: contexts.filter(isJsonObject).flatMap((context) => {
      const name = textOf(context.name);
      return name === undefined
        ? []
        : [{ name, mapping: textOf(context.mapping) }];
    }),
    coveredMappings: new Set(
      files.flatMap(({ content }) =>
        isJsonObject(content) &&
        content._type === 'MappingModelCoveragePartition' &&
        isJsonObject(content.model) &&
        typeof content.mapping === 'string'
          ? [content.mapping]
          : [],
      ),
    ),
  };
};

/** The data space's functions and runtimes, which the light graph doesn't need: the editor shows neither */
const NO_ENTITIES = async (): Promise<
  [PlainObject<Entity>[], PlainObject<Entity>[]]
> => Promise.resolve([[], []]);

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
    const { target, editor } = this;
    try {
      const graphManagerState =
        (yield editor.createGraphManagerState()) as GraphManagerState;
      const analysis = (yield editor.buildLightGraph(
        target.project,
        target.dataSpace,
        target.executionContext,
        graphManagerState.graph,
        graphManagerState,
      )) as DataSpaceAnalysisResult;
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
        editor.applicationStore,
        graphManagerState,
        dataSpace,
        executionContext,
        analysis,
        // another context's mapping covers other classes: its own light graph
        async (graph, context) => {
          await editor.buildLightGraph(
            target.project,
            target.dataSpace,
            context,
            graph,
            graphManagerState,
          );
        },
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

  /** The query builder's undo, as its button does it, while it can show the query */
  undo(): void {
    const state = this.queryBuilderState;
    if (state?.isQuerySupported) {
      state.changeHistoryState.undo();
    }
  }

  /** The query builder's redo, as its button does it, while it can show the query */
  redo(): void {
    const state = this.queryBuilderState;
    if (state?.isQuerySupported) {
      state.changeHistoryState.redo();
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
 * depot's released data spaces, and each source's query builder on the light
 * graph of its data space's analytics, as Legend Query builds it: the
 * classes the execution context's mapping covers, the data space, and stubs
 * of its mappings and runtimes. A data space whose release has no analytics
 * can't be opened: the project's full graph, and the graph plugins of every
 * element type it could hold, are never built.
 */
export class LegendAnalyticsDataSpaceEditor implements CubeDataSpaceEditor {
  readonly applicationStore: LegendAnalyticsApplicationStore;
  readonly depotServerClient: DepotServerClient;
  /** Each data space's analytics, by project version and path: read once per visit, again after a failure */
  private readonly artifacts = new Map<
    string,
    Promise<PlainObject<StoredFileGeneration>[]>
  >();
  /** The content of each data space the list read, by project version and path */
  private readonly listedContents = new Map<string, unknown>();

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
    storedEntities.forEach((stored) =>
      this.listedContents.set(
        `${getProjectKey(stored)}:${stored.entity.path}`,
        stored.entity.content,
      ),
    );
    return readCubeDataSpaceSummaries(storedEntities);
  }

  /**
   * A data space at a version: from the content the list read when it is
   * the version listed, else from depot
   */
  async describeDataSpace(
    project: CubeProjectCoordinates,
    dataSpace: string,
  ): Promise<CubeDataSpaceDescription> {
    const key = `${getProjectKey(project)}:${dataSpace}`;
    const content = this.listedContents.has(key)
      ? this.listedContents.get(key)
      : (
          await this.depotServerClient.getVersionEntity(
            project.groupId,
            project.artifactId,
            project.versionId,
            dataSpace,
          )
        ).content;
    return readCubeDataSpaceDescription(dataSpace, content);
  }

  /** A graph manager state for one session, its system built, its graph empty */
  async createGraphManagerState(): Promise<GraphManagerState> {
    const { applicationStore } = this;
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
    return graphManagerState;
  }

  /** The data space's analytics at the version, as depot's release generated them */
  getDataSpaceArtifacts(
    project: CubeProjectCoordinates,
    dataSpace: string,
  ): Promise<PlainObject<StoredFileGeneration>[]> {
    const key = `${getProjectKey(project)}:${dataSpace}`;
    const read = this.artifacts.get(key);
    if (read) {
      return read;
    }
    const reading = (async () => {
      const storeProject = StoreProjectData.serialization.fromJson(
        await this.depotServerClient.getProject(
          project.groupId,
          project.artifactId,
        ),
      );
      return retrieveDataspaceArtifactsCache(
        storeProject,
        project.versionId,
        dataSpace,
        this.depotServerClient,
      );
    })().catch((error: unknown) => {
      this.artifacts.delete(key);
      throw error;
    });
    this.artifacts.set(key, reading);
    return reading;
  }

  /**
   * Builds into the graph the light graph of the data space's analytics for
   * the execution context, and returns the analysis, which covers every
   * context's mapping. Refuses a data space with no analytics, or none for
   * the context, rather than build anything else.
   */
  async buildLightGraph(
    project: CubeProjectCoordinates,
    dataSpace: string,
    executionContext: string,
    graph: PureModel,
    graphManagerState: GraphManagerState,
  ): Promise<DataSpaceAnalysisResult> {
    const artifacts = await this.getDataSpaceArtifacts(project, dataSpace);
    const analytics = readCubeDataSpaceAnalytics(artifacts);
    // as the extension requires to build a light graph: the analysis, and
    // the classes of every context's mapping; else it builds another graph
    if (
      !analytics?.executionContexts.every(
        (context) =>
          context.mapping !== undefined &&
          analytics.coveredMappings.has(context.mapping),
      )
    ) {
      throw new Error(getCubeDataSpaceNoAnalyticsMessage(project, dataSpace));
    }
    if (
      !analytics.executionContexts.some(
        (context) => context.name === executionContext,
      )
    ) {
      throw new Error(
        `The analytics of data space "${dataSpace}" at ${getProjectKey(project)} have no execution context "${executionContext}"`,
      );
    }
    return DSL_DataSpace_getGraphManagerExtension(
      graphManagerState.graphManager,
    ).analyzeDataSpaceCoverage(
      dataSpace,
      NO_ENTITIES,
      NO_ENTITIES,
      async () => Promise.resolve(artifacts),
      undefined,
      undefined,
      graph,
      executionContext,
      undefined,
      project,
    );
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
