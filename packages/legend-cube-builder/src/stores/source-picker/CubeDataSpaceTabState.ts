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

import {
  type CubeContext,
  DATA_SPACE_SOURCE_DEFINITION,
  DataSpaceSource,
} from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { CUBE_DATA_SPACE_MESSAGE } from '../../__lib__/LegendCubeDataSpaceLabels.js';
import { CubeEngineError } from '../../graph-manager/CubeEngine.js';
import {
  createCubeProjectModel,
  type CubeProjectCoordinates,
  getCubeProjectCoordinates,
  isCubeDataSpaceContext,
} from '../../graph-manager/CubeProject.js';
import type {
  CubeDataSpaceDescription,
  CubeDataSpaceEditor,
  CubeDataSpaceExecutionContext,
  CubeDataSpaceSummary,
} from '../CubeDataSpaceEditor.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './CubeSourcePickerTab.js';

/** What failed in the tab: its first line, and the rest on demand */
export interface CubeDataSpaceTabError {
  readonly message: string;
  readonly detail?: string | undefined;
}

/** The most data spaces the list shows: a depot can hold thousands */
export const CUBE_DATA_SPACE_LIST_LIMIT = 200;

const toError = (error: unknown): CubeDataSpaceTabError => {
  if (error instanceof CubeEngineError) {
    return {
      message: error.firstLine,
      detail: error.detail !== error.firstLine ? error.detail : undefined,
    };
  }
  return { message: error instanceof Error ? error.message : String(error) };
};

/** A data space's key in the list: its project and path */
export const getCubeDataSpaceKey = (summary: CubeDataSpaceSummary): string =>
  `${summary.project.groupId}:${summary.project.artifactId}:${summary.path}`;

/**
 * The source dialog's Data Space tab (PLAN §11.25): the depot's released
 * data spaces, searched by title and path; for the one picked, a released
 * version of its project and an execution context. Add puts an unset data
 * space source on the canvas and opens its editor, the host's query builder,
 * where its entity, columns and filter are picked. The first saves the
 * project, and the context's mapping and runtime, as the cube's.
 *
 * Once the cube has a data space source, the tab offers only its data space,
 * version and execution context: a query reads one (`dataSpaceSourcesShareContext`).
 */
export class CubeDataSpaceTabState implements CubeSourcePickerTab {
  readonly key = CubeSourcePickerTabKey.DATA_SPACE;
  readonly label = 'Data Space';
  readonly editorState: CubeEditorState;

  dataSpaces: readonly CubeDataSpaceSummary[] | undefined;
  search = '';
  /** The picked data space's key (`getCubeDataSpaceKey`) */
  pickedKey: string | undefined;
  /** The released versions of the picked data space's project, newest first */
  versions: readonly string[] | undefined;
  versionId: string | undefined;
  /** The picked data space at the version: its execution contexts */
  description: CubeDataSpaceDescription | undefined;
  executionContext: string | undefined;
  isLoading = false;
  isLoadingVersions = false;
  isDescribing = false;
  error: CubeDataSpaceTabError | undefined;

