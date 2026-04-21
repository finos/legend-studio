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

import { DataProductAccessType } from '@finos/legend-graph';
import { type DepotServerClient } from '@finos/legend-server-depot';
import { IllegalStateError, guaranteeNonNullable } from '@finos/legend-shared';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { generateDataProductSampleQueryRoute } from '../../__lib__/LegendQueryNavigation.js';
import { DataProductSelectorState } from '../data-space/DataProductSelectorState.js';
import { createQueryDataProductTaggedValue } from '../../components/data-product/QueryDataProductUtil.js';
import { BaseTemplateQueryCreatorStore } from '../BaseTemplateQueryCreatorStore.js';

export class DataProductSampleQueryCreatorStore extends BaseTemplateQueryCreatorStore {
  readonly dataProductPath: string;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataProductPath: string,
    sampleQueryId: string,
    urlQueryParamValues: Record<string, string> | undefined,
  ) {
    super(
      applicationStore,
      depotServerClient,
      groupId,
      artifactId,
      versionId,
      sampleQueryId,
      urlQueryParamValues,
    );
    this.dataProductPath = dataProductPath;
  }

  override getEditorRoute(): string {
    return generateDataProductSampleQueryRoute(
      this.groupId,
      this.artifactId,
      this.versionId,
      this.dataProductPath,
      this.templateQueryId,
    );
  }

  override getEntityPath(): string {
    return this.dataProductPath;
  }

  override getSearchTaggedValues(): {
    profile: string;
    tag: string;
    value: string;
  }[] {
    return [createQueryDataProductTaggedValue(this.dataProductPath)];
  }

  override getQueryDecoratorTaggedValues():
    | { profile: string; tag: string; value: string }[]
    | undefined {
    return [createQueryDataProductTaggedValue(this.dataProductPath)];
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    const artifact = await this.fetchDataProductArtifact(
      this.groupId,
      this.artifactId,
      this.versionId,
      this.dataProductPath,
    );

    const nativeModelAccess = guaranteeNonNullable(
      artifact.nativeModelAccess,
      `Data product '${this.dataProductPath}' does not have native model access`,
    );
    const sampleQuery = nativeModelAccess.sampleQueries?.find(
      (sq) => sq.info.id === this.templateQueryId,
    );
    if (!sampleQuery) {
      throw new IllegalStateError(
        `Can't find sample query with id '${this.templateQueryId}' in data product '${this.dataProductPath}'`,
      );
    }
    this.templateQueryTitle = sampleQuery.title;

    const accessId =
      sampleQuery.info.executionContextKey ??
      nativeModelAccess.defaultExecutionContext;

    const queryBuilderState = await this.buildDataProductQueryBuilderState(
      this.groupId,
      this.artifactId,
      this.versionId,
      this.dataProductPath,
      artifact,
      accessId,
      DataProductAccessType.NATIVE,
      async () => {
        this.applicationStore.notificationService.notifyWarning(
          `Can't switch data product while visiting a sample query`,
        );
      },
      undefined,
      new DataProductSelectorState(
        this.depotServerClient,
        this.applicationStore,
      ),
    );

    const query = await this.graphManagerState.graphManager.pureCodeToLambda(
      sampleQuery.info.query,
    );

    const defaultParameters = await this.resolveDefaultParameters(query);
    queryBuilderState.initializeWithQuery(query, defaultParameters);

    return queryBuilderState;
  }
}
