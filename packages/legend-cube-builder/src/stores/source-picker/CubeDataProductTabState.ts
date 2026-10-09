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
  DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION,
  DataProductAccessPointSource,
} from '@finos/legend-cube';
import {
  assertErrorThrown,
  debounce,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  createCubeDataProductModel,
  getEffectiveCubeWarehouse,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  type CubeDataProductProject,
  CubeDataProductEnvironmentType,
  getCubeDataProductProject,
  isCubeDataProductModel,
} from '../../graph-manager/CubeDataProduct.js';
import {
  type CubeAccessPoint,
  CubeDataProductCandidate,
  type CubeDataProductCatalog,
  type CubeDataProductDescription,
} from '../../graph-manager/CubeDataProductCatalog.js';
import { CubeEngineError } from '../../graph-manager/CubeEngine.js';
import {
  getCubeRememberedWarehouse,
  rememberCubeWarehouse,
} from '../CubeDataProductWarehouse.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './CubeSourcePickerTab.js';

/** An error as the tab shows it: its first line, with the rest on demand */
export interface CubeDataProductTabError {
  readonly message: string;
  readonly detail?: string | undefined;
}

const toError = (error: unknown): CubeDataProductTabError => {
  assertErrorThrown(error);
  return error instanceof CubeEngineError
    ? {
        message: error.firstLine,
        detail: error.detail !== error.firstLine ? error.detail : undefined,
      }
    : { message: error.message };
};

export const CUBE_DATA_PRODUCT_TAB_MESSAGE = {
  CUBE_CHANGED:
    'The cube changed while the access point was being added; pick it again.',
  TRUNCATED: 'Too many matching items; list truncated.',
} as const;

/** How long typing pauses before the text is searched on a server */
const SEARCH_DELAY_MS = 300;

/** Whether a product is deployed from the project and version given, in its class */
const isFromProject = (
  candidate: CubeDataProductCandidate,
  project: CubeDataProductProject,
): boolean =>
  candidate.groupId === project.groupId &&
  candidate.artifactId === project.artifactId &&
  candidate.versionId === project.versionId &&
  candidate.environmentType === project.environmentType;

/** Whether two candidates are the same deployed product, at the same version and class */
const isSameProduct = (
  candidate: CubeDataProductCandidate,
  other: CubeDataProductCandidate,
): boolean =>
  candidate.id === other.id &&
  candidate.deploymentId === other.deploymentId &&
  candidate.dataProductPath === other.dataProductPath &&
  candidate.groupId === other.groupId &&
  candidate.artifactId === other.artifactId &&
  candidate.versionId === other.versionId &&
  candidate.environmentType === other.environmentType;

/**
 * The source dialog's Data product tab (PLAN §6.8), as Data Cube's selection
 * goes: a deployment class, then a deployed data product, then one of its
 * access points, then the warehouse, filled in with the default. The access
 * point's columns come from the product's deployed artifact, so Add calls no
 * engine. The first access point saves the product's project, its version,
 * the class and the warehouse as the cube's model; after that the tab offers
 * only that project's products, at that version, and reopens on the cube's
 * data product, already expanded. A catalog that searches on a server is
 * searched as the viewer types, and a cube with no search shows its own
 * products, which a page of the server's matches may miss.
 */
export class CubeDataProductTabState implements CubeSourcePickerTab {
  readonly key = CubeSourcePickerTabKey.DATA_PRODUCT;
  readonly label = 'Data product';
  readonly editorState: CubeEditorState;

