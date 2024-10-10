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
  SUPPORTED_FUNCTIONS,
  V1_AppliedFunction,
  V1_Lambda,
  RawLambda,
  RelationalExecutionActivities,
  TDSExecutionResult,
  V1_deserializeRawValueSpecification,
  V1_deserializeValueSpecification,
  V1_RawLambda,
  V1_serializeValueSpecification,
  type GraphManagerState,
  type PureModel,
  type V1_ValueSpecification,
  type ParameterValue,
} from '@finos/legend-graph';
import {
  _elementPtr,
  _functionName,
  DataCubeGetBaseQueryResult,
  DataCubeEngine,
  type CompletionItem,
  DataCubeQuerySource,
  type DataCubeInfrastructureInfo,
  type RelationType,
  DataCubeQuery,
} from '@finos/legend-data-cube';
import { guaranteeType, LogService } from '@finos/legend-shared';

export class _DataCubeQuery {
  name: string;
  query: string;
  partialQuery: string;
  source: DataCubeQuerySource;

  constructor(
    name: string,
    query: string,
    partialQuery: string,
    source: DataCubeQuerySource,
  ) {
    this.name = name;
    this.query = query;
    this.partialQuery = partialQuery;
    this.source = source;
  }
}

export class QueryBuilderDataCubeQuerySource extends DataCubeQuerySource {}
export class QueryBuilderDataCubeEngine extends DataCubeEngine {
  readonly logService = new LogService();
  readonly graphState: GraphManagerState;
  readonly selectInitialQuery: RawLambda;
  readonly mappingPath: string | undefined;
  readonly parameterValues: ParameterValue[] | undefined;
  readonly runtimePath: string;
  _parameters: object | undefined;

  constructor(
    selectQuery: RawLambda,
    parameterValues: ParameterValue[] | undefined,
    mappingPath: string | undefined,
    runtimePath: string,
    graphManagerState: GraphManagerState,
  ) {
    super();
    this.graphState = graphManagerState;
    this.selectInitialQuery = selectQuery;
    this.mappingPath = mappingPath;
    this.runtimePath = runtimePath;
    this.parameterValues = parameterValues;
  }

  get sourceLabel(): string {
    return `Query Builder Report`;
  }
  override getBaseQuery(): Promise<DataCubeGetBaseQueryResult> {
    return this.buildBaseQuery();
  }

  async buildBaseQuery(): Promise<DataCubeGetBaseQueryResult> {
    const timestamp = Date.now();
    let srcFuncExp = V1_deserializeValueSpecification(
      this.graphState.graphManager.serializeRawValueSpecification(
        this.selectInitialQuery,
      ),
      [],
    );
    // We could do a further check here to ensure the experssion is an applied funciton
    // this is because data cube expects an expression to be able to built further upon the queery
    if (
      srcFuncExp instanceof V1_Lambda &&
      srcFuncExp.body.length === 1 &&
      srcFuncExp.body[0]
    ) {
      srcFuncExp = srcFuncExp.body[0];
    }
    this._parameters = this.selectInitialQuery.parameters;
    const fromFuncExp = new V1_AppliedFunction();
    fromFuncExp.function = _functionName(SUPPORTED_FUNCTIONS.FROM);
    fromFuncExp.parameters = [srcFuncExp];
    if (this.mappingPath) {
      fromFuncExp.parameters.push(_elementPtr(this.mappingPath));
    }
    if (this.runtimePath) {
      fromFuncExp.parameters.push(_elementPtr(this.runtimePath));
    }
    const [relationType, queryString, fromQuerystring] = await Promise.all([
      this.getRelationalType(this.selectInitialQuery),
      this.graphState.graphManager.valueSpecificationToPureCode(
        V1_serializeValueSpecification(srcFuncExp, []),
      ),
      this.graphState.graphManager.valueSpecificationToPureCode(
        V1_serializeValueSpecification(fromFuncExp, []),
      ),
    ]);
    const columns = relationType.columns;
    const source = new QueryBuilderDataCubeQuerySource();
    source.columns = columns;
    source.mapping = this.mappingPath;
    source.runtime = this.runtimePath;
    source.query = queryString;
    const partialQuery = `~[${columns.map((e) => `'${e.name}'`)}]->select()`;
    const result = new DataCubeQuery(this.sourceLabel, fromQuerystring);
    result.partialQuery = partialQuery;
    result.source = source;
    const baseQueryResult = new DataCubeGetBaseQueryResult();
    baseQueryResult.timestamp = timestamp;
    baseQueryResult.query = result;
    baseQueryResult.partialQuery = await this.parseQuery(partialQuery);
    baseQueryResult.sourceQuery = srcFuncExp;
    return baseQueryResult;
  }

