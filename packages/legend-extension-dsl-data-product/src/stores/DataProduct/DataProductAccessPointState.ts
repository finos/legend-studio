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
  V1_RelationType,
  V1_relationTypeModelSchema,
  V1_RenderStyle,
  V1_SdlcDeploymentDataProductOrigin,
  V1_serializeRawValueSpecification,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { makeAutoObservable, observable, flow } from 'mobx';
import { deserialize } from 'serializr';
import type { DataProductAPGState } from './DataProductAPGState.js';
import { resolveVersion } from '@finos/legend-server-depot';

export class DataProductAccessPointState {
  readonly apgState: DataProductAPGState;
  readonly accessPoint: V1_AccessPoint;
  relationType: V1_RelationType | undefined;
  grammar: string | undefined;

  readonly fetchingRelationTypeState = ActionState.create();
  readonly fetchingGrammarState = ActionState.create();

  constructor(apgState: DataProductAPGState, accessPoint: V1_AccessPoint) {
    makeAutoObservable(this, {
      relationType: observable,
      grammar: observable,
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
    yield Promise.all([
      this.fetchRelationType(
        dataProductArtifactPromise,
        entitlementsDataProductDetails,
      ),
      this.fetchGrammar(),
    ]);
  }

  async fetchRelationTypeFromArtifact(
    dataProductArtifactPromise: Promise<V1_DataProductArtifact | undefined>,
  ): Promise<V1_RelationType | undefined> {
    const artifact = await dataProductArtifactPromise;
    const lambdaRelationType = artifact?.accessPointGroups
      .find((apg) => apg.id === this.apgState.apg.id)
      ?.accessPointImplementations.find((ap) => ap.id === this.accessPoint.id)
      ?.lambdaGenericType?.typeArguments?.map((typeArg) => typeArg.rawType)
      ?.filter((rawType) => rawType instanceof V1_RelationType)[0];
    if (lambdaRelationType !== undefined) {
      return lambdaRelationType;
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
      const model =
        projectGAV !== undefined
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
                this.apgState.dataProductViewerState.graphManagerState
                  .graphManager,
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
      if (relationType !== undefined) {
        return relationType;
      } else {
        throw new Error(
          `Engine failed to return relation type for access point: ${this.accessPoint.id}`,
        );
      }
    }
    throw new Error(
      `Unable to get relation type for non-lakehouse access point: ${this.accessPoint.id}`,
    );
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
      abortController.abort();
      this.relationType = relationType;
    } catch (error) {
      assertErrorThrown(error);
      this.apgState.applicationStore.notificationService.notifyError(
        `Error fetching access point relation type: ${error.message}`,
      );
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
}