  environmentType = CubeDataProductEnvironmentType.PRODUCTION;
  search = '';
  /** The class's deployed products; none until listed */
  candidates: readonly CubeDataProductCandidate[] | undefined;
  /** The class the products were listed for */
  private listedEnvironmentType: CubeDataProductEnvironmentType | undefined;
  /** The text the products were searched for on a server; '' for a whole list */
  private listedText: string | undefined;
  /** What the cube's own products listed were built from; none for a catalog's list */
  private listedOwnKey: string | undefined;
  /** Whether the server's matches listed leave out some */
  private listedCutShort = false;
  candidate: CubeDataProductCandidate | undefined;
  description: CubeDataProductDescription | undefined;
  /** The picked access point, by group and id */
  accessPointKey: { readonly group: string; readonly id: string } | undefined;
  warehouse = CUBE_DEFAULT_CONSUMER_WAREHOUSE;
  isListing = false;
  isDescribing = false;
  isAdding = false;
  /** Why the products couldn't be listed, with its own retry */
  listError: CubeDataProductTabError | undefined;
  /** Why a product couldn't be read or its access point added */
  error: CubeDataProductTabError | undefined;

  /** The warehouse field shows a cube's own, not one the viewer typed */
  private warehouseFromProject = false;
  /** Stops the listing under way: a new listing or closing the dialog drops it */
  private listAbort: AbortController | undefined;
  /** Each counts its calls: a new call or closing the dialog drops a late answer */
  private listRequest = 0;
  private describeRequest = 0;
  private confirmRequest = 0;
  /** Searches the typed text on the server once typing pauses */
  private readonly searchSoon = debounce((): void => {
    flowResult(this.listCandidates()).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }, SEARCH_DELAY_MS);

  constructor(editorState: CubeEditorState) {
    makeObservable<
      CubeDataProductTabState,
      'listedEnvironmentType' | 'listedText' | 'listedOwnKey' | 'listedCutShort'
    >(this, {
      environmentType: observable,
      search: observable,
      candidates: observable.ref,
      listedEnvironmentType: observable,
      listedText: observable,
      listedOwnKey: observable,
      listedCutShort: observable,
      candidate: observable.ref,
      description: observable.ref,
      accessPointKey: observable.ref,
      warehouse: observable,
      isListing: observable,
      isDescribing: observable,
      isAdding: observable,
      listError: observable.ref,
      error: observable.ref,
      isAvailable: computed,
      searchesOnServer: computed,
      fixedProject: computed,
      visibleCandidates: computed,
      isTruncated: computed,
      accessPoint: computed,
      isBusy: computed,
      canConfirm: computed,
      setEnvironmentType: action,
      setSearch: action,
      selectCandidate: action,
      selectAccessPoint: action,
      setWarehouse: action,
      open: action,
      close: action,
      retryListing: action,
      listCandidates: flow,
      describeCandidate: flow,
      confirm: flow,
    });
    this.editorState = editorState;
  }

  get catalog(): CubeDataProductCatalog | undefined {
    return this.editorState.host.dataProductCatalog;
  }

  /** Hosts without a data product catalog have no data products */
  get isAvailable(): boolean {
    return this.catalog !== undefined;
  }

  /** Whether the catalog searches the text on a server, rather than the tab filtering its list */
  get searchesOnServer(): boolean {
    return this.catalog?.searchesOnServer === true;
  }

  ownsContext(context: CubeContext): boolean {
    return isCubeDataProductModel(context.model);
  }

  /** The cube's project, once its first access point is added: every other comes from it */
  get fixedProject(): CubeDataProductProject | undefined {
    const model = this.editorState.document.context?.model;
    return model ? getCubeDataProductProject(model) : undefined;
  }

  /** The cube's first data product, which the tab reopens on */
  get fixedDataProductPath(): string | undefined {
    return this.editorState.document.query.nodes.find(
      (node): node is DataProductAccessPointSource =>
        node instanceof DataProductAccessPointSource,
    )?.dataProduct;
  }

  /**
   * The listed products matching the search, from the cube's project once it
   * has one; a server's matches as it gave them
   */
  get visibleCandidates(): readonly CubeDataProductCandidate[] {
    const search = this.search.trim().toLowerCase();
    const project = this.fixedProject;
    const { searchesOnServer } = this;
    return (this.candidates ?? []).filter(
      (candidate) =>
        (!project || isFromProject(candidate, project)) &&
        (searchesOnServer ||
          [candidate.title, candidate.id, candidate.description ?? '']
            .join('\n')
            .toLowerCase()
            .includes(search)),
    );
  }

