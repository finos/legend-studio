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
  type Schema,
  SERVICE_SOURCE_DEFINITION,
  ServiceSource,
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
import { CUBE_SERVICE_MESSAGE } from '../../__lib__/LegendCubeServiceLabels.js';
import { CubeEngineError } from '../../graph-manager/CubeEngine.js';
import {
  createCubeServiceModel,
  isCubeServiceModel,
} from '../../graph-manager/CubeService.js';
import type {
  CubeServiceCatalog,
  CubeServiceSummary,
} from '../../graph-manager/CubeServiceCatalog.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { recheckCubeServiceSources } from '../CubeServiceRecheck.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './CubeSourcePickerTab.js';

/** What failed in the tab: its first line, and the rest on demand */
export interface CubeServiceTabError {
  readonly message: string;
  readonly detail?: string | undefined;
}

/** The most services the list shows: a registry can hold thousands */
export const CUBE_SERVICE_LIST_LIMIT = 200;

const toError = (error: unknown): CubeServiceTabError => {
  if (error instanceof CubeEngineError) {
    return {
      message: error.firstLine,
      detail: error.detail !== error.firstLine ? error.detail : undefined,
    };
  }
  return { message: error instanceof Error ? error.message : String(error) };
};

/**
 * The source dialog's Service tab (PLAN §6.4), in progress: the deployed
 * services, searched by title, name and pattern. Add puts the picked one on
 * the canvas, typed as services are (`recheckCubeServiceSources`), which for
 * now says it can't be read; the first saves a service model as the cube's.
 */
export class CubeServiceTabState implements CubeSourcePickerTab {
  readonly key = CubeSourcePickerTabKey.SERVICE;
  readonly label = 'Service';
  readonly editorState: CubeEditorState;

  services: readonly CubeServiceSummary[] | undefined;
  search = '';
  /** The picked service's pattern */
  pattern: string | undefined;
  isLoading = false;
  isAdding = false;
  error: CubeServiceTabError | undefined;

  /** Each counts its calls: a later call, or closing the dialog, drops an earlier answer */
  private listRequest = 0;
  private confirmRequest = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      services: observable.ref,
      search: observable,
      pattern: observable,
      isLoading: observable,
      isAdding: observable,
      error: observable.ref,
      isAvailable: computed,
      isBusy: computed,
      matchingServices: computed,
      shownServices: computed,
      service: computed,
      canConfirm: computed,
      setSearch: action,
      selectService: action,
      retry: action,
      open: action,
      close: action,
      loadServices: flow,
      confirm: flow,
    });
    this.editorState = editorState;
  }

  get catalog(): CubeServiceCatalog | undefined {
    return this.editorState.host.serviceCatalog;
  }

  /** Hosts without a service catalog have no services */
  get isAvailable(): boolean {
    return this.catalog !== undefined;
  }

  get isBusy(): boolean {
    return this.isLoading || this.isAdding;
  }

  ownsContext(context: CubeContext): boolean {
    return isCubeServiceModel(context.model);
  }

  /** The services whose title, name or pattern holds the search text */
  get matchingServices(): readonly CubeServiceSummary[] {
    const search = this.search.trim().toLowerCase();
    return (this.services ?? []).filter((service) =>
      [service.title ?? '', service.name, service.pattern].some((text) =>
        text.toLowerCase().includes(search),
      ),
    );
  }

  /** The first matching services, up to the list's limit */
  get shownServices(): readonly CubeServiceSummary[] {
    return this.matchingServices.slice(0, CUBE_SERVICE_LIST_LIMIT);
  }

  get service(): CubeServiceSummary | undefined {
    return this.services?.find((each) => each.pattern === this.pattern);
  }

  get canConfirm(): boolean {
    return (
      this.isAvailable &&
      !this.editorState.readOnly &&
      !this.isAdding &&
      this.service !== undefined
    );
  }

  setSearch(search: string): void {
    this.search = search;
  }

  selectService(pattern: string): void {
    if (this.services?.some((each) => each.pattern === pattern)) {
      this.pattern = pattern;
    }
  }

  /** Reads the list again, after it failed */
  retry(): void {
    this.error = undefined;
    flowResult(this.loadServices()).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }

  /** When the dialog opens on the tab: reads the list, unless it is read or on its way */
  open(): void {
    this.error = undefined;
    if (this.services === undefined && !this.isLoading) {
      flowResult(this.loadServices()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  close(): void {
    this.listRequest++;
    this.confirmRequest++;
    this.isLoading = false;
    this.isAdding = false;
  }

  *loadServices(): GeneratorFn<void> {
    const { catalog } = this;
    if (!catalog) {
      return;
    }
    const request = ++this.listRequest;
    this.isLoading = true;
    this.error = undefined;
    try {
      const services =
        (yield catalog.listServices()) as readonly CubeServiceSummary[];
      if (request === this.listRequest) {
        this.services = services;
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
   * Adds the picked service, typed as services are; the first saves a
   * service model as the cube's, in the same undo step
   */
  *confirm(): GeneratorFn<boolean> {
    if (!this.canConfirm) {
      return false;
    }
    const { editorState } = this;
    const service = this.service as CubeServiceSummary;
    const request = ++this.confirmRequest;
    this.isAdding = true;
    this.error = undefined;
    try {
      const coordinates = { pattern: service.pattern, service: service.name };
      const model =
        editorState.document.context?.model ?? createCubeServiceModel();
      const answers = (yield recheckCubeServiceSources(this.catalog, model, [
        SERVICE_SOURCE_DEFINITION.fromCoordinates(
          ServiceSource.TYPE,
          coordinates,
        ),
      ])) as Map<string, Schema | CubeEngineError>;
      if (request !== this.confirmRequest) {
        return false;
      }
      const [answer] = [...answers.values()];
      // the cube as it is now: it may have changed meanwhile
      const { document } = editorState;
      const node = SERVICE_SOURCE_DEFINITION.resolve(
        SERVICE_SOURCE_DEFINITION.fromCoordinates(
          document.query.generateId(ServiceSource.TYPE),
          coordinates,
        ),
        answer === undefined || answer instanceof CubeEngineError
          ? {
              kind: 'failed',
              message: answer?.detail ?? CUBE_SERVICE_MESSAGE.NOT_READABLE,
            }
          : { kind: 'resolved', schema: answer },
      );
      if (
        (document.context !== undefined &&
          !isCubeServiceModel(document.context.model)) ||
        !document.query.canAdd(node)
      ) {
        throw new Error(CUBE_SERVICE_MESSAGE.CUBE_CHANGED);
      }
      const query = document.query.add(node);
      editorState.applyDocument(
        document.context
          ? document.withQuery(query)
          : document.withContext({ model }).withQuery(query),
      );
      this.pattern = undefined;
      return true;
    } catch (error) {
      if (request === this.confirmRequest) {
        this.error = toError(error);
      }
      return false;
    } finally {
      if (request === this.confirmRequest) {
        this.isAdding = false;
      }
    }
  }
}
