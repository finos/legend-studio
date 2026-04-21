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
  type Query,
  type QuerySearchSpecification,
  type RawLambda,
  type ValueSpecification,
  QueryProjectCoordinates,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import { type DepotServerClient } from '@finos/legend-server-depot';
import {
  assertErrorThrown,
  LogEvent,
  uuid,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import {
  type ProjectGAVCoordinates,
  parseGACoordinates,
} from '@finos/legend-storage';
import {
  type QueryPersistConfiguration,
  QueryEditorStore,
} from './QueryEditorStore.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { createQueryClassTaggedValue } from '@finos/legend-extension-dsl-data-space/application';
import { processQueryParameters } from '../components/utils/QueryParameterUtils.js';
import { LEGEND_QUERY_APP_EVENT } from '../__lib__/LegendQueryEvent.js';

/**
 * Abstract base store for template/sample query creator flows.
 */
export abstract class BaseTemplateQueryCreatorStore extends QueryEditorStore {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly templateQueryId: string;
  templateQueryTitle?: string;
  urlQueryParamValues: Record<string, string> | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    templateQueryId: string,
    urlQueryParamValues: Record<string, string> | undefined,
  ) {
    super(applicationStore, depotServerClient);
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.templateQueryId = templateQueryId;
    this.urlQueryParamValues = urlQueryParamValues;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  override *buildGraph(): GeneratorFn<void> {
    // do nothing — graph is built inside initializeQueryBuilderState
  }

  /**
   * Returns the entity path (DataSpace path or DataProduct path) used for
   * display names in persist configuration.
   */
  abstract getEntityPath(): string;

  /**
   * Returns the tagged values to attach to the search specification.
   */
  abstract getSearchTaggedValues(): {
    profile: string;
    tag: string;
    value: string;
  }[];

  /**
   * Returns the tagged values to attach to the persisted query
   */
  abstract getQueryDecoratorTaggedValues():
    | { profile: string; tag: string; value: string }[]
    | undefined;

  /**
   * Resolves URL query parameters into a default parameter values map.
   * Shared by both DataSpace and DataProduct template/sample query flows.
   */
  async resolveDefaultParameters(
    query: RawLambda,
  ): Promise<Map<string, ValueSpecification> | undefined> {
    const processedQueryParamValues = processQueryParameters(
      query,
      undefined,
      this.urlQueryParamValues,
      this.graphManagerState,
    );
    if (processedQueryParamValues?.size) {
      try {
        return await this.graphManagerState.graphManager.pureCodeToValueSpecifications(
          processedQueryParamValues,
          this.graphManagerState.graph,
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
          `Error resolving preset query param values: ${error.message}`,
        );
      }
    }
    return undefined;
  }

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update: boolean | undefined },
  ): QueryPersistConfiguration {
    const entityPath = this.getEntityPath();
    return {
      defaultName: options?.update
        ? `${extractElementNameFromPath(entityPath)}`
        : `New Query for ${extractElementNameFromPath(entityPath)}[${this.templateQueryId}]`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
        const decoratorTaggedValues = this.getQueryDecoratorTaggedValues();
        if (decoratorTaggedValues) {
          const taggedValues = decoratorTaggedValues.map((tv) => ({
            profile: tv.profile,
            tag: tv.tag,
            value: tv.value,
          }));
          if (this.queryBuilderState?.sourceClass) {
            taggedValues.push(
              createQueryClassTaggedValue(
                this.queryBuilderState.sourceClass.path,
              ),
            );
          }
          query.taggedValues = taggedValues;
        } else if (this.queryBuilderState?.sourceClass) {
          // Subclass handles tagged values directly (e.g., DataSpace only sets class tag)
          query.taggedValues = [
            createQueryClassTaggedValue(
              this.queryBuilderState.sourceClass.path,
            ),
          ];
        }
      },
    };
  }

  override decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    const currentProjectCoordinates = new QueryProjectCoordinates();
    currentProjectCoordinates.groupId = this.groupId;
    currentProjectCoordinates.artifactId = this.artifactId;
    val.projectCoordinates = [
      currentProjectCoordinates,
      ...Array.from(
        this.graphManagerState.graph.dependencyManager.projectDependencyModelsIndex.keys(),
      ).map((dependencyKey) => {
        const { groupId, artifactId } = parseGACoordinates(dependencyKey);
        const coordinates = new QueryProjectCoordinates();
        coordinates.groupId = groupId;
        coordinates.artifactId = artifactId;
        return coordinates;
      }),
    ];
    val.taggedValues = this.getSearchTaggedValues();
    val.combineTaggedValuesCondition = true;
    return val;
  }

  abstract override initializeQueryBuilderState(): Promise<QueryBuilderState>;
}