  /** Each counts its calls: a later call, or closing the dialog, drops an earlier answer */
  private listRequest = 0;
  private pickRequest = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      dataSpaces: observable.ref,
      search: observable,
      pickedKey: observable,
      versions: observable.ref,
      versionId: observable,
      description: observable.ref,
      executionContext: observable,
      isLoading: observable,
      isLoadingVersions: observable,
      isDescribing: observable,
      error: observable.ref,
      isAvailable: computed,
      isBusy: computed,
      fixed: computed,
      offeredDataSpaces: computed,
      matchingDataSpaces: computed,
      shownDataSpaces: computed,
      picked: computed,
      pickedExecutionContext: computed,
      canConfirm: computed,
      setSearch: action,
      setExecutionContext: action,
      retry: action,
      open: action,
      close: action,
      loadDataSpaces: flow,
      pick: flow,
      selectVersion: flow,
      confirm: flow,
    });
    this.editorState = editorState;
  }

  get dataSpaceEditor(): CubeDataSpaceEditor | undefined {
    return this.editorState.host.dataSpaceEditor;
  }

  /** Hosts without a data space editor have no data spaces */
  get isAvailable(): boolean {
    return this.dataSpaceEditor !== undefined;
  }

  get isBusy(): boolean {
    return this.isLoading || this.isLoadingVersions || this.isDescribing;
  }

  ownsContext(context: CubeContext): boolean {
    return isCubeDataSpaceContext(context);
  }

  /**
   * The data space, project and execution context the cube's data space
   * sources fix, once it has one
   */
  get fixed():
    | {
        readonly dataSpace: string;
        readonly executionContext: string;
        readonly project: CubeProjectCoordinates;
      }
    | undefined {
    const { context, query } = this.editorState.document;
    const source = query.nodes.find(
      (node): node is DataSpaceSource => node instanceof DataSpaceSource,
    );
    const project = context
      ? getCubeProjectCoordinates(context.model)
      : undefined;
    return source && project && context && isCubeDataSpaceContext(context)
      ? {
          dataSpace: source.dataSpace,
          executionContext: source.executionContext,
          project,
        }
      : undefined;
  }

  /** The data spaces the tab offers: the cube's own once it has one, else the depot's */
  get offeredDataSpaces(): readonly CubeDataSpaceSummary[] | undefined {
    const { fixed } = this;
    return fixed
      ? [{ path: fixed.dataSpace, project: fixed.project }]
      : this.dataSpaces;
  }

  /** The data spaces whose title or path holds the search text */
  get matchingDataSpaces(): readonly CubeDataSpaceSummary[] {
    const search = this.search.trim().toLowerCase();
    return (this.offeredDataSpaces ?? []).filter((summary) =>
      [summary.title ?? '', summary.path].some((text) =>
        text.toLowerCase().includes(search),
      ),
    );
  }

  /** The first matching data spaces, up to the list's limit */
  get shownDataSpaces(): readonly CubeDataSpaceSummary[] {
    return this.matchingDataSpaces.slice(0, CUBE_DATA_SPACE_LIST_LIMIT);
  }

  get picked(): CubeDataSpaceSummary | undefined {
    return this.offeredDataSpaces?.find(
      (summary) => getCubeDataSpaceKey(summary) === this.pickedKey,
    );
  }

  get pickedExecutionContext(): CubeDataSpaceExecutionContext | undefined {
    return this.description?.executionContexts.find(
      (context) => context.name === this.executionContext,
    );
  }

  get canConfirm(): boolean {
    return (
      this.isAvailable &&
      !this.editorState.readOnly &&
      !this.isBusy &&
      this.versionId !== undefined &&
      this.pickedExecutionContext !== undefined
    );
  }

  setSearch(search: string): void {
    this.search = search;
  }

  setExecutionContext(name: string): void {
    if (
      this.fixed === undefined &&
      this.description?.executionContexts.some(
        (context) => context.name === name,
      )
    ) {
      this.executionContext = name;
    }
  }

  /** Reads the list again, after it failed */
  retry(): void {
    this.error = undefined;
    flowResult(this.loadDataSpaces()).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }

  /**
   * When the dialog opens on the tab: on the cube's data space, version and
   * execution context once it has a data space source; else reads the list,
   * unless it is read or on its way
   */
  open(): void {
    this.error = undefined;
    const [fixed] = this.fixed ? (this.offeredDataSpaces ?? []) : [];
    if (fixed) {
      this.search = '';
      flowResult(this.pick(getCubeDataSpaceKey(fixed))).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
      return;
    }
    if (this.dataSpaces === undefined && !this.isLoading) {
      flowResult(this.loadDataSpaces()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  close(): void {
    this.listRequest++;
    this.pickRequest++;
    this.isLoading = false;
    this.isLoadingVersions = false;
    this.isDescribing = false;
  }

  *loadDataSpaces(): GeneratorFn<void> {
    const { dataSpaceEditor } = this;
    if (!dataSpaceEditor) {
      return;
    }
    const request = ++this.listRequest;
    this.isLoading = true;
    this.error = undefined;
    try {
      const dataSpaces =
        (yield dataSpaceEditor.listDataSpaces()) as readonly CubeDataSpaceSummary[];
      if (request === this.listRequest) {
        this.dataSpaces = dataSpaces;
      }
    } catch (error) {
      if (request === this.listRequest) {
        this.error = toError(error);
      }
    } finally {
      if (request === this.listRequest) {
        this.isLoading = false;
      }
    }
  }

  /**
   * Picks a data space: its project's released versions, through the host's
   * project catalog when it has one, else only the version listed; then the
   * data space at the version the cube fixes, else the newest
   */
  *pick(key: string): GeneratorFn<void> {
    const summary = this.offeredDataSpaces?.find(
      (each) => getCubeDataSpaceKey(each) === key,
    );
    if (!summary) {
      return;
    }
    const request = ++this.pickRequest;
    this.pickedKey = key;
    this.versions = undefined;
    this.versionId = undefined;
    this.description = undefined;
    this.executionContext = undefined;
    this.error = undefined;
    const { fixed } = this;
    const catalog = this.editorState.host.projectCatalog;
    let versions: readonly string[] = [summary.project.versionId];
    if (!fixed && catalog) {
      this.isLoadingVersions = true;
      try {
        const listed = (yield catalog.listVersions(
          summary.project,
        )) as readonly string[];
        if (request !== this.pickRequest) {
          return;
        }
        versions = listed.length ? listed : versions;
      } catch (error) {
        if (request === this.pickRequest) {
          this.error = toError(error);
        }
        return;
      } finally {
        if (request === this.pickRequest) {
          this.isLoadingVersions = false;
        }
      }
    }
    this.versions = versions;
    yield* this.describe(
      request,
      summary,
      fixed?.project.versionId ??
        (versions.includes(summary.project.versionId)
          ? summary.project.versionId
          : versions[0]),
    );
  }

  /** Reads the picked data space at another released version */
  *selectVersion(versionId: string): GeneratorFn<void> {
    const { picked } = this;
    if (
      !picked ||
      this.fixed !== undefined ||
      !this.versions?.includes(versionId)
    ) {
      return;
    }
    const request = ++this.pickRequest;
    yield* this.describe(request, picked, versionId);
  }

  /** The data space's execution contexts at the version; its default one picked, unless the cube fixes one */
  private *describe(
    request: number,
    summary: CubeDataSpaceSummary,
    versionId: string | undefined,
  ): GeneratorFn<void> {
    const { dataSpaceEditor } = this;
    if (!dataSpaceEditor || versionId === undefined) {
      return;
    }
    this.versionId = versionId;
    this.description = undefined;
    this.executionContext = undefined;
    this.isDescribing = true;
    try {
      const description = (yield dataSpaceEditor.describeDataSpace(
        { ...summary.project, versionId },
        summary.path,
      )) as CubeDataSpaceDescription;
      if (request !== this.pickRequest) {
        return;
      }
      this.description = description;
      this.executionContext =
        this.fixed?.executionContext ?? description.defaultExecutionContext;
    } catch (error) {
      if (request === this.pickRequest) {
        this.error = toError(error);
      }
    } finally {
      if (request === this.pickRequest) {
        this.isDescribing = false;
      }
    }
  }

  /**
   * Adds an unset source on the picked data space and execution context, and
   * opens its editor; the first saves the project at the version, and the
   * context's mapping and runtime, as the cube's, in the same undo step
   */
  *confirm(): GeneratorFn<boolean> {
    if (!this.canConfirm) {
      return false;
    }
    const { editorState } = this;
    const summary = this.picked as CubeDataSpaceSummary;
    const executionContext = this
      .pickedExecutionContext as CubeDataSpaceExecutionContext;
    const project: CubeProjectCoordinates = {
      ...summary.project,
      versionId: this.versionId as string,
    };
    this.error = undefined;
    try {
      // the cube as it is now
      const { document } = editorState;
      const node = DATA_SPACE_SOURCE_DEFINITION.fromCoordinates(
        document.query.generateId(DataSpaceSource.TYPE),
        { dataSpace: summary.path, executionContext: executionContext.name },
      );
      const context: CubeContext = {
        model: createCubeProjectModel(project),
        runtime: executionContext.runtime,
        mapping: executionContext.mapping,
      };
      if (
        (document.context !== undefined &&
          JSON.stringify({
            model: document.context.model,
            runtime: document.context.runtime,
            mapping: document.context.mapping,
          }) !== JSON.stringify(context)) ||
        !document.query.canAdd(node)
      ) {
        throw new Error(CUBE_DATA_SPACE_MESSAGE.CUBE_CHANGED);
      }
      const query = document.query.add(node);
      editorState.applyDocument(
        document.context
          ? document.withQuery(query)
          : document.withContext(context).withQuery(query),
      );
      // its entity, columns and filter are picked in its editor
      editorState.nodeEditor.open(node.id);
      return true;
    } catch (error) {
      this.error = toError(error);
      return false;
    }
  }
}
