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
  type V1_AccessPoint,
  type V1_DataProductArtifact,
  type V1_EntitlementsDataProductDetails,
  LakehouseTargetEnv,
  V1_LakehouseAccessPoint,
  V1_RelationElement,
  V1_RelationType,
  V1_RenderStyle,
  V1_serializeRawValueSpecification,
  V1_ExecuteInput,
  V1_deserializeExecutionResult,
  V1_buildExecutionResult,
  V1_RelationRowTestData,
  V1_deserializeValueSpecification,
  V1_Variable,
  type V1_ExecutionResult,
  type V1_RawLambda,
  type TDSExecutionResult,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  filterByType,
  guaranteeNonNullable,
  isEmpty,
  LogEvent,
} from '@finos/legend-shared';
import { makeAutoObservable, observable, computed, flow } from 'mobx';
import type { DataProductAPGState } from './DataProductAPGState.js';
import { createExecuteInput } from '../../utils/QueryExecutionUtils.js';
import { RegistryMetadataResponse } from '@finos/legend-server-marketplace';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { generateAnchorForAccessPoint } from '../ProductViewerNavigation.js';
import {
  type AccessPointDefinitionFlow_TelemetryData,
  DataProductTelemetryHelper,
} from '../../__lib__/DataProductTelemetryHelper.js';
import {
  type DataProductDefinitionFlow,
  type DataProductDefinitionFlowEntry,
  DataProductDefinitionFlowFailureKind,
} from './DataProductDefinitionFlow.js';

const getUnsupportedLakehouseTargetEnvs = (): LakehouseTargetEnv[] =>
  Object.values(LakehouseTargetEnv).filter(
    (targetEnv) => targetEnv !== LakehouseTargetEnv.Snowflake,
  );

const isAccessPointTargetEnvSupported = (targetEnvironment: string): boolean =>
  !(getUnsupportedLakehouseTargetEnvs() as string[]).includes(
    targetEnvironment,
  );

export class DataProductAccessPointState {
  readonly apgState: DataProductAPGState;
  readonly accessPoint: V1_AccessPoint;
  relationType: V1_RelationType | undefined;
  relationElement: V1_RelationElement | undefined;
  grammar: string | undefined;
  /** Its definition, as Legend Cube's flow shows it, once read (`readDefinitionFlow`) */
  definitionFlow: DataProductDefinitionFlow | undefined;

  readonly fetchingRelationTypeState = ActionState.create();
  readonly fetchingGrammarState = ActionState.create();
  readonly readingDefinitionFlowState = ActionState.create();
  readonly fetchingSampleDataState = ActionState.create();
  readonly fetchingRegistryMetadataState = ActionState.create();

  registryMetadata: RegistryMetadataResponse | undefined;

  constructor(apgState: DataProductAPGState, accessPoint: V1_AccessPoint) {
    makeAutoObservable(this, {
      relationType: observable,
      grammar: observable,
      relationElement: observable,
      // the reading's steps and Cube's code, as Cube made them
      definitionFlow: observable.ref,
      readDefinitionFlow: flow,
      isCollapsed: computed,
      entitlementsDataProductDetails: computed,
      unsupportedLakehouseComputeTarget: computed,
      isParameterized: computed,
      parameters: computed,
      hasSampleValues: computed,
    });

    this.apgState = apgState;
    this.accessPoint = accessPoint;
  }

  get anchor(): string {
    return generateAnchorForAccessPoint(
      this.apgState.apg.id,
      this.accessPoint.id,
    );
  }

  get isCollapsed(): boolean {
    return this.apgState.dataProductViewerState.layoutState.sectionCollapseState.isSectionCollapsed(
      this.anchor,
    );
  }

  setIsCollapsed(val: boolean): void {
    this.apgState.dataProductViewerState.layoutState.sectionCollapseState.setSectionsCollapsed(
      this.anchor,
      val,
    );
  }

  get entitlementsDataProductDetails():
    | V1_EntitlementsDataProductDetails
    | undefined {
    return this.apgState.dataProductViewerState.entitlementsDataProductDetails;
  }