  /** Whether a server's matches listed may be cut short */
  get isTruncated(): boolean {
    return this.listedCutShort;
  }

  get accessPoint(): CubeAccessPoint | undefined {
    const key = this.accessPointKey;
    return key
      ? this.description?.groups
          .find((group) => group.id === key.group)
          ?.accessPoints.find((point) => point.id === key.id)
      : undefined;
  }

  get isBusy(): boolean {
    return this.isListing || this.isDescribing || this.isAdding;
  }

  get canConfirm(): boolean {
    const { context } = this.editorState.document;
    return (
      this.isAvailable &&
      !this.isBusy &&
      (context === undefined || this.fixedProject !== undefined) &&
      this.candidate !== undefined &&
      this.accessPoint?.isPickable === true &&
      this.warehouse.trim().length > 0
    );
  }

  setEnvironmentType(environmentType: CubeDataProductEnvironmentType): void {
    if (this.fixedProject || environmentType === this.environmentType) {
      return;
    }
    this.environmentType = environmentType;
    this.resetCandidate();
    this.error = undefined;
    this.candidates = undefined;
    this.listedCutShort = false;
    flowResult(this.listCandidates()).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }

  /** Filters the listed products; searching on a server, searches again once typing pauses */
  setSearch(search: string): void {
    this.search = search;
    if (this.searchesOnServer) {
      this.searchSoon();
    }
  }

