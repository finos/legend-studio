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

import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
  ActionState,
  assertNonEmptyString,
  isNonNullable,
} from '@finos/legend-shared';
import {
  makeObservable,
  action,
  observable,
  flow,
  computed,
  flowResult,
} from 'mobx';
import type { EditorStore } from '../editor/EditorStore.js';
import { ACTIVITY_MODE } from '../editor/EditorConfig.js';
import {
  EntityDiff,
  type ProjectConfiguration,
  Comparison,
  reprocessEntityDiffs,
  Project,
  Review,
  type Patch,
  ReviewApproval,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import type { Entity } from '@finos/legend-storage';
import { EntityDiffViewState } from '../editor/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { SPECIAL_REVISION_ALIAS } from '../editor/editor-state/entity-diff-editor-state/EntityDiffEditorState.js';

export class ProjectReviewReport {
  diffs: EntityDiff[];
  fromEntities: Entity[] = [];
  toEntities: Entity[] = [];
  private fromConfig: PlainObject<ProjectConfiguration> | undefined;
  private toConfig: PlainObject<ProjectConfiguration> | undefined;
  fromToProjectConfig:
    | [PlainObject<ProjectConfiguration>, PlainObject<ProjectConfiguration>]
    | undefined;

  constructor(diffs: EntityDiff[]) {
    this.diffs = diffs;

    makeObservable(this, {
      fromEntities: observable,
      toEntities: observable,
      fromToProjectConfig: observable,
      addFromConfig: action,
      addToConfig: action,
    });
  }

  addFromConfig(config: PlainObject<ProjectConfiguration>): void {
    this.fromConfig = config;
    this.createFromToConfigIfPossible();
  }

  addToConfig(config: PlainObject<ProjectConfiguration>): void {
    this.toConfig = config;
    this.createFromToConfigIfPossible();
  }

  private createFromToConfigIfPossible(): void {
    if (this.fromConfig && this.toConfig) {
      this.fromToProjectConfig = [this.fromConfig, this.toConfig];
    }
  }

  findFromEntity(entityPath: string): Entity | undefined {
    return this.fromEntities.find((e) => e.path === entityPath);
  }

  addFromEntity(entity: Entity): ProjectReviewReport {
    this.fromEntities.push(entity);
    return this;
  }

  addToEntity(entity: Entity): ProjectReviewReport {
    this.toEntities.push(entity);
    return this;
  }

  findToEntity(entityPath: string): Entity | undefined {
    return this.toEntities.find((e) => e.path === entityPath);
  }
}

export class ProjectReviewerStore {
  readonly editorStore: EditorStore;

  currentProjectId?: string | undefined;
  currentProject?: Project | undefined;
  currentPatch?: Patch | undefined;
  currentReviewId?: string | undefined;
  currentReview?: Review | undefined;
  // comparison
  buildReviewReportState = ActionState.create();
  reviewReport?: ProjectReviewReport | undefined;

  fetchCurrentReviewState = ActionState.create();
  approveState = ActionState.create();
  reviewApproval: ReviewApproval | undefined;

  closeState = ActionState.create();
  commitState = ActionState.create();
  reOpenState = ActionState.create();

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      currentProjectId: observable,
      currentProject: observable,
      currentPatch: observable,
      currentReviewId: observable,
      currentReview: observable,
      fetchCurrentReviewState: observable,
      buildReviewReportState: observable,
      approveState: observable,
      closeState: observable,
      commitState: observable,
      reOpenState: observable,
      reviewReport: observable,
      reviewApproval: observable,
      projectId: computed,
      patchReleaseVersionId: computed,
      reviewId: computed,
      review: computed,
      setProjectIdAndReviewId: action,
      refresh: action,
      initializeEngine: flow,
      fetchReviewComparison: flow,
      fetchProject: flow,
      fetchReviewApprovals: flow,
      fetchReview: flow,
      approveReview: flow,
      commitReview: flow,
      reOpenReview: flow,
      closeReview: flow,
    });

    this.editorStore = editorStore;
    this.editorStore.activeActivity = ACTIVITY_MODE.REVIEW;
  }

  get projectId(): string {
    return guaranteeNonNullable(this.currentProjectId, 'Project ID must exist');
  }

  get patchReleaseVersionId(): string | undefined {
    return this.currentPatch?.patchReleaseVersionId.id;
  }

  get reviewId(): string {
    return guaranteeNonNullable(this.currentReviewId, 'Review ID must exist');
  }

  get review(): Review {
    return guaranteeNonNullable(this.currentReview, 'Review must exist');
  }

  get approvalString(): string | undefined {
    const approvals = this.reviewApproval?.approvedBy;
    if (approvals?.length) {
      return `Approved by ${approvals.map((e) => e.name).join(',')}.`;
    }
    return undefined;
  }

  setProjectIdAndReviewId(projectId: string, reviewId: string): void {
    this.currentProjectId = projectId;
    this.currentReviewId = reviewId;
  }

  initialize(): void {
    flowResult(this.initializeEngine()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    flowResult(this.fetchReview()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    flowResult(this.fetchProject()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    flowResult(this.fetchReviewApprovals()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    flowResult(this.fetchReviewComparison()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
  }

  *initializeEngine(): GeneratorFn<void> {
    try {
      // setup engine used for to/from grammar transfomation
      yield this.editorStore.graphManagerState.graphManager.initialize(
        {
          env: this.editorStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
            queryBaseUrl:
              this.editorStore.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.editorStore.applicationStore.tracerService,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  openReviewChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath ? this.reviewReport?.findFromEntity(entityPath) : undefined;
    const toEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath ? this.reviewReport?.findToEntity(entityPath) : undefined;
    const fromEntity = EntityDiff.shouldOldEntityExist(diff)
      ? guaranteeNonNullable(
          fromEntityGetter(diff.getValidatedOldPath()),
          `Can't find entity with path  '${diff.oldPath}'`,
        )
      : undefined;
    const toEntity = EntityDiff.shouldNewEntityExist(diff)
      ? guaranteeNonNullable(
          toEntityGetter(diff.getValidatedNewPath()),
          `Can't find entity with path  '${diff.newPath}'`,
        )
      : undefined;
    const diffState = new EntityDiffViewState(
      this.editorStore,
      SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
      SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
      diff.oldPath,
      diff.newPath,
      fromEntity,
      toEntity,
      fromEntityGetter,
      toEntityGetter,
    );

    this.editorStore.tabManagerState.openTab(
      this.editorStore.tabManagerState.tabs.find((t) => t.match(diffState)) ??
        diffState,
    );
  }

  refresh(): void {
    this.editorStore.tabManagerState.closeAllTabs();
    this.reviewReport = undefined;
    flowResult(this.fetchReviewComparison()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
  }

  /**
   * To save load time, this function will levergae the reviewId coming from the URl and doesn't
   * assume the review has completed been fetched
   */
  *fetchReviewComparison(): GeneratorFn<void> {
    this.buildReviewReportState.inProgress();
    try {
      const comparison = Comparison.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getReviewComparision(
          this.projectId,
          this.patchReleaseVersionId,
          this.reviewId,
        )) as PlainObject<Comparison>,
      );
      const report = new ProjectReviewReport(
        reprocessEntityDiffs(comparison.entityDiffs),
      );
      this.reviewReport = report;
      const fromToRequests = Promise.all([
        ...report.diffs
          .map((diff) => diff.oldPath)
          .filter(isNonNullable)
          .map((fromDiff) =>
            this.editorStore.sdlcServerClient
              .getReviewFromEntity(
                this.projectId,
                this.patchReleaseVersionId,
                this.reviewId,
                fromDiff,
              )
              .then((fromEntity: Entity) => report.addFromEntity(fromEntity)),
          ),
        ...report.diffs
          .map((diff) => diff.newPath)
          .filter(isNonNullable)
          .map((toDiff) =>
            this.editorStore.sdlcServerClient
              .getReviewToEntity(
                this.projectId,
                this.patchReleaseVersionId,
                this.reviewId,
                toDiff,
              )
              .then((toEntity: Entity) => report.addToEntity(toEntity)),
          ),
      ]);
      if (comparison.projectConfigurationUpdated) {
        yield Promise.all([
          this.editorStore.sdlcServerClient
            .getReviewFromConfiguration(
              this.projectId,
              this.patchReleaseVersionId,
              this.reviewId,
            )
            .then((config) => report.addFromConfig(config)),
          this.editorStore.sdlcServerClient
            .getReviewToConfiguration(
              this.projectId,
              this.patchReleaseVersionId,
              this.reviewId,
            )
            .then((config) => report.addToConfig(config)),
        ]);
      }
      yield fromToRequests;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.buildReviewReportState.complete();
    }
  }

  *fetchProject(): GeneratorFn<void> {
    try {
      this.currentProject = Project.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getProject(
          this.projectId,
        )) as PlainObject<Project>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *fetchReviewApprovals(): GeneratorFn<void> {
    try {
      this.reviewApproval = ReviewApproval.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getReviewApprovals(
          this.projectId,
          this.patchReleaseVersionId,
          this.reviewId,
        )) as PlainObject<ReviewApproval>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
    }
  }

  *fetchReview(): GeneratorFn<void> {
    try {
      // TODO: can we assume review also an integer ?
      assertNonEmptyString(
        this.currentReviewId,
        'Review ID provided must be a valid non empty string',
      );
      this.fetchCurrentReviewState.inProgress();
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.reviewId,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.fetchCurrentReviewState.complete();
    }
  }

  *approveReview(): GeneratorFn<void> {
    this.approveState.inProgress();
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.approveReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.approveState.complete();
    }
  }

  *commitReview(): GeneratorFn<void> {
    this.commitState.inProgress();
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.commitReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
          { message: `${this.review.title} [review]` },
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.commitState.complete();
    }
  }

  *reOpenReview(): GeneratorFn<void> {
    this.reOpenState.inProgress();
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.reopenReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.reOpenState.complete();
    }
  }

  *closeReview(): GeneratorFn<void> {
    this.closeState.inProgress();
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.closeReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.closeState.complete();
    }
  }
}