  get unsupportedLakehouseComputeTarget(): string | undefined {
    if (
      this.accessPoint instanceof V1_LakehouseAccessPoint &&
      this.accessPoint.targetEnvironment &&
      !isAccessPointTargetEnvSupported(this.accessPoint.targetEnvironment)
    ) {
      return this.accessPoint.targetEnvironment;
    }
    return undefined;
  }

  get isParameterized(): boolean {
    return (
      this.accessPoint instanceof V1_LakehouseAccessPoint &&
      Array.isArray(this.accessPoint.func.parameters) &&
      this.accessPoint.func.parameters.length > 0
    );
  }

  /** Whether the sample data has a value for any column */
  get hasSampleValues(): boolean {
    return Boolean(
      this.relationElement?.rows.some((row) =>
        row.values.some((value) => !isEmpty(value)),
      ),
    );
  }

  /** The parameters of a Lakehouse access point's function, in order */
  get parameters(): V1_Variable[] {
    if (
      !(this.accessPoint instanceof V1_LakehouseAccessPoint) ||
      !Array.isArray(this.accessPoint.func.parameters)
    ) {
      return [];
    }
    return (this.accessPoint.func.parameters as PlainObject[])
      .map((parameter) => V1_deserializeValueSpecification(parameter, []))
      .filter(filterByType(V1_Variable));
  }

