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
  PureClientVersion,
  V1_AdHocDeploymentDataProductOrigin,
  V1_LakehouseAccessPoint,
  V1_LambdaReturnTypeInput,
  V1_LegendSDLC,
  V1_Protocol,
  V1_PureGraphManager,
  V1_PureModelContextPointer,
  V1_RelationElement,
  V1_RelationType,
  V1_relationTypeModelSchema,
  V1_RenderStyle,
  V1_SdlcDeploymentDataProductOrigin,
  V1_serializeRawValueSpecification,
  V1_LakehouseRuntime,
  V1_PackageableRuntime,
  V1_PureModelContextData,
  V1_PureModelContextCombination,
  V1_deserializeRawValueSpecification,
  V1_ExecuteInput,
  V1_deserializeExecutionResult,
  V1_buildExecutionResult,
  V1_RelationRowTestData,
  type V1_EntitlementsDataProductOrigin,
  type V1_RawLambda,
  type V1_ExecutionResult,
  type TDSExecutionResult,
  V1_RawBaseExecutionContext,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { makeAutoObservable, observable, flow } from 'mobx';
import { deserialize } from 'serializr';
import type { DataProductAPGState } from './DataProductAPGState.js';
import { resolveVersion } from '@finos/legend-server-depot';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';

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
  readonly fetchingRelationElement = ActionState.create();
  readonly fetchingGrammarState = ActionState.create();

  constructor(apgState: DataProductAPGState, accessPoint: V1_AccessPoint) {
    makeAutoObservable(this, {
      relationType: observable,
      grammar: observable,
      relationElement: observable,
      init: flow,
    });

    this.apgState = apgState;
    this.accessPoint = accessPoint;
  }

  *init(
    dataProductArtifactPromise: Promise<V1_DataProductArtifact | undefined>,
    entitlementsDataProductDetails?:
      | V1_EntitlementsDataProductDetails
      | undefined,
  ): GeneratorFn<void> {
    this.entitlementsDataProductDetails = entitlementsDataProductDetails;
    yield Promise.all([
      this.fetchRelationType(
        dataProductArtifactPromise,
        entitlementsDataProductDetails,
      ),
      this.fetchSampleDataFromArtifact(dataProductArtifactPromise),
      this.fetchGrammar(),
    ]);
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

  async fetchSampleDataFromArtifact(
    dataProductArtifactPromise: Promise<V1_DataProductArtifact | undefined>,
  ): Promise<void> {
    this.fetchingRelationElement.inProgress();
    try {
      const artifact = await dataProductArtifactPromise;
      this.relationElement = artifact?.accessPointGroups
        .find((apg) => apg.id === this.apgState.apg.id)
        ?.accessPointImplementations.find(
          (ap) => ap.id === this.accessPoint.id,
        )?.relationElement;
    } catch (error) {
      assertErrorThrown(error);
      this.apgState.applicationStore.notificationService.notifyError(
        `Error fetching access point sample data: ${error.message}`,
      );
    } finally {
      this.fetchingRelationElement.complete();
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
      const model = this.getAccessPointModel(projectGAV, entitlementsOrigin);
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

  private getAccessPointModel(
    projectGAV: ProjectGAVCoordinates | undefined,
    entitlementsOrigin: V1_EntitlementsDataProductOrigin | null | undefined,
  ) {
    return projectGAV !== undefined
      ? new V1_PureModelContextPointer(
          // TODO: remove as backend should handle undefined protocol input
          new V1_Protocol(
            V1_PureGraphManager.PURE_PROTOCOL_NAME,
            PureClientVersion.VX_X_X,
          ),
          new V1_LegendSDLC(
            projectGAV.groupId,
            projectGAV.artifactId,
            resolveVersion(projectGAV.versionId),
          ),
        )
      : entitlementsOrigin instanceof V1_AdHocDeploymentDataProductOrigin ||
          entitlementsOrigin === undefined
        ? guaranteeType(
            this.apgState.dataProductViewerState.graphManagerState.graphManager,
            V1_PureGraphManager,
          ).getFullGraphModelData(
            this.apgState.dataProductViewerState.graphManagerState.graph,
          )
        : entitlementsOrigin instanceof V1_SdlcDeploymentDataProductOrigin
          ? new V1_PureModelContextPointer(
              // TODO: remove as backend should handle undefined protocol input
              new V1_Protocol(
                V1_PureGraphManager.PURE_PROTOCOL_NAME,
                PureClientVersion.VX_X_X,
              ),
              new V1_LegendSDLC(
                entitlementsOrigin.group,
                entitlementsOrigin.artifact,
                resolveVersion(entitlementsOrigin.version),
              ),
            )
          : undefined;
  }

  async fetchRelationType(
    dataProductArtifactPromise: Promise<V1_DataProductArtifact | undefined>,
    entitlementsDataProductDetails?:
      | V1_EntitlementsDataProductDetails
      | undefined,
  ): Promise<void> {
    this.fetchingRelationTypeState.inProgress();
    try {
      const abortController = new AbortController();
      const relationType = await Promise.any([
        this.fetchRelationTypeFromArtifact(dataProductArtifactPromise),
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

  async fetchSampleDataFromEngine(resolvedUserEnv: string): Promise<void> {
    try {
      if (this.accessPoint instanceof V1_LakehouseAccessPoint) {
        const runtime = new V1_LakehouseRuntime();
        runtime.warehouse = `LAKEHOUSE_CONSUMER_DEFAULT_WH`;
        runtime.environment = resolvedUserEnv;

        const packageableRuntime = new V1_PackageableRuntime();
        packageableRuntime.runtimeValue = runtime;
        packageableRuntime.name = 'lakehouseConsumer';
        packageableRuntime.package = 'runtime';

        const query = `#P{${this.apgState.dataProductViewerState.product.path}.${this.accessPoint.id}}#->take(200)->from(${packageableRuntime.path})`;

        const model = guaranteeNonNullable(
          this.getAccessPointModel(
            this.apgState.dataProductViewerState.projectGAV,
            this.entitlementsDataProductDetails?.origin,
          ),
        );
        const data = new V1_PureModelContextData();
        data.elements.push(packageableRuntime);
        const contextModel = new V1_PureModelContextCombination([model, data]);

        const rawLambda = V1_deserializeRawValueSpecification(
          await this.apgState.dataProductViewerState.engineServerClient.grammarToJSON_lambda(
            query,
          ),
        ) as V1_RawLambda;
        const executionInput = new V1_ExecuteInput();
        executionInput.model = contextModel;
        executionInput.function = rawLambda;
        executionInput.clientVersion = PureClientVersion.VX_X_X;
        executionInput.context = new V1_RawBaseExecutionContext();

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
        this.relationElement = relEle;
      }
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    }
  }
}