  get graph(): PureModel {
    return this.graphState.graph;
  }

  private buildRawLambdaFromValueSpec(query: V1_ValueSpecification): RawLambda {
    const json = guaranteeType(
      V1_deserializeRawValueSpecification(
        V1_serializeValueSpecification(query, []),
      ),
      V1_RawLambda,
    );
    return new RawLambda(json.parameters, json.body);
  }

  override getInfrastructureInfo(): Promise<DataCubeInfrastructureInfo> {
    // we return undefined as we assume the grid license is set at the application level where query builder is built
    return Promise.resolve({
      gridClientLicense: undefined,
      simpleSampleDataTableName: '',
      complexSampleDataTableName: '',
    });
  }
  override async getQueryTypeahead(
    code: string,
    query: V1_ValueSpecification,
  ): Promise<CompletionItem[]> {
    const lambda = this.buildRawLambdaFromValueSpec(query);
    const queryString =
      await this.graphState.graphManager.lambdaToPureCode(lambda);
    const offset = queryString.length;
    const codeBlock = queryString + code;
    const result = await this.graphState.graphManager.getCodeComplete(
      codeBlock,
      this.graph,
      offset,
    );
    return result.completions;
  }

  override async parseQuery(
    code: string,
    returnSourceInformation?: boolean,
  ): Promise<V1_ValueSpecification> {
    return V1_deserializeValueSpecification(
      await this.graphState.graphManager.pureCodeToValueSpecification(
        code,
        returnSourceInformation,
      ),
      [],
    );
  }

  override getQueryCode(
    query: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ): Promise<string> {
    return this.graphState.graphManager.valueSpecificationToPureCode(
      V1_serializeValueSpecification(query, []),
      pretty,
    );
  }

  override getQueryRelationType(
    query: V1_ValueSpecification,
  ): Promise<RelationType> {
    const lambda = this.buildRawLambdaFromValueSpec(query);
    return this.getRelationalType(lambda);
  }

  async getRelationalType(query: RawLambda): Promise<RelationType> {
    const realtion_type =
      await this.graphState.graphManager.getLambdaRelationType(
        query,
        this.graph,
      );
    return realtion_type;
  }

  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
  ): Promise<RelationType> {
    const queryString =
      await this.graphState.graphManager.valueSpecificationToPureCode(
        V1_serializeValueSpecification(baseQuery, []),
      );
    const fullQuery = code + queryString;
    return this.getRelationalType(
      await this.graphState.graphManager.pureCodeToLambda(fullQuery),
    );
  }

  override async executeQuery(query: V1_Lambda): Promise<{
    result: TDSExecutionResult;
    executedQuery: string;
    executedSQL: string;
  }> {
    const lambda = this.buildRawLambdaFromValueSpec(query);
    lambda.parameters = this._parameters;
    const [executionWithMetadata, queryString] = await Promise.all([
      this.graphState.graphManager.runQuery(
        lambda,
        undefined,
        undefined,
        this.graph,
        {
          parameterValues: this.parameterValues ?? [],
        },
      ),
      this.graphState.graphManager.lambdaToPureCode(lambda),
    ]);
    const expectedTDS = guaranteeType(
      executionWithMetadata.executionResult,
      TDSExecutionResult,
      'Query returned expected to be of tabular data set',
    );
    const sql = expectedTDS.activities?.[0];
    let sqlString = '### NO SQL FOUND';
    if (sql instanceof RelationalExecutionActivities) {
      sqlString = sql.sql;
    }
    return {
      result: expectedTDS,
      executedQuery: queryString,
      executedSQL: sqlString,
    };
  }
}
