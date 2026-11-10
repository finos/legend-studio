/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import type { LegendStudioApplicationStore } from '@finos/legend-application-studio';
import {
  BasicGraphManagerState,
  CORE_PURE_PATH,
  resolvePackagePathAndElementName,
  type V1_DataProduct,
  V1_dataProductModelSchema,
  V1_ModelAccessPointGroup,
} from '@finos/legend-graph';
import {
  DepotScope,
  StoredSummaryEntity,
  type StoreProjectData,
  type DepotServerClient,
  MASTER_SNAPSHOT_ALIAS,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isObject,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { type Entity, generateGAVCoordinates } from '@finos/legend-storage';
import { deserialize } from 'serializr';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import type { GridApi } from 'ag-grid-community';
import { DepotGenerationSpecification } from './DepotGenerationSpecification.js';
import {
  DEPOT_DATA_SPACE_CLASSIFIER_PATH,
  DepotDataSpace,
} from './DepotDataSpace.js';
import { DepotGenerationSpecificationFlattenState } from './DepotGenerationSpecificationFlattenState.js';
import {
  type Review,
  AuthorizableProjectAction,
  ProjectAccessRole,
  type SDLCServerClient,
} from '@finos/legend-server-sdlc';

export enum DEPOT_DASHBOARD_ELEMENT_TYPE {
  DATA_PRODUCT = 'Data Product',
  DATA_SPACE = 'Data Space',
  GENERATION_SPECIFICATION = 'Generation Specification',
}

export const LEGEND_DEPOT_ROUTE_PATTERN = `/depot`;
export const LEGEND_DEPOT_ELEMENT_TYPE_ROUTE_PATTERN = `/depot/:elementType`;

// The element type's segment in the dashboard's address, so a view can be
// shared, e.g. /extensions/depot/generation-specifications
const DEPOT_DASHBOARD_ELEMENT_TYPE_SLUG: Record<
  DEPOT_DASHBOARD_ELEMENT_TYPE,
  string
> = {
  [DEPOT_DASHBOARD_ELEMENT_TYPE.DATA_PRODUCT]: 'data-products',
  [DEPOT_DASHBOARD_ELEMENT_TYPE.DATA_SPACE]: 'data-spaces',
  [DEPOT_DASHBOARD_ELEMENT_TYPE.GENERATION_SPECIFICATION]:
    'generation-specifications',
};

// The scope's query parameter, e.g. ?scope=snapshots. Releases, the default,
// needs none.
export const DEPOT_DASHBOARD_SCOPE_QUERY_PARAM = 'scope';
const DEPOT_DASHBOARD_SCOPE_VALUE: Record<DepotScope, string> = {
  [DepotScope.RELEASES]: 'releases',
  [DepotScope.SNAPSHOT]: 'snapshots',
};

export const generateDepotDashboardRoute = (
  elementType: DEPOT_DASHBOARD_ELEMENT_TYPE,
  scope?: DepotScope,
): string => {
  const route = `${LEGEND_DEPOT_ROUTE_PATTERN}/${DEPOT_DASHBOARD_ELEMENT_TYPE_SLUG[elementType]}`;
  return scope === DepotScope.SNAPSHOT
    ? `${route}?${DEPOT_DASHBOARD_SCOPE_QUERY_PARAM}=${DEPOT_DASHBOARD_SCOPE_VALUE[scope]}`
    : route;
};

export const getDepotDashboardElementType = (
  slug: string | undefined,
): DEPOT_DASHBOARD_ELEMENT_TYPE | undefined =>
  Object.values(DEPOT_DASHBOARD_ELEMENT_TYPE).find(
    (elementType) => DEPOT_DASHBOARD_ELEMENT_TYPE_SLUG[elementType] === slug,
  );

export const getDepotDashboardScope = (
  value: string | null | undefined,
): DepotScope | undefined =>
  Object.values(DepotScope).find(
    (scope) => DEPOT_DASHBOARD_SCOPE_VALUE[scope] === value?.toLowerCase(),
  );

export enum DEPOT_DASHBOARD_PROJECT_ACCESS_HEADER {
  ROLE = 'Your Access',
  ACTIONS = 'Your Actions',
}

const AUTHORIZABLE_PROJECT_ACTION_LABEL: Record<
  AuthorizableProjectAction,
  string
> = {
  [AuthorizableProjectAction.CREATE_WORKSPACE]: 'Create workspace',
  [AuthorizableProjectAction.SUBMIT_REVIEW]: 'Submit review',
  [AuthorizableProjectAction.COMMIT_REVIEW]: 'Commit review',
  [AuthorizableProjectAction.CREATE_VERSION]: 'Create version',
};

/**
 * What the signed-in user may do on a project, from SDLC.
 */
export class DepotProjectAccess {
  /**
   * The user's GitLab access level (e.g. DEVELOPER); undefined when they can
   * see the project without being a member
   */
  readonly role: string | undefined;
  readonly actions: AuthorizableProjectAction[];
  /**
   * SDLC could not tell: the user cannot see the project, or SDLC failed
   */
  readonly unavailable: boolean;

  constructor(
    role: string | undefined,
    actions: AuthorizableProjectAction[],
    unavailable: boolean,
  ) {
    this.role = role;
    this.actions = actions;
    this.unavailable = unavailable;
  }

  get roleLabel(): string {
    if (this.unavailable) {
      return 'No access';
    }
    if (!this.role) {
      return 'Not a member';
    }
    // DEVELOPER -> Developer, MINIMAL_ACCESS -> Minimal access
    const words = this.role.toLowerCase().replaceAll('_', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  get actionsLabel(): string {
    if (this.unavailable) {
      return '';
    }
    return this.actions.length
      ? this.actions
          .map(
            (projectAction) => AUTHORIZABLE_PROJECT_ACTION_LABEL[projectAction],
          )
          .join(', ')
      : 'None';
  }
}

export enum GENERATION_SPECIFICATION_DASHBOARD_HEADER {
  NAME = 'Name',
  PACKAGE = 'Package',
  STAGE_COUNT = 'Stages',
  GENERATION_ELEMENT_COUNT = 'Generation Elements',
  FILE_GENERATION_COUNT = 'File Generations',
  GENERATION_ELEMENTS = 'Generation Element Paths',
  FILE_GENERATIONS = 'File Generation Paths',
  FLATTEN = 'Flatten',
}

export enum DATA_SPACE_DASHBOARD_HEADER {
  TITLE = 'Title',
  EXECUTION_CONTEXT_COUNT = 'Execution Contexts',
  EXECUTABLE_COUNT = 'Executables',
  TEMPLATE_QUERY_COUNT = 'Template Queries',
  DIAGRAM_COUNT = 'Diagrams',
  ELEMENT_COUNT = 'Elements',
  DEFAULT_EXECUTION_CONTEXT = 'Default Execution Context',
  SUPPORT_INFO = 'Support Info',
  MAPPINGS = 'Mappings',
  EXECUTION_CONTEXTS = 'Execution Context Names',
  EXECUTABLES = 'Executable Titles',
  DIAGRAMS = 'Diagram Paths',
}

export enum DATA_PRODUCT_DASHBOARD_HEADER {
  PROJECT_GAV = 'GroupId:ArtifactId',
  PROJECT_VERSION = 'Project Version',
  PROJECT_ID = 'Project ID',
  DATA_PRODUCT_NAME = 'Name',
  DATA_PRODUCT_PACKAGE = 'Package',
  // title/description checks
  DATA_PRODUCT_HAS_TITLE_DESCRIPTION = 'Has Title/Description',
  DATA_PRODUCT_HAS_ACESS_POINT_GROUP_TITLE_DESCRIPTION = 'APG Has Title/Description',
  DATA_PRODUCT_HAS_ACCESS_POINT_TITLE_DESCRIPTION = 'Access Point Has Title/Description',
  // title/description
  DATA_PRODUCT_TITLE = 'Title',
  DATA_PRODUCT_DESCRIPTION = 'Description',
  // access point groups / access points
  DATA_PRODUCT_APG_NUMBER = 'Access Point Group Number',
  DATA_PRODUCT_APG_IDS = 'Access Point Group Ids',
  DATA_PRODUCT_APG_TITLE = 'Access Point Group Titles',
  DATA_PRODUCT_APG_DESCRIPTION = 'Access Point Group Descriptions',
  DATA_PRODUCT_APG_NUMBER_OF_APS = 'Access Point Group AP Number',
  DATA_PRODUCT_HAS_MODEL_APG = 'Has Model Access Point Group',
  DATA_PRODUCT_HAS_MODEL_APG_FEATURED_ELEMENTS = 'Model APG Has Featured Elements',
  DATA_PRODUCT_HAS_NATIVE_APG = 'Has Native Access Point Group',
  // metadata
  DATA_PRODUCT_TYPE = 'Internal/External',
  DATA_PRODUCT_HAS_ENTERPRISE_GROUP = 'Is Enterprise',
  DATA_PRODUCT_REGIONS = 'Regions',
  DATA_PRODUCT_DELIVERY_FREQUENCY = 'Delivery Frequency',
  DATA_PRODUCT_HAS_ICON = 'Icon (Y/N)',
  DATA_PRODUCT_HAS_SAMPLE_VALUES = 'Sample Values (Y/N)',
  DATA_PRODUCT_STEREOTYPES = 'Stereotypes',
  DATA_PRODUCT_TAGGED_VALUES = 'Tagged Values',
  DATA_PRODUCT_SUPPORT_INFO = 'Support Info (Emails/Doc/FAQ/Support/Website)',
}

const getHasEnterpriseGroup = (
  dataProduct: V1_DataProduct,
  applicationStore: LegendStudioApplicationStore | undefined,
): string => {
  const publicStereotype =
    applicationStore?.config.options.dataProductConfig?.publicStereotype;

  return publicStereotype &&
    dataProduct.accessPointGroups.some((apg) =>
      apg.stereotypes.some(
        (sterootype) =>
          sterootype.value === publicStereotype.stereotype &&
          sterootype.profile === publicStereotype.profile,
      ),
    )
    ? 'True'
    : 'False';
};

export const getDataProductValue = (
  type: DATA_PRODUCT_DASHBOARD_HEADER,
  dataProduct: V1_DataProduct,
  applicationStore: LegendStudioApplicationStore | undefined,
): string | number | false => {
  switch (type) {
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TITLE:
      return dataProduct.title ?? false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DESCRIPTION:
      return dataProduct.description ?? false;
    // access point groups / access points
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER:
      return dataProduct.accessPointGroups.length;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_IDS:
      return dataProduct.accessPointGroups.map((apg) => apg.id).join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_TITLE:
      return dataProduct.accessPointGroups.map((apg) => apg.title).join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_DESCRIPTION:
      return dataProduct.accessPointGroups
        .map((apg) => apg.description)
        .join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER_OF_APS:
      return dataProduct.accessPointGroups
        .map((apg) => apg.accessPoints.length)
        .join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_REGIONS:
      return dataProduct.operationalMetadata?.coverageRegions?.length
        ? 'Y'
        : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DELIVERY_FREQUENCY:
      return dataProduct.operationalMetadata?.updateFrequency ?? false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ICON:
      return dataProduct.icon !== undefined ? 'Y' : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_SAMPLE_VALUES:
      return dataProduct.sampleValues?.length ? 'Y' : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_STEREOTYPES:
      return dataProduct.stereotypes.length
        ? dataProduct.stereotypes
            .map((s) => `${s.profile}.${s.value}`)
            .join(',')
        : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TAGGED_VALUES:
      return dataProduct.taggedValues.length
        ? dataProduct.taggedValues
            .map((s) => `${s.tag.profile}.${s.tag}.${s.value}`)
            .join(',')
        : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ENTERPRISE_GROUP:
      return getHasEnterpriseGroup(dataProduct, applicationStore);
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_MODEL_APG:
      return dataProduct.accessPointGroups.some(
        (apg) => apg instanceof V1_ModelAccessPointGroup,
      )
        ? 'Yes'
        : 'No';
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_MODEL_APG_FEATURED_ELEMENTS:
      return dataProduct.accessPointGroups.some(
        (apg) =>
          apg instanceof V1_ModelAccessPointGroup &&
          (apg.featuredElements?.length ?? 0) > 0,
      )
        ? 'Yes'
        : 'No';
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_NATIVE_APG:
      return dataProduct.nativeModelAccess !== undefined ? 'Yes' : 'No';
    default:
      throw new Error(
        `Unsupported data product dashboard header type: ${type}`,
      );
  }
};

export const getDataProductGridValue = (
  dataProduct: V1_DataProduct | undefined,
  header: DATA_PRODUCT_DASHBOARD_HEADER,
  applicationStore: LegendStudioApplicationStore | undefined,
): string | number | false | undefined => {
  if (!dataProduct) {
    return undefined;
  }
  return getDataProductValue(header, dataProduct, applicationStore);
};

// Requests in flight at once. Starting them all together makes the browser
// fail them with net::ERR_INSUFFICIENT_RESOURCES.
export const DEPOT_DASHBOARD_MAX_CONCURRENT_CALLS = 8;

/** Fetches the elements, at most `limit` at a time */
const fetchAtMost = async <T>(
  elements: T[],
  limit: number,
  fetchElement: (element: T) => Promise<void>,
): Promise<void> => {
  let next = 0;
  const fetchNext = async (): Promise<void> => {
    while (next < elements.length) {
      const element = elements[next] as T;
      next += 1;
      await fetchElement(element);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, elements.length) }, fetchNext),
  );
};

/**
 * One row: the element's content from Depot, its project, and the user's
 * access to that project. Fetched once; Refresh makes new rows.
 */
export abstract class DepotDashboardEntityState<C = unknown> {
  readonly store: DepotDashboardStore;
  readonly summary: StoredSummaryEntity;
  fetchingElementState = ActionState.create();
  content: C | undefined;
  projectId: string | undefined;
  projectAccess: DepotProjectAccess | undefined;

  constructor(summary: StoredSummaryEntity, store: DepotDashboardStore) {
    this.summary = summary;
    this.store = store;

    makeObservable(this, {
      content: observable,
      projectId: observable,
      projectAccess: observable,
      fetchingElementState: observable,
      fetchElement: flow,
      infoFetched: computed,
    });
  }

  /** Reads the element's content as Depot stores it */
  abstract readContent(content: PlainObject): C;

  /** Shows what the row fetched so far in its grid */
  abstract updateRow(): void;

  get infoFetched(): boolean {
    return this.content !== undefined && this.projectId !== undefined;
  }

  get id(): string {
    return `${generateGAVCoordinates(this.summary.groupId, this.summary.artifactId, this.summary.versionId)}:${this.summary.path}`;
  }

  get project(): string {
    return `${generateGAVCoordinates(this.summary.groupId, this.summary.artifactId, this.summary.versionId)}`;
  }

  get gaProject(): string {
    return `${generateGAVCoordinates(this.summary.groupId, this.summary.artifactId, undefined)}`;
  }

  get name(): string {
    return resolvePackagePathAndElementName(this.summary.path)[1];
  }

  get package(): string {
    return resolvePackagePathAndElementName(this.summary.path)[0];
  }

  *fetchElement(): GeneratorFn<void> {
    // a row is fetched once; Refresh makes new rows
    if (!this.fetchingElementState.isInInitialState) {
      return;
    }
    try {
      this.fetchingElementState.inProgress();
      const entity = (yield this.store.depotServerClient.getVersionEntity(
        this.summary.groupId,
        this.summary.artifactId,
        this.summary.versionId,
        this.summary.path,
      )) as Entity;
      const content = this.readContent(entity.content);
      this.projectId = (yield this.store.getProjectId(
        this.summary.groupId,
        this.summary.artifactId,
      )) as string;
      this.content = content;
      this.updateRow();
      this.projectAccess = (yield this.store.getProjectAccess(
        this.projectId,
      )) as DepotProjectAccess | undefined;
      this.updateRow();
      this.fetchingElementState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.fetchingElementState.fail();
    }
  }
}

// What one scope fetched, kept so that going back to the scope shows it
// without fetching it again
export class DepotDashboardScopeResults<T extends DepotDashboardEntityState> {
  readonly scope: DepotScope;
  readonly fetchingSummaryState = ActionState.create();
  summary: StoredSummaryEntity[] | undefined;
  // the rows on show: the summary less any workspace snapshots left out
  entityStates: T[] | undefined;
  private readonly entityStatesBySummary = new Map<StoredSummaryEntity, T>();

  constructor(scope: DepotScope) {
    this.scope = scope;
    makeObservable(this, {
      summary: observable,
      entityStates: observable,
      setSummary: action,
      showSummary: action,
    });
  }

  setSummary(summary: StoredSummaryEntity[]): void {
    this.summary = summary;
  }

  /** Rows shown again keep what they fetched */
  showSummary(
    include: (summary: StoredSummaryEntity) => boolean,
    createEntityState: (summary: StoredSummaryEntity) => T,
  ): void {
    this.entityStates = (this.summary ?? [])
      .filter(include)
      .map((summary) => {
        let entityState = this.entityStatesBySummary.get(summary);
        if (!entityState) {
          entityState = createEntityState(summary);
          this.entityStatesBySummary.set(summary, entityState);
        }
        return entityState;
      })
      .sort((a, b) => a.gaProject.localeCompare(b.gaProject));
  }
}

// One element type's rows. Each scope is fetched the first time it is shown;
// refresh() fetches the scope on show again.
abstract class DepotDashboardElementTypeState<
  T extends DepotDashboardEntityState,
> {
  readonly depotServerClient: DepotServerClient;
  readonly store: DepotDashboardStore;
  gridApi: GridApi | undefined;

  MAX_CALLS = 3000;
  scope: DepotScope;
  includeWorkspaceSnapshot = false;
  readonly results = new Map<DepotScope, DepotDashboardScopeResults<T>>();
  // stands for a scope not fetched yet
  private readonly notFetchedState = ActionState.create();
  private sortAndFilterTimer: ReturnType<typeof setTimeout> | undefined;

  abstract get classifierPath(): string;
  // e.g. 'data products', for the maximum calls warning
  abstract get elementTypeLabel(): string;
  abstract createEntityState(summary: StoredSummaryEntity): T;

  constructor(
    depotServerClient: DepotServerClient,
    store: DepotDashboardStore,
    scope?: DepotScope,
  ) {
    this.depotServerClient = depotServerClient;
    this.store = store;
    this.scope = scope ?? DepotScope.RELEASES;
    makeObservable(this, {
      scope: observable,
      includeWorkspaceSnapshot: observable,
      results: observable.shallow,
      gridApi: observable,
      currentResults: computed,
      fetchingSummaryState: computed,
      entitiesSummary: computed,
      entityStates: computed,
      isFetching: computed,
      fetchedCount: computed,
      totalCount: computed,
      fetchProgress: computed,
      hasMaxCallsWarning: computed,
      maxCallsWarningMessage: computed,
      setGridApi: action,
      setIncludeWorkspaceSnapshot: action,
      updateRow: action,
      handleScopeChange: flow,
      init: flow,
      refresh: flow,
      fetchEntities: flow,
    });
  }

  get currentResults(): DepotDashboardScopeResults<T> | undefined {
    return this.results.get(this.scope);
  }

  get fetchingSummaryState(): ActionState {
    return this.currentResults?.fetchingSummaryState ?? this.notFetchedState;
  }

  get entityStates(): T[] | undefined {
    return this.currentResults?.entityStates;
  }

  get entitiesSummary(): StoredSummaryEntity[] | undefined {
    return this.entityStates?.map((entityState) => entityState.summary);
  }

  /** While the scope on show is still being fetched */
  get isFetching(): boolean {
    return (
      this.fetchingSummaryState.isInProgress ||
      Boolean(
        this.entityStates
          ?.slice(0, this.MAX_CALLS)
          .some(
            (entityState) =>
              entityState.fetchingElementState.isInInitialState ||
              entityState.fetchingElementState.isInProgress,
          ),
      )
    );
  }

  get totalCount(): number {
    return this.entityStates?.length ?? 0;
  }

  get fetchedCount(): number {
    return (
      this.entityStates?.filter((entityState) => entityState.infoFetched)
        .length ?? 0
    );
  }

  get fetchProgress(): { fetched: number; total: number; percentage: number } {
    const total = this.totalCount;
    const fetched = this.fetchedCount;
    const percentage = total > 0 ? Math.round((fetched / total) * 100) : 0;
    return { fetched, total, percentage };
  }

  get hasMaxCallsWarning(): boolean {
    return this.totalCount > this.MAX_CALLS;
  }

  get maxCallsWarningMessage(): string {
    return `Maximum of ${this.MAX_CALLS} ${this.elementTypeLabel} fetched out of ${this.totalCount} available. This is to prevent hit on depot server.`;
  }

  setIncludeWorkspaceSnapshot(val: boolean): void {
    this.includeWorkspaceSnapshot = val;
  }

  setGridApi(gridApi: GridApi): void {
    this.gridApi = gridApi;
    // rows that finished loading before the grid was ready were not refreshed
    gridApi.refreshCells({ force: true });
  }

  updateRow(updatedEntity: T): void {
    const rowNode = this.gridApi?.getRowNode(updatedEntity.id);
    if (this.gridApi && rowNode) {
      this.gridApi.refreshCells({ rowNodes: [rowNode], force: true });
      this.reapplySortAndFilters();
    }
  }

  /**
   * The grid sorts and filters rows by the values they have when they arrive,
   * before they are fetched, e.g. after Refresh: as rows fill in, run the sort
   * and filters again, at most every quarter second.
   */
  private reapplySortAndFilters(): void {
    if (this.sortAndFilterTimer !== undefined) {
      return;
    }
    this.sortAndFilterTimer = setTimeout(() => {
      this.sortAndFilterTimer = undefined;
      if (this.gridApi && !this.gridApi.isDestroyed()) {
        this.gridApi.refreshClientSideRowModel('filter');
      }
    }, 250);
  }

  *handleScopeChange(scope: DepotScope): GeneratorFn<void> {
    if (this.scope !== scope) {
      this.scope = scope;
      yield flowResult(this.init()).catch((error) => {
        assertErrorThrown(error);
        this.store.applicationStore.notificationService.notifyError(error);
      });
    }
  }

  /** Shows the scope, fetching what has not been fetched for it yet */
  *init(): GeneratorFn<void> {
    const cached = this.currentResults;
    if (cached) {
      // still fetching its summary, or failed to: Refresh fetches it again
      if (cached.summary) {
        this.showSummary(cached);
        this.fetchEntitiesInBackground();
      }
      return;
    }
    // kept before the summary arrives, so switching back while it is being
    // fetched does not fetch it twice
    const results = new DepotDashboardScopeResults<T>(this.scope);
    this.results.set(results.scope, results);
    try {
      results.fetchingSummaryState.inProgress();
      const summary = (
        (yield this.depotServerClient.getEntitiesSummaryByClassifier(
          this.classifierPath,
          {
            summary: true,
            scope: results.scope,
          },
        )) as unknown as PlainObject<StoredSummaryEntity>[]
      ).map((storeEntity) =>
        StoredSummaryEntity.serialization.fromJson(storeEntity),
      );
      results.setSummary(summary);
      this.showSummary(results);
      results.fetchingSummaryState.complete();
      // a scope left before its summary arrived fetches its rows when shown
      if (results === this.results.get(this.scope)) {
        this.fetchEntitiesInBackground();
      }
    } catch (error) {
      assertErrorThrown(error);
      results.fetchingSummaryState.fail();
      this.store.applicationStore.notificationService.notifyError(error);
    }
  }

  /** Fetches the scope on show again */
  *refresh(): GeneratorFn<void> {
    this.results.delete(this.scope);
    // access may have changed too
    this.store.clearProjectAccesses();
    yield flowResult(this.init());
  }

  // TODO FIX for pagination flow, if needed
  *fetchEntities(): GeneratorFn<void> {
    const entityStates = guaranteeNonNullable(
      this.entityStates,
      `Entities summaries have not been fetched`,
    );
    // fetchElement() records its own failure on the row; rows fetched when
    // the scope was shown before are not fetched again
    yield fetchAtMost(
      entityStates
        .slice(0, this.MAX_CALLS)
        .filter(
          (entityState) => entityState.fetchingElementState.isInInitialState,
        ),
      DEPOT_DASHBOARD_MAX_CONCURRENT_CALLS,
      (entityState) => flowResult(entityState.fetchElement()),
    );
  }

  private fetchEntitiesInBackground(): void {
    flowResult(this.fetchEntities()).catch((error) => {
      assertErrorThrown(error);
      this.store.applicationStore.notificationService.notifyError(error);
    });
  }

  private showSummary(results: DepotDashboardScopeResults<T>): void {
    results.showSummary(
      (summary) =>
        results.scope !== DepotScope.SNAPSHOT ||
        this.includeWorkspaceSnapshot ||
        summary.versionId === MASTER_SNAPSHOT_ALIAS,
      (summary) => this.createEntityState(summary),
    );
  }
}

export class DataProductEntityState extends DepotDashboardEntityState<V1_DataProduct> {
  get dataProduct(): V1_DataProduct | undefined {
    return this.content;
  }

  readContent(content: PlainObject): V1_DataProduct {
    return deserialize(
      V1_dataProductModelSchema(
        this.store.graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
      ),
      content,
    );
  }

  updateRow(): void {
    this.store.dataProductDepotState.updateRow(this);
  }
}

export class DataProductDepotDashboardState extends DepotDashboardElementTypeState<DataProductEntityState> {
  get classifierPath(): string {
    return CORE_PURE_PATH.DATA_PRODUCT;
  }

  get elementTypeLabel(): string {
    return 'data products';
  }

  get fetchingProductsState(): ActionState {
    return this.fetchingSummaryState;
  }

  get dataProductEntitiesStates(): DataProductEntityState[] | undefined {
    return this.entityStates;
  }

  get entitiySummarryCount(): number | undefined {
    return this.entitiesSummary?.length;
  }

  createEntityState(summary: StoredSummaryEntity): DataProductEntityState {
    return new DataProductEntityState(summary, this.store);
  }
}

export class GenerationSpecificationEntityState extends DepotDashboardEntityState<DepotGenerationSpecification> {
  get generationSpecification(): DepotGenerationSpecification | undefined {
    return this.content;
  }

  /** Whoever can create a workspace in the project sees Flatten */
  get canFlatten(): boolean {
    return Boolean(
      this.projectAccess?.actions.includes(
        AuthorizableProjectAction.CREATE_WORKSPACE,
      ),
    );
  }

  /** The review Flatten opened for this specification in this page, if any */
  get flattenReview(): Review | undefined {
    return this.store.getFlattenReview(this.projectId, this.summary.path);
  }

  /** Only a specification with more than one stage has stages to flatten */
  get hasStagesToFlatten(): boolean {
    return (this.generationSpecification?.stageCount ?? 0) > 1;
  }

  readContent(content: PlainObject): DepotGenerationSpecification {
    return DepotGenerationSpecification.serialization.fromJson(content);
  }

  updateRow(): void {
    this.store.generationSpecificationDepotState.updateRow(this);
  }
}

export class GenerationSpecificationDepotDashboardState extends DepotDashboardElementTypeState<GenerationSpecificationEntityState> {
  // the flatten modal on show
  flattenState: DepotGenerationSpecificationFlattenState | undefined;

  constructor(
    depotServerClient: DepotServerClient,
    store: DepotDashboardStore,
    scope?: DepotScope,
  ) {
    super(depotServerClient, store, scope);
    makeObservable(this, {
      flattenState: observable,
      openFlatten: action,
      closeFlatten: action,
    });
  }

  openFlatten(entityState: GenerationSpecificationEntityState): void {
    this.flattenState = new DepotGenerationSpecificationFlattenState(
      this.store,
      entityState,
    );
    flowResult(this.flattenState.prepare()).catch(
      this.store.applicationStore.alertUnhandledError,
    );
  }

  closeFlatten(): void {
    if (this.flattenState?.canClose) {
      this.flattenState = undefined;
    }
  }

  get classifierPath(): string {
    return CORE_PURE_PATH.GENERATION_SPECIFICATION;
  }

  get elementTypeLabel(): string {
    return 'generation specifications';
  }

  createEntityState(
    summary: StoredSummaryEntity,
  ): GenerationSpecificationEntityState {
    return new GenerationSpecificationEntityState(summary, this.store);
  }
}

export class DataSpaceEntityState extends DepotDashboardEntityState<DepotDataSpace> {
  get dataSpace(): DepotDataSpace | undefined {
    return this.content;
  }

  readContent(content: PlainObject): DepotDataSpace {
    return DepotDataSpace.fromContent(content);
  }

  updateRow(): void {
    this.store.dataSpaceDepotState.updateRow(this);
  }
}

export class DataSpaceDepotDashboardState extends DepotDashboardElementTypeState<DataSpaceEntityState> {
  get classifierPath(): string {
    return DEPOT_DATA_SPACE_CLASSIFIER_PATH;
  }

  get elementTypeLabel(): string {
    return 'data spaces';
  }

  createEntityState(summary: StoredSummaryEntity): DataSpaceEntityState {
    return new DataSpaceEntityState(summary, this.store);
  }
}

export class DepotDashboardStore {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly sdlcServerClient: SDLCServerClient | undefined;
  readonly graphManagerState: BasicGraphManagerState;
  dataProductDepotState: DataProductDepotDashboardState;
  dataSpaceDepotState: DataSpaceDepotDashboardState;
  generationSpecificationDepotState: GenerationSpecificationDepotDashboardState;
  elementType = DEPOT_DASHBOARD_ELEMENT_TYPE.DATA_PRODUCT;
  // The reviews Flatten opened in this page, by project and element path: kept
  // through Refresh and switching tabs, until the page reloads
  private readonly flattenReviews = new Map<string, Review>();
  // One project lookup per project, shared by its elements of every type
  private readonly projectIds = new Map<string, Promise<string>>();
  // One SDLC access lookup per project
  private readonly projectAccesses = new Map<
    string,
    Promise<DepotProjectAccess | undefined>
  >();

  constructor(
    applicationStore: LegendStudioApplicationStore,
    depotServerClient: DepotServerClient,
    sdlcServerClient?: SDLCServerClient,
    elementType?: DEPOT_DASHBOARD_ELEMENT_TYPE,
    // the scope a shared address opens with, for every element type
    scope?: DepotScope,
  ) {
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.sdlcServerClient = sdlcServerClient;
    this.elementType = elementType ?? DEPOT_DASHBOARD_ELEMENT_TYPE.DATA_PRODUCT;
    this.graphManagerState = new BasicGraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.dataProductDepotState = new DataProductDepotDashboardState(
      this.depotServerClient,
      this,
      scope,
    );
    this.dataSpaceDepotState = new DataSpaceDepotDashboardState(
      this.depotServerClient,
      this,
      scope,
    );
    this.generationSpecificationDepotState =
      new GenerationSpecificationDepotDashboardState(
        this.depotServerClient,
        this,
        scope,
      );
    makeObservable(this, {
      dataProductDepotState: observable,
      dataSpaceDepotState: observable,
      generationSpecificationDepotState: observable,
      elementType: observable,
      setElementType: action,
      recordFlattenReview: action,
    });
  }

  setElementType(elementType: DEPOT_DASHBOARD_ELEMENT_TYPE): void {
    this.elementType = elementType;
  }

  recordFlattenReview(projectId: string, path: string, review: Review): void {
    this.flattenReviews.set(`${projectId}/${path}`, review);
  }

  getFlattenReview(
    projectId: string | undefined,
    path: string,
  ): Review | undefined {
    return projectId === undefined
      ? undefined
      : this.flattenReviews.get(`${projectId}/${path}`);
  }

  getDepotState(
    elementType: DEPOT_DASHBOARD_ELEMENT_TYPE,
  ):
    | DataProductDepotDashboardState
    | DataSpaceDepotDashboardState
    | GenerationSpecificationDepotDashboardState {
    switch (elementType) {
      case DEPOT_DASHBOARD_ELEMENT_TYPE.DATA_SPACE:
        return this.dataSpaceDepotState;
      case DEPOT_DASHBOARD_ELEMENT_TYPE.GENERATION_SPECIFICATION:
        return this.generationSpecificationDepotState;
      default:
        return this.dataProductDepotState;
    }
  }

  clearProjectAccesses(): void {
    this.projectAccesses.clear();
  }

  getProjectId(groupId: string, artifactId: string): Promise<string> {
    const key = generateGAVCoordinates(groupId, artifactId, undefined);
    let projectId = this.projectIds.get(key);
    if (!projectId) {
      projectId = this.depotServerClient
        .getProject(groupId, artifactId)
        .then((project) => (project as unknown as StoreProjectData).projectId);
      // a failed lookup is retried by the next element of that project
      projectId.catch(() => this.projectIds.delete(key));
      this.projectIds.set(key, projectId);
    }
    return projectId;
  }

  /**
   * The signed-in user's role and allowed actions on the project. Never
   * rejects: a project SDLC can't answer for comes back as unavailable.
   */
  getProjectAccess(
    projectId: string | undefined,
  ): Promise<DepotProjectAccess | undefined> {
    const sdlcServerClient = this.sdlcServerClient;
    if (!sdlcServerClient || !projectId) {
      return Promise.resolve(undefined);
    }
    let access = this.projectAccesses.get(projectId);
    if (!access) {
      access = Promise.allSettled([
        sdlcServerClient.getAccessRole(projectId),
        sdlcServerClient.getAutorizedActions(projectId),
      ]).then(([role, actions]) => {
        if (role.status === 'rejected' && actions.status === 'rejected') {
          return new DepotProjectAccess(undefined, [], true);
        }
        return new DepotProjectAccess(
          // no role (an empty answer) when the user isn't a member
          role.status === 'fulfilled' && isObject(role.value)
            ? ProjectAccessRole.serialization.fromJson(role.value).accessRole
            : undefined,
          actions.status === 'fulfilled' && Array.isArray(actions.value)
            ? actions.value
            : [],
          false,
        );
      });
      this.projectAccesses.set(projectId, access);
    }
    return access;
  }
}