  async fetchRegistryMetadata(): Promise<void> {
    if (!this.fetchingRegistryMetadataState.isInInitialState) {
      return;
    }
    this.fetchingRegistryMetadataState.inProgress();
    const dataProductName =
      this.apgState.dataProductViewerState.product.name.toUpperCase();
    const apName = this.accessPoint.id.toUpperCase();
    const uri = `lakeHouse|v1|${dataProductName}|${apName}`;
    try {
      const rawMetadata =
        (await this.apgState.dataProductViewerState.registryServerClient?.getRegistrationMetadata(
          uri,
        )) as PlainObject<RegistryMetadataResponse>;
      const metadata: RegistryMetadataResponse =
        RegistryMetadataResponse.serialization.fromJson(rawMetadata);
      this.registryMetadata = metadata;
    } catch (error) {
      assertErrorThrown(error);
      this.apgState.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        error,
      );
    } finally {
      this.fetchingRegistryMetadataState.complete();
    }
  }

  async fetchRelationTypeFromArtifact(
    dataProductArtifactPromise: Promise<V1_DataProductArtifact | undefined>,
  ): Promise<V1_RelationType | undefined> {
    const artifact = await dataProductArtifactPromise;
    const relationType = artifact?.accessPointGroups
      .find((apg) => apg.id === this.apgState.apg.id)
      ?.accessPointImplementations.find((ap) => ap.id === this.accessPoint.id)
      ?.lambdaGenericType?.typeArguments.map((typeArg) => typeArg.rawType)
      .filter((rawType) => rawType instanceof V1_RelationType)[0];
    if (relationType !== undefined) {
      return relationType;
    } else {
      throw new Error(
        `Data product artifact is missing relation type for access point: ${this.accessPoint.id}`,
      );
    }
  }

  /**
   * Rejects when the engine has no relation type for this Lakehouse access
   * point, so that `Promise.any` in `fetchRelationType` falls back to the
   * artifact instead of taking an empty answer.
   */
  async fetchRelationTypeFromEngine(): Promise<V1_RelationType | undefined> {
    if (this.accessPoint instanceof V1_LakehouseAccessPoint) {
      const viewerState = this.apgState.dataProductViewerState;
      const key = `${this.apgState.apg.id}::${this.accessPoint.id}`;
      const { results, errors } = await viewerState.batchRelationTypePromise;
      const relationType = results.get(key);
      if (relationType) {
        return relationType;
      }
      const engineError = errors?.get(key);
      if (engineError) {
        throw new Error(engineError.message);
      }
      throw (
        viewerState.batchRelationTypeError ??
        new Error(
          `Engine returned no relation type for access point: ${this.accessPoint.id}`,
        )
      );
    }
    // NOTE: the engine is not asked for non-Lakehouse access points
    return undefined;
  }

  async fetchRelationType(
    dataProductArtifactPromise:
      | Promise<V1_DataProductArtifact | undefined>
      | undefined,
  ): Promise<void> {
    if (!this.fetchingRelationTypeState.isInInitialState) {
      return;
    }
    this.fetchingRelationTypeState.inProgress();
    const engineRelationTypePromise = this.fetchRelationTypeFromEngine();
    const relationTypePromises = [
      ...(dataProductArtifactPromise
        ? [this.fetchRelationTypeFromArtifact(dataProductArtifactPromise)]
        : []),
      engineRelationTypePromise,
    ];
    try {
      const relationType = await Promise.any(relationTypePromises);
      this.relationType = relationType;
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof AggregateError) {
        // Show the engine error, since it explains why the access point has
        // no relation type; `AggregateError.errors` follows the input order
        const engineError: unknown =
          error.errors[relationTypePromises.indexOf(engineRelationTypePromise)];
        this.apgState.applicationStore.notificationService.notifyError(
          `Error fetching access point relation type: ${
            engineError instanceof Error ? engineError.message : error.message
          }`,
        );
      } else {
        this.apgState.applicationStore.notificationService.notifyError(
          `Error fetching access point relation type: ${error.message}`,
        );
      }
    } finally {
      this.fetchingRelationTypeState.complete();
    }
  }

  async fetchGrammar(): Promise<void> {
    if (!this.fetchingGrammarState.isInInitialState) {
      return;
    }
    this.fetchingGrammarState.inProgress();
    try {
      if (this.accessPoint instanceof V1_LakehouseAccessPoint) {
        const grammar =
          await this.apgState.dataProductViewerState.engineServerClient.JSONToGrammar_lambda(
            V1_serializeRawValueSpecification(this.accessPoint.func),
            V1_RenderStyle.PRETTY,
          );
        this.grammar = grammar;
      }
    } catch (error) {
      assertErrorThrown(error);
      this.apgState.applicationStore.notificationService.notifyError(
        `Error fetching access point grammar: ${error.message}`,
      );
    } finally {
      this.fetchingGrammarState.complete();
    }
  }

  /**
   * A Lakehouse access point's function, as the engine renders it to Pure
   * (protocol JSON); `undefined` when it has none
   */
  get definitionLambda(): PlainObject | undefined {
    if (!(this.accessPoint instanceof V1_LakehouseAccessPoint)) {
      return undefined;
    }
    // NOTE: the function may be missing from a data product's JSON
    const func = this.accessPoint.func as V1_RawLambda | undefined;
    return func?.body === undefined
      ? undefined
      : V1_serializeRawValueSpecification(func);
  }

  private get definitionFlowTelemetryData(): AccessPointDefinitionFlow_TelemetryData {
    const viewerState = this.apgState.dataProductViewerState;
    const projectGAV = viewerState.projectGAV;
    return {
      dataProduct: viewerState.product.path,
      accessPointGroup: this.apgState.apg.id,
      accessPoint: this.accessPoint.id,
      origin: projectGAV
        ? {
            groupId: projectGAV.groupId,
            artifactId: projectGAV.artifactId,
            versionId: projectGAV.versionId,
          }
        : undefined,
    };
  }

  /**
   * Reads a Lakehouse access point's definition, once, into the steps of
   * Legend Cube's flow, in the browser: it loads Cube's code, then the ingest
   * definitions the function reads, which type the columns of its data sets.
   * Cube reads all of a definition or none of it: what it can't read yet is
   * refused, and shows as Pure.
   */
  *readDefinitionFlow(): GeneratorFn<void> {
    if (
      !(this.accessPoint instanceof V1_LakehouseAccessPoint) ||
      !this.readingDefinitionFlowState.isInInitialState
    ) {
      return;
    }
    this.readingDefinitionFlowState.inProgress();
    const startedAt = Date.now();
    try {
      const lambda = this.definitionLambda;
      if (lambda === undefined) {
        this.failDefinitionFlow(
          DataProductDefinitionFlowFailureKind.MISSING,
          new Error(`Access point '${this.accessPoint.id}' has no function`),
        );
        return;
      }
      let entry: DataProductDefinitionFlowEntry;
      try {
        entry =
          (yield this.apgState.dataProductViewerState.loadDefinitionFlowEntry()) as DataProductDefinitionFlowEntry;
      } catch (error) {
        assertErrorThrown(error);
        this.failDefinitionFlow(
          DataProductDefinitionFlowFailureKind.LOAD,
          error,
        );
        return;
      }
      const ingestDefinitions = (yield this.loadIngestDefinitions(
        entry.findCubeDefinitionIngestDefinitions(lambda),
      )) as Map<string, PlainObject>;
      const reading = entry.readCubeDefinition(lambda, {
        getIngestDefinition: (path) => ingestDefinitions.get(path),
      });
      const telemetryService = this.apgState.applicationStore.telemetryService;
      if (reading.kind === 'flow') {
        this.definitionFlow = { kind: 'flow', reading, entry };
        DataProductTelemetryHelper.logEvent_ShowAccessPointDefinitionFlow(
          telemetryService,
          this.definitionFlowTelemetryData,
          {
            steps: reading.steps.length,
            unknownDataSets: reading.unknownDataSets.map(
              (each) => `${each.ingestDefinition}.${each.dataSet}`,
            ),
            durationMs: Date.now() - startedAt,
          },
        );
      } else {
        this.definitionFlow = { kind: 'refused', refusal: reading };
        DataProductTelemetryHelper.logEvent_RefuseAccessPointDefinitionFlow(
          telemetryService,
          this.definitionFlowTelemetryData,
          { reason: reading.reason, functionName: reading.functionName },
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.failDefinitionFlow(DataProductDefinitionFlowFailureKind.READ, error);
    } finally {
      this.readingDefinitionFlowState.complete();
    }
  }

  /**
   * The content of the ingest definitions the host gives, by path: one it
   * doesn't have, or fails to load, is left out, and its data sets are drawn
   * by name
   */
  private async loadIngestDefinitions(
    paths: string[],
  ): Promise<Map<string, PlainObject>> {
    const contents = new Map<string, PlainObject>();
    const load = this.apgState.dataProductViewerState.loadIngestDefinition;
    if (!load) {
      return contents;
    }
    const loaded = await Promise.allSettled(paths.map((path) => load(path)));
    loaded.forEach((result, index) => {
      const path = guaranteeNonNullable(paths[index]);
      if (result.status === 'rejected') {
        this.apgState.applicationStore.logService.warn(
          LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
          `Unable to load ingest definition '${path}' for the flow of access point '${this.accessPoint.id}': ${
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          }`,
        );
      } else if (result.value) {
        contents.set(path, result.value);
      }
    });
    return contents;
  }

  private failDefinitionFlow(
    failure: DataProductDefinitionFlowFailureKind,
    error: Error,
  ): void {
    this.definitionFlow = { kind: 'failed', failure, error };
    this.logDefinitionFlowFailure(failure, error);
  }

  /**
   * Logs a flow that couldn't be shown, though Cube didn't refuse the
   * definition: e.g. its canvas failed while drawing it
   */
  logDefinitionFlowFailure(
    failure: DataProductDefinitionFlowFailureKind,
    error: Error,
  ): void {
    this.apgState.applicationStore.logService.error(
      LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
      `Unable to show the flow of access point '${this.accessPoint.id}' (${failure}): ${error.message}`,
    );
    DataProductTelemetryHelper.logEvent_FailAccessPointDefinitionFlow(
      this.apgState.applicationStore.telemetryService,
      this.definitionFlowTelemetryData,
      { kind: failure, error: error.message },
    );
  }

  /** Forgets its definition's flow, to read it again */
  resetDefinitionFlow(): void {
    this.definitionFlow = undefined;
    this.readingDefinitionFlowState.reset();
  }

  /** Forgets its definition's Pure, to fetch it again */
  resetGrammar(): void {
    this.grammar = undefined;
    this.fetchingGrammarState.reset();
  }

  async fetchSampleDataFromArtifact(
    dataProductArtifactPromise: Promise<V1_DataProductArtifact | undefined>,
  ): Promise<V1_RelationElement | undefined> {
    const artifact = await dataProductArtifactPromise;
    const relationElement = artifact?.accessPointGroups
      .find((apg) => apg.id === this.apgState.apg.id)
      ?.accessPointImplementations.find(
        (ap) => ap.id === this.accessPoint.id,
      )?.relationElement;
    if (relationElement !== undefined) {
      return relationElement;
    } else {
      throw new Error(
        `Data product artifact is missing sample data for access point: ${this.accessPoint.id}`,
      );
    }
  }

  async fetchSampleDataFromEngine(
    resolvedUserEnv: string,
  ): Promise<V1_RelationElement> {
    if (this.accessPoint instanceof V1_LakehouseAccessPoint) {
      const query = `#P{${this.apgState.dataProductViewerState.product.path}.${this.accessPoint.id}}#->take(200)`;
      const executionInput = await createExecuteInput(
        resolvedUserEnv,
        query,
        this.apgState.dataProductViewerState,
        guaranteeNonNullable(this.entitlementsDataProductDetails),
      );
      const result = V1_buildExecutionResult(
        V1_deserializeExecutionResult(
          (await this.apgState.dataProductViewerState.engineServerClient.runQuery(
            V1_ExecuteInput.serialization.toJson(executionInput),
          )) as PlainObject<V1_ExecutionResult>,
        ),
      ) as TDSExecutionResult;

      const MAX_DISTINCT = 5;

      const columns = result.builder.columns.map((c) => c.name);
      const valuesPerColumn = columns.map(() => new Set<string>());

      for (const row of result.result.rows) {
        row.values.forEach((v, i) => {
          const set = valuesPerColumn[i];
          if (set && set.size < MAX_DISTINCT) {
            set.add(String(v));
          }
        });

        if (valuesPerColumn.every((s) => s.size >= MAX_DISTINCT)) {
          break;
        }
      }

      const relEle = new V1_RelationElement();
      relEle.paths = [this.accessPoint.id];
      relEle.columns = columns;
      const maxRows = Math.max(...valuesPerColumn.map((s) => s.size));

      relEle.rows = Array.from({ length: maxRows }, (_, i) => {
        const relRow = new V1_RelationRowTestData();
        relRow.values = valuesPerColumn.map((s) => Array.from(s)[i] ?? '');
        return relRow;
      });
      return relEle;
    }
    throw new Error(
      `Access point '${this.accessPoint.id}' is not a Lakehouse access point, cannot fetch sample data from engine`,
    );
  }

  async fetchSampleData(
    dataProductArtifactPromise:
      | Promise<V1_DataProductArtifact | undefined>
      | undefined,
    resolvedUserEnv: string | undefined,
  ): Promise<void> {
    if (!this.fetchingSampleDataState.isInInitialState) {
      return;
    }
    this.fetchingSampleDataState.inProgress();
    try {
      const [artifactResult, engineResult] = await Promise.allSettled([
        ...(dataProductArtifactPromise
          ? [this.fetchSampleDataFromArtifact(dataProductArtifactPromise)]
          : []),
        ...(resolvedUserEnv
          ? [this.fetchSampleDataFromEngine(resolvedUserEnv)]
          : []),
      ]);
      if (engineResult?.status === 'fulfilled' && engineResult.value) {
        this.relationElement = engineResult.value;
      } else if (
        artifactResult?.status === 'fulfilled' &&
        artifactResult.value
      ) {
        this.relationElement = artifactResult.value;
      }
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof AggregateError) {
        this.apgState.applicationStore.notificationService.notifyError(
          `Error fetching access point sample data: ${error.errors[1] ?? error.errors[0] ?? error.message}`,
        );
      } else {
        this.apgState.applicationStore.notificationService.notifyError(
          `Error fetching access point sample data: ${error.message}`,
        );
      }
    } finally {
      this.fetchingSampleDataState.complete();
    }
  }
}
