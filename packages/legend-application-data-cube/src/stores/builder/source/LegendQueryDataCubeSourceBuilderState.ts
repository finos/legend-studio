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
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  IllegalStateError,
  LogEvent,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type V1_EngineServerClient,
  type V1_Enumeration,
  type V1_PureGraphManager,
  type V1_PureModelContextData,
  type V1_ValueSpecification,
  type V1_Variable,
  QuerySearchSpecification,
  V1_CORE_SYSTEM_MODELS,
  V1_deserializePureModelContextData,
  V1_deserializeRawValueSpecificationType,
  V1_Lambda,
  V1_observe_ValueSpecification,
  V1_PackageableType,
  V1_Query,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import {
  isValidV1_ValueSpecification,
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  QueryLoaderState,
} from '@finos/legend-query-builder';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import { RawLegendQueryDataCubeSource } from '../../model/LegendQueryDataCubeSource.js';
import { APPLICATION_EVENT } from '@finos/legend-application';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import {
  type DataCubeAlertService,
  type DataCubeConfiguration,
  _defaultPrimitiveTypeValue,
  _primitiveValue,
} from '@finos/legend-data-cube';
import type { DepotServerClient } from '@finos/legend-server-depot';
import {
  fetchV1Enumeration,
  isVariableEnumerationType,
} from './LegendQueryDataCubeSourceBuilderStateHelper.js';

type QueryParameterValues = {
  [varName: string]: {
    variable: V1_Variable;
    valueSpec: V1_ValueSpecification;
  };
};