  /** Picks a product and reads its access points; picking it again reads them again after a failure */
  selectCandidate(candidate: CubeDataProductCandidate | undefined): void {
    if (
      candidate === this.candidate &&
      (candidate === undefined || this.description || this.isDescribing)
    ) {
      return;
    }
    this.resetCandidate();
    this.candidate = candidate;
    if (candidate) {
      flowResult(this.describeCandidate(candidate)).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  selectAccessPoint(group: string, id: string): void {
    this.accessPointKey = { group, id };
    this.error = undefined;
  }

  /** The warehouse of a cube without one yet; a saved cube's is kept */
  setWarehouse(warehouse: string): void {
    if (!this.fixedProject) {
      this.warehouse = warehouse;
    }
  }

  /**
   * When the dialog opens on the tab: on a cube with a project, on its class
   * and warehouse, and then on its data product, expanded; otherwise on the
   * warehouse the viewer last picked, else the default
   */
  open(): void {
    const project = this.fixedProject;
    const remembered = getCubeRememberedWarehouse(
      this.editorState.host.applicationStore.userDataService,
    );
    this.error = undefined;
    if (project) {
      if (this.environmentType !== project.environmentType) {
        this.environmentType = project.environmentType;
        this.resetCandidate();
      }
      this.warehouse = getEffectiveCubeWarehouse(project, remembered);
      this.warehouseFromProject = true;
      if (this.candidate && !isFromProject(this.candidate, project)) {
        this.resetCandidate();
      }
    } else if (this.warehouseFromProject || !this.candidate) {
      // a new cube starts on the viewer's warehouse, not a previous cube's
      this.warehouse = remembered ?? CUBE_DEFAULT_CONSUMER_WAREHOUSE;
      this.warehouseFromProject = false;
    }
    if (
      this.candidates === undefined ||
      this.listedEnvironmentType !== this.environmentType ||
      (this.searchesOnServer &&
        (this.listedText !== this.search.trim() ||
          this.listedOwnKey !== this.getOwnProductsKey()))
    ) {
      flowResult(this.listCandidates()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    } else {
      this.expandCubeDataProduct();
    }
  }

  close(): void {
    this.searchSoon.cancel();
    this.listAbort?.abort();
    this.listAbort = undefined;
    this.listRequest++;
    this.confirmRequest++;
    this.isListing = false;
    this.isAdding = false;
    // a product whose access points haven't arrived would show none
    if (this.candidate && !this.description) {
      this.resetCandidate();
    }
    this.describeRequest++;
    this.isDescribing = false;
  }

  /** Lists the products again after a failed listing */
  retryListing(): void {
    flowResult(this.listCandidates()).catch(
      this.editorState.host.applicationStore.alertUnhandledError,
    );
  }

  /**
   * Lists the class's deployed products; searching on a server, the ones
   * matching the search, or a cube's own when there is no search
   */
  *listCandidates(): GeneratorFn<void> {
    const { catalog } = this;
    if (!catalog) {
      return;
    }
    // this listing replaces one the typing would start
    this.searchSoon.cancel();
    const environmentType = this.environmentType;
    const text = this.searchesOnServer ? this.search.trim() : '';
    const request = ++this.listRequest;
    this.listAbort?.abort();
    this.listAbort = undefined;
    this.listError = undefined;
    const ownKey = this.getOwnProductsKey();
    if (ownKey !== undefined) {
      this.isListing = false;
      this.candidates = this.getOwnProducts();
      this.listedEnvironmentType = environmentType;
      this.listedText = text;
      this.listedOwnKey = ownKey;
      this.listedCutShort = false;
      this.expandCubeDataProduct();
      return;
    }
    const abort = new AbortController();
    this.listAbort = abort;
    this.isListing = true;
    try {
      const candidates = (yield catalog.search(
        { text, environmentType },
        abort.signal,
      )) as readonly CubeDataProductCandidate[];
      if (request !== this.listRequest) {
        return;
      }
      // a server's answer is read anew each time: the picked product stays the one picked
      const picked = this.candidate;
      this.candidates = picked
        ? candidates.map((each) =>
            isSameProduct(each, picked) ? picked : each,
          )
        : candidates;
      this.listedEnvironmentType = environmentType;
      this.listedText = text;
      this.listedOwnKey = undefined;
      this.listedCutShort =
        this.searchesOnServer && this.isCutShort(candidates);
      this.expandCubeDataProduct();
    } catch (error) {
      if (request === this.listRequest) {
        this.listError = toError(error);
      }
    } finally {
      if (request === this.listRequest) {
        this.isListing = false;
        this.listAbort = undefined;
      }
    }
  }

  /** Reads a product's access points */
  *describeCandidate(candidate: CubeDataProductCandidate): GeneratorFn<void> {
    const { catalog } = this;
    if (!catalog) {
      return;
    }
    const request = ++this.describeRequest;
    this.isDescribing = true;
    this.error = undefined;
    try {
      const description = (yield catalog.describe(
        candidate,
      )) as CubeDataProductDescription;
      if (request !== this.describeRequest || candidate !== this.candidate) {
        return;
      }
      this.description = description;
    } catch (error) {
      if (request === this.describeRequest) {
        this.error = toError(error);
      }
    } finally {
      if (request === this.describeRequest) {
        this.isDescribing = false;
      }
    }
  }

  /**
   * Adds the picked access point, typed by the product's deployed artifact.
   * The first saves the product's project, version and class and the
   * warehouse as the cube's model, in the same undo step, and remembers the
   * warehouse for the viewer's next cubes. Gives whether it was added
   */
  *confirm(): GeneratorFn<boolean> {
    if (!this.canConfirm) {
      return false;
    }
    const { editorState } = this;
    const candidate = this.candidate as CubeDataProductCandidate;
    const accessPoint = this.accessPoint as CubeAccessPoint;
    const group = this.accessPointKey?.group as string;
    const warehouse = this.warehouse.trim();
    const request = ++this.confirmRequest;
    this.isAdding = true;
    this.error = undefined;
    try {
      // no engine call: yields once, so a dialog closed meanwhile adds nothing
      yield Promise.resolve();
      if (request !== this.confirmRequest) {
        return false;
      }
      const { document } = editorState;
      const id = document.query.generateId(DataProductAccessPointSource.TYPE);
      const node = DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION.resolve(
        DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION.fromCoordinates(id, {
          dataProduct: candidate.dataProductPath,
          accessPointGroup: group,
          accessPoint: accessPoint.id,
          dataProductId: candidate.id,
          deploymentId: candidate.deploymentId,
        }),
        {
          kind: 'resolved',
          schema: accessPoint.schema as NonNullable<CubeAccessPoint['schema']>,
        },
      );
      const project = this.fixedProject;
      if (
        (document.context !== undefined &&
          (!project || !isFromProject(candidate, project))) ||
        !document.query.canAdd(node)
      ) {
        throw new Error(CUBE_DATA_PRODUCT_TAB_MESSAGE.CUBE_CHANGED);
      }
      const query = document.query.add(node);
      editorState.applyDocument(
        document.context
          ? document.withQuery(query)
          : document
              .withContext({
                model: createCubeDataProductModel({
                  groupId: candidate.groupId,
                  artifactId: candidate.artifactId,
                  versionId: candidate.versionId,
                  environmentType: candidate.environmentType,
                  warehouse,
                }),
                runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
              })
              .withQuery(query),
      );
      if (!project) {
        rememberCubeWarehouse(
          editorState.host.applicationStore.userDataService,
          warehouse,
        );
      }
      // the product stays expanded, to add another of its access points
      this.accessPointKey = undefined;
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

  /**
   * The cube's own products, from its sources, at the cube's project; none
   * on a cube without one. The picked product stays the one picked
   */
  private getOwnProducts(): CubeDataProductCandidate[] {
    const project = this.fixedProject;
    if (!project) {
      return [];
    }
    const picked = this.candidate;
    const products = new Map<string, CubeDataProductCandidate>();
    this.editorState.document.query.nodes.forEach((node) => {
      if (
        node instanceof DataProductAccessPointSource &&
        !products.has(node.dataProduct)
      ) {
        products.set(
          node.dataProduct,
          picked?.dataProductPath === node.dataProduct &&
            isFromProject(picked, project)
            ? picked
            : new CubeDataProductCandidate({
                id: node.dataProductId,
                deploymentId: node.deploymentId,
                dataProductPath: node.dataProduct,
                title: node.dataProductId,
                groupId: project.groupId,
                artifactId: project.artifactId,
                versionId: project.versionId,
                environmentType: project.environmentType,
              }),
        );
      }
    });
    return [...products.values()];
  }

  /**
   * What the tab lists the cube's own products from, when it does: searching
   * on a server, on a cube with sources and no search. None otherwise
   */
  private getOwnProductsKey(): string | undefined {
    if (!this.searchesOnServer || this.search.trim()) {
      return undefined;
    }
    const products = this.getOwnProducts();
    return products.length
      ? JSON.stringify(
          products.map((product) => [
            product.groupId,
            product.artifactId,
            product.versionId,
            product.environmentType,
            product.dataProductPath,
          ]),
        )
      : undefined;
  }

  /** Whether the catalog's answer leaves out matches, as it says, else as long as one search gives */
  private isCutShort(answer: readonly CubeDataProductCandidate[]): boolean {
    const { catalog } = this;
    if (catalog?.isCutShort) {
      return catalog.isCutShort(answer);
    }
    const limit = catalog?.searchLimit;
    return limit !== undefined && answer.length >= limit;
  }

  /** On a cube with a data product, picks that product from the list, expanded */
  private expandCubeDataProduct(): void {
    const project = this.fixedProject;
    const path = this.fixedDataProductPath;
    if (!project || !path || this.candidate) {
      return;
    }
    const candidate = this.visibleCandidates.find(
      (each) => each.dataProductPath === path,
    );
    if (candidate) {
      this.selectCandidate(candidate);
    }
  }

  private resetCandidate(): void {
    this.describeRequest++;
    this.isDescribing = false;
    this.candidate = undefined;
    this.description = undefined;
    this.accessPointKey = undefined;
  }
}
