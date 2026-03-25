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
  V1_LakehouseAccessPoint,
  V1_LambdaReturnTypeInput,
  V1_RelationElement,
  V1_RelationType,
  V1_relationTypeModelSchema,
  V1_RenderStyle,
  V1_serializeRawValueSpecification,
  V1_ExecuteInput,
  V1_deserializeExecutionResult,
  V1_buildExecutionResult,
  V1_RelationRowTestData,
  type V1_ExecutionResult,
  type TDSExecutionResult,
} from '@finos/legend-graph';
import {
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
} from '@finos/legend-shared';
import { makeAutoObservable, observable, action } from 'mobx';
import { deserialize } from 'serializr';
import type { DataProductAPGState } from './DataProductAPGState.js';
import { createExecuteInput } from '../../utils/QueryExecutionUtils.js';
import { RegistryMetadataResponse } from '@finos/legend-server-marketplace';
import { APPLICATION_EVENT } from '@finos/legend-application';

export class DataProductAccessPointState {
  readonly apgState: DataProductAPGState;
  readonly accessPoint: V1_AccessPoint;
  relationType: V1_RelationType | undefined;
  relationElement: V1_RelationElement | undefined;
  grammar: string | undefined;
  entitlementsDataProductDetails?:
    | V1_EntitlementsDataProductDetails
    | undefined;

  readonly fetchingRelationTypeState = ActionState.create();
  readonly fetchingGrammarState = ActionState.create();
  readonly fetchingSampleDataState = ActionState.create();
  readonly fetchingRegistryMetadataState = ActionState.create();

  registryMetadata: RegistryMetadataResponse | undefined;
  isCollapsed = false;

  constructor(
    apgState: DataProductAPGState,
    accessPoint: V1_AccessPoint,
    initialCollapsed = false,
  ) {
    makeAutoObservable(this, {
      relationType: observable,
      grammar: observable,
      relationElement: observable,
      isCollapsed: observable,
      setIsCollapsed: action,
    });

    this.apgState = apgState;
    this.accessPoint = accessPoint;
    this.isCollapsed = initialCollapsed;
    this.entitlementsDataProductDetails =
      this.apgState.dataProductViewerState.entitlementsDataProductDetails;
  }

  setIsCollapsed(val: boolean): void {
    this.isCollapsed = val;
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

  async fetchRelationTypeFromEngine(
    abortController: AbortController,
    entitlementsDataProductDetails?:
      | V1_EntitlementsDataProductDetails
      | undefined,
  ): Promise<V1_RelationType | undefined> {
    if (this.accessPoint instanceof V1_LakehouseAccessPoint) {
      const projectGAV = this.apgState.dataProductViewerState.projectGAV;
      const entitlementsOrigin = entitlementsDataProductDetails?.origin;
      const model = this.apgState.dataProductViewerState.getAccessPointModel(
        projectGAV,
        entitlementsOrigin,
      );
      const relationTypeInput = new V1_LambdaReturnTypeInput(
        guaranteeNonNullable(
          model,
          `Unable to get model from data product origin of type ${entitlementsOrigin?.constructor.name}`,
        ),
        this.accessPoint.func,
      );
      const relationType = deserialize(
        V1_relationTypeModelSchema,
        await this.apgState.dataProductViewerState.engineServerClient.lambdaRelationType(
          V1_LambdaReturnTypeInput.serialization.toJson(relationTypeInput),
          {
            abortController,
          },
        ),
      );
      return relationType;
    }
    throw new Error(
      `Access point '${this.accessPoint.id}' is not a Lakehouse access point, cannot fetch relation type from engine`,
    );
  }

  async fetchRelationType(
    dataProductArtifactPromise:
      | Promise<V1_DataProductArtifact | undefined>
      | undefined,
    entitlementsDataProductDetails?:
      | V1_EntitlementsDataProductDetails
      | undefined,
  ): Promise<void> {
    if (!this.fetchingRelationTypeState.isInInitialState) {
      return;
    }
    this.fetchingRelationTypeState.inProgress();
    try {
      const abortController = new AbortController();
      const relationType = await Promise.any([
        ...(dataProductArtifactPromise
          ? [this.fetchRelationTypeFromArtifact(dataProductArtifactPromise)]
          : []),
        this.fetchRelationTypeFromEngine(
          abortController,
          entitlementsDataProductDetails,
        ),
      ]);
      // Abort the engine request if we got the relation type from the artifact
      abortController.abort();
      this.relationType = relationType;
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof AggregateError) {
        // Default to showing the relation type from engine error
        this.apgState.applicationStore.notificationService.notifyError(
          `Error fetching access point relation type: ${error.errors[1] ?? error.errors[0] ?? error.message}`,
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
        // Default to showing the relation type from engine error
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