export class LegendQueryDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  private readonly _engineServerClient: V1_EngineServerClient;
  private readonly _depotServerClient: DepotServerClient;
  private readonly _graphManager: V1_PureGraphManager;
  private readonly _systemModel: V1_PureModelContextData;

  readonly queryLoader: QueryLoaderState;

  query?: LightQuery | undefined;
  queryCode?: string | undefined;
  queryParameterValues?: QueryParameterValues | undefined;
  queryEnumerations?: { [varName: string]: V1_Enumeration };

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    engineServerClient: V1_EngineServerClient,
    depotServerClient: DepotServerClient,
    graphManager: V1_PureGraphManager,
    alertService: DataCubeAlertService,
  ) {
    super(application, engine, alertService);

    makeObservable(this, {
      query: observable,
      unsetQuery: action,

      queryCode: observable,
      queryParameters: computed,
      queryParameterValues: observable,
      queryEnumerations: observable,

      setQueryParameterValue: action,
      hasInvalidQueryParameters: computed,
    });

    this._graphManager = graphManager;
    this._engineServerClient = engineServerClient;
    this._depotServerClient = depotServerClient;
    this._systemModel = V1_deserializePureModelContextData(
      V1_CORE_SYSTEM_MODELS,
    );

    this.queryLoader = new QueryLoaderState(
      this._application,
      this._graphManager,
      {
        loadQuery: (query) => {
          this.setQuery(query).catch((error) =>
            this._alertService.alertUnhandledError(error),
          );
        },
        decorateSearchSpecification: (val) => val,
        fetchDefaultQueries: async () => {
          const searchSpecification = new QuerySearchSpecification();
          searchSpecification.limit = QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT;
          return this._graphManager.searchQueries(
            QuerySearchSpecification.createDefault(undefined),
          );
        },
        isReadOnly: true,
      },
    );
  }

  async setQuery(lightQuery: LightQuery) {
    try {
      const processedQuery = V1_Query.serialization.fromJson(
        await this._engineServerClient.getQuery(lightQuery.id),
      );
      const queryLambda = guaranteeType(
        await this._engine.parseValueSpecification(processedQuery.content),
        V1_Lambda,
        'Expected query content to be a V1_Lambda',
      );
      const queryCode = await this._engine.getValueSpecificationCode(
        queryLambda,
        true,
      );
      const queryParameters = queryLambda.parameters;
      const queryInfo = await this._graphManager.getQueryInfo(
        processedQuery.id,
      );

      const queryParameterValues: QueryParameterValues = {};
      for (const param of queryParameters) {
        const genericType = guaranteeNonNullable(param.genericType);
        const packageableType = guaranteeType(
          genericType.rawType,
          V1_PackageableType,
        );
        const defaultValue = queryInfo.defaultParameterValues?.find(
          (defaultParam) => defaultParam.name === param.name,
        );
        const defaultValueSpec =
          defaultValue?.content !== undefined
            ? await this._engine.parseValueSpecification(defaultValue.content)
            : _primitiveValue(
                V1_deserializeRawValueSpecificationType(
                  packageableType.fullPath,
                ),
                _defaultPrimitiveTypeValue(packageableType.fullPath),
              );
        queryParameterValues[param.name] = {
          variable: param,
          valueSpec: V1_observe_ValueSpecification(defaultValueSpec),
        };
      }
      const enumerationParameters = queryParameters.filter(
        isVariableEnumerationType,
      );
      // eslint-disable-next-line no-void
      void this.populateEnumerations(enumerationParameters, lightQuery);
      runInAction(() => {
        this.query = lightQuery;
        this.queryCode = queryCode;
        this.queryParameterValues = queryParameterValues;
      });
    } catch (error) {
      assertErrorThrown(error);
      this._application.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Can't get code for query with ID '${lightQuery.id}'`,
      );
      runInAction(() => {
        this.query = lightQuery;
        this.queryCode = undefined;
      });
    }
  }

  unsetQuery(): void {
    this.query = undefined;
    this.queryCode = undefined;
  }

  setQueryParameterValue(name: string, value: V1_ValueSpecification) {
    if (this.queryParameterValues?.[name]) {
      this.queryParameterValues[name].valueSpec = value;
    }
  }

  get queryParameters(): V1_Variable[] | undefined {
    return this.queryParameterValues
      ? Object.values(this.queryParameterValues).map((elem) => elem.variable)
      : undefined;
  }

  get hasInvalidQueryParameters(): boolean {
    if (this.queryParameterValues) {
      return Object.values(this.queryParameterValues).some(
        (paramVal) =>
          !isValidV1_ValueSpecification(
            paramVal.valueSpec,
            paramVal.variable.multiplicity,
          ),
      );
    }
    return false;
  }

  override get label() {
    return LegendDataCubeSourceBuilderType.LEGEND_QUERY;
  }

  override get isValid(): boolean {
    return Boolean(this.query) && !this.hasInvalidQueryParameters;
  }

  override async generateSourceData() {
    if (!this.query) {
      throw new IllegalStateError(
        `Can't generate source data: query is not set`,
      );
    }
    const source = new RawLegendQueryDataCubeSource();
    source.queryId = this.query.id;
    source.parameterValues = this.queryParameterValues
      ? Object.values(this.queryParameterValues).map((variableAndValueSpec) => [
          JSON.stringify(
            V1_serializeValueSpecification(
              variableAndValueSpec.variable,
              this._application.pluginManager.getPureProtocolProcessorPlugins(),
            ),
          ),
          JSON.stringify(
            V1_serializeValueSpecification(
              variableAndValueSpec.valueSpec,
              this._application.pluginManager.getPureProtocolProcessorPlugins(),
            ),
          ),
        ])
      : [];
    return RawLegendQueryDataCubeSource.serialization.toJson(source);
  }

  override finalizeConfiguration(configuration: DataCubeConfiguration) {
    if (this.query) {
      configuration.name = this.query.name;
    }
  }

  private async populateEnumerations(
    queryParameters: V1_Variable[],
    query: LightQuery,
  ): Promise<void> {
    const queryEnumerations: { [paramName: string]: V1_Enumeration } = {};
    for (const param of queryParameters) {
      const enumerationValue = await fetchV1Enumeration(
        guaranteeNonNullable(
          guaranteeType(param.genericType?.rawType, V1_PackageableType)
            .fullPath,
        ),
        query,
        this._systemModel,
        this._depotServerClient,
        this._application.pluginManager.getPureProtocolProcessorPlugins(),
      );
      queryEnumerations[param.name] = enumerationValue;
    }
    runInAction(() => {
      this.queryEnumerations = queryEnumerations;
    });
  }
}
