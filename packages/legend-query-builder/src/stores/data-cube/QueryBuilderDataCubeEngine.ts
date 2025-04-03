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
  V1_Lambda,
  RawLambda,
  RelationalExecutionActivities,
  TDSExecutionResult,
  V1_deserializeRawValueSpecification,
  V1_deserializeValueSpecification,
  V1_RawLambda,
  V1_serializeValueSpecification,
  type GraphManagerState,
  type V1_ValueSpecification,
  type ParameterValue,
  LAMBDA_PIPE,
  reportGraphAnalytics,
} from '@finos/legend-graph';
import {
  _elementPtr,
  DataCubeEngine,
  DataCubeSource,
  _function,
  DataCubeFunction,
  type CompletionItem,
  DataCubeSpecification,
} from '@finos/legend-data-cube';
import {
  guaranteeType,
  isNonNullable,
  LogService,
  StopWatch,
  type PlainObject,
  type TimingsRecord,
} from '@finos/legend-shared';
import { QueryBuilderTelemetryHelper } from '../../__lib__/QueryBuilderTelemetryHelper.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';

class QueryBuilderDataCubeSource extends DataCubeSource {
  mapping?: string | undefined;
  runtime: string | undefined;
}

export const QUERY_BUILDER_DATA_CUBE_SOURCE_TYPE = 'queryBuilder';

export class QueryBuilderDataCubeEngine extends DataCubeEngine {
  readonly logService = new LogService();
  readonly graphState: GraphManagerState;
  readonly queryBuilderState: QueryBuilderState | undefined;
  readonly selectInitialQuery: RawLambda;
  readonly mappingPath: string | undefined;
  readonly parameterValues: ParameterValue[] | undefined;
  readonly runtimePath: string | undefined;
  readonly parameters: object | undefined;

  constructor(
    selectQuery: RawLambda,
    parameterValues: ParameterValue[] | undefined,
    mappingPath: string | undefined,
    runtimePath: string | undefined,
    graphManagerState: GraphManagerState,
    queryBuilderState?: QueryBuilderState,
  ) {
    super();

    this.graphState = graphManagerState;
    this.queryBuilderState = queryBuilderState;
    this.selectInitialQuery = selectQuery;
    this.mappingPath = mappingPath;
    this.runtimePath = runtimePath;
    this.parameterValues = parameterValues;
    this.parameters = selectQuery.parameters;
  }

  override finalizeTimingRecord(
    stopWatch: StopWatch,
    timings?: TimingsRecord,
  ): TimingsRecord | undefined {
    if (this.queryBuilderState) {
      return this.queryBuilderState.applicationStore.timeService.finalizeTimingsRecord(
        stopWatch,
        timings,
      );
    }
    return undefined;
  }

  override getDataFromSource(source?: DataCubeSource): PlainObject {
    if (source instanceof QueryBuilderDataCubeSource) {
      return {
        query: {
          mapping: source.mapping,
          runtime: source.runtime,
        },
        sourceType: QUERY_BUILDER_DATA_CUBE_SOURCE_TYPE,
      };
    }
    return {};
  }

  override async processSource(sourceData: PlainObject) {
    // TODO: this is an abnormal usage of this method, this is the place
    // where we can enforce which source this engine supports, instead
    // of hardcoding the logic like this.
    const srcFuncExp = this.getSourceFunctionExpression();
    const source = new QueryBuilderDataCubeSource();
    source.columns = (
      await this.getRelationType(this.selectInitialQuery)
    ).columns;
    source.mapping = this.mappingPath;
    source.runtime = this.runtimePath;
    source.query = srcFuncExp;
    return source;
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean,
  ) {
    return V1_deserializeValueSpecification(
      await this.graphState.graphManager.pureCodeToValueSpecification(
        code,
        returnSourceInformation,
      ),
      [],
    );
  }

