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
  DataCubeEngine,
  DataCubeSource,
  type RelationType,
  DataCubeQuery,
  type DataCubeInitialInput,
  type CompletionItem,
  _function,
  DataCubeFunction,
} from '@finos/legend-data-cube';
import { guaranteeType, isNonNullable, LogService } from '@finos/legend-shared';

class QueryBuilderDataCubeSource extends DataCubeSource {
  mapping?: string | undefined;
  runtime!: string;
}

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

  override getInitialInput(): Promise<DataCubeInitialInput> {
    return this.buildBaseQuery();
  }

  async buildBaseQuery(): Promise<DataCubeInitialInput> {
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
    const columns = (await this.getRelationalType(this.selectInitialQuery))
      .columns;
    const query = new DataCubeQuery();
    query.query = `~[${columns.map((e) => `'${e.name}'`)}]->select()`;
    const source = new QueryBuilderDataCubeSource();
    source.sourceColumns = columns;
    source.mapping = this.mappingPath;
    source.runtime = this.runtimePath;
    source.query = srcFuncExp;
    return {
      query,
      source,
    };
  }

  get graph(): PureModel {
    return this.graphState.graph;
  }

  private buildRawLambdaFromValueSpec(query: V1_Lambda): RawLambda {
    const json = guaranteeType(
      V1_deserializeRawValueSpecification(
        V1_serializeValueSpecification(
          query.body[0] as V1_ValueSpecification,
          [],
        ),
      ),
      V1_RawLambda,
    );
    return new RawLambda(json.parameters, json.body);
  }

  async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ) {
    const lambda = this.buildRawLambdaFromValueSpec(baseQuery);
    const queryString =
      await this.graphState.graphManager.lambdaToPureCode(lambda);
    const offset = queryString.length;
    const codeBlock = queryString + code;
    const result = await this.graphState.graphManager.getCodeComplete(
      codeBlock,
      this.graph,
      offset,
    );
    return result.completions as CompletionItem[];
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

  override getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ) {
    return this.graphState.graphManager.valueSpecificationToPureCode(
      V1_serializeValueSpecification(value, []),
      pretty,
    );
  }

  private async getRelationalType(query: RawLambda): Promise<RelationType> {
    const relationType =
      await this.graphState.graphManager.getLambdaRelationType(
        query,
        this.graph,
      );
    return relationType;
  }

  override getQueryRelationType(query: V1_Lambda, source: DataCubeSource) {
    const lambda = this.buildRawLambdaFromValueSpec(query);
    return this.getRelationalType(lambda);
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
    const fullQuery = code + queryString;
    return this.getRelationalType(
      await this.graphState.graphManager.pureCodeToLambda(fullQuery),
    );
  }

  override async executeQuery(query: V1_Lambda, source: DataCubeSource) {
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

  override buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined {
    if (source instanceof QueryBuilderDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [
          source.mapping ? _elementPtr(source.mapping) : undefined,
          _elementPtr(source.runtime),
        ].filter(isNonNullable),
      );
    }
    return undefined;
  }
}