  override async getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ) {
    return this.graphState.graphManager.valueSpecificationToPureCode(
      V1_serializeValueSpecification(value, []),
      pretty,
    );
  }

  override async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    context: DataCubeSource | PlainObject,
  ) {
    const lambda = this.buildRawLambdaFromValueSpec(baseQuery);
    const queryString =
      await this.graphState.graphManager.lambdaToPureCode(lambda);
    const offset = queryString.length;
    const codeBlock = queryString + code;
    const finalCode = codeBlock.substring(
      codeBlock.indexOf(LAMBDA_PIPE) + LAMBDA_PIPE.length,
      codeBlock.length,
    );
    const result = await this.graphState.graphManager.getCodeComplete(
      finalCode,
      this.graphState.graph,
      offset,
    );
    return result.completions as CompletionItem[];
  }

  override async getQueryRelationReturnType(
    query: V1_Lambda,
    source: DataCubeSource,
  ) {
    return this.getRelationType(this.buildRawLambdaFromValueSpec(query));
  }

  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ) {
    const queryString =
      await this.graphState.graphManager.valueSpecificationToPureCode(
        V1_serializeValueSpecification(baseQuery, []),
      );
    const fullQuery = queryString + code;
    return this.getRelationType(
      await this.graphState.graphManager.pureCodeToLambda(fullQuery),
    );
  }

  override async executeQuery(query: V1_Lambda, source: DataCubeSource) {
    const stopWatch = new StopWatch();
    const lambda = this.buildRawLambdaFromValueSpec(query);
    lambda.parameters = this.parameters;
    const [executionWithMetadata, queryString] = await Promise.all([
      this.graphState.graphManager.runQuery(
        lambda,
        undefined,
        undefined,
        this.graphState.graph,
        {
          parameterValues: this.parameterValues ?? [],
        },
      ),
      this.graphState.graphManager.lambdaToPureCode(lambda),
    ]);
    const elapsed = stopWatch.elapsed;
    const result = guaranteeType(
      executionWithMetadata.executionResult,
      TDSExecutionResult,
      'Query returned expected to be of tabular data set',
    );

    if (this.queryBuilderState) {
      const report = reportGraphAnalytics(this.graphState.graph);
      report.timings =
        this.queryBuilderState.applicationStore.timeService.finalizeTimingsRecord(
          stopWatch,
          report.timings,
        );
      const reportWithState = Object.assign(
        {},
        report,
        this.queryBuilderState.getStateInfo(),
      );
      QueryBuilderTelemetryHelper.logEvent_EmbeddedDataCubeQueryRunSucceeded(
        this.queryBuilderState.applicationStore.telemetryService,
        reportWithState,
      );
    }

    return {
      result: result,
      executedQuery: queryString,
      executedSQL:
        result.activities?.at(-1) instanceof RelationalExecutionActivities
          ? (result.activities.at(-1) as RelationalExecutionActivities).sql
          : undefined,
      executionTime: elapsed,
    };
  }

  override buildExecutionContext(source: DataCubeSource) {
    if (source instanceof QueryBuilderDataCubeSource) {
      const appendFromFunc = Boolean(source.mapping ?? source.runtime);
      return appendFromFunc
        ? _function(
            DataCubeFunction.FROM,
            [
              source.mapping ? _elementPtr(source.mapping) : undefined,
              source.runtime ? _elementPtr(source.runtime) : undefined,
            ].filter(isNonNullable),
          )
        : undefined;
    }
    return undefined;
  }

  override sendTelemetry(event: string, data: PlainObject) {
    this.queryBuilderState?.applicationStore.telemetryService.logEvent(
      event,
      data,
    );
  }

  // ---------------------------------- UTILITIES ----------------------------------

  private buildRawLambdaFromValueSpec(query: V1_Lambda): RawLambda {
    const json = guaranteeType(
      V1_deserializeRawValueSpecification(
        V1_serializeValueSpecification(query, []),
      ),
      V1_RawLambda,
    );
    return new RawLambda(json.parameters, json.body);
  }

  private getSourceFunctionExpression() {
    let srcFuncExp = V1_deserializeValueSpecification(
      this.graphState.graphManager.serializeRawValueSpecification(
        this.selectInitialQuery,
      ),
      [],
    );
    // We could do a further check here to ensure the experession is an applied funciton
    // this is because data cube expects an expression to be able to built further upon the queery
    if (
      srcFuncExp instanceof V1_Lambda &&
      srcFuncExp.body.length === 1 &&
      srcFuncExp.body[0]
    ) {
      srcFuncExp = srcFuncExp.body[0];
    }
    return srcFuncExp;
  }

  async generateInitialSpecification() {
    const columns = (await this.getRelationType(this.selectInitialQuery))
      .columns;
    const specification = new DataCubeSpecification();
    specification.query = `~[${columns.map((e) => `'${e.name}'`)}]->select()`;
    return specification;
  }

  async getRelationType(lambda: RawLambda) {
    const relationType =
      await this.graphState.graphManager.getLambdaRelationType(
        lambda,
        this.graphState.graph,
      );
    return relationType;
  }
}
