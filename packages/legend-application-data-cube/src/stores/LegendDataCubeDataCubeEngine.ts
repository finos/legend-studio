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
  BasicGraphManagerState,
  AbstractPureGraphManager,
} from '@finos/legend-graph';
import {
  _elementPtr,
  _functionName,
  DataCubeEngine,
  DataCubeSource,
  type RelationType,
  DataCubeQuery,
  type CompletionItem,
  _function,
  DataCubeFunction,
} from '@finos/legend-data-cube';
import {
  DocumentationEntry,
  guaranteeType,
  isNonNullable,
  LogEvent,
  LogService,
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import type { LegendDataCubeApplicationStore } from './LegendDataCubeBaseStore.js';
import {
  APPLICATION_EVENT,
  shouldDisplayVirtualAssistantDocumentationEntry,
} from '@finos/legend-application';

class QueryBuilderDataCubeSource extends DataCubeSource {
  mapping?: string | undefined;
  runtime!: string;
}

export class LegendDataCubeDataCubeEngine extends DataCubeEngine {
  readonly application: LegendDataCubeApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly graphManager: AbstractPureGraphManager;
  readonly graph: PureModel;
  // readonly logService = new LogService();
  // readonly graphState: GraphManagerState;
  // readonly selectInitialQuery: RawLambda;
  // readonly mappingPath: string | undefined;
  // readonly parameterValues: ParameterValue[] | undefined;
  // readonly runtimePath: string;
  // _parameters: object | undefined;

  constructor(
    application: LegendDataCubeApplicationStore,
    graphManagerState: GraphManagerState,
  ) {
    super();

    this.application = application;
    this.graphManagerState = graphManagerState;
    this.graphManager = graphManagerState.graphManager;
    this.graph = graphManagerState.graph;
  }

  // ---------------------------------- IMPLEMENTATION ----------------------------------

  // constructor(
  //   selectQuery: RawLambda,
  //   parameterValues: ParameterValue[] | undefined,
  //   mappingPath: string | undefined,
  //   runtimePath: string,
  //   graphManagerState: GraphManagerState,
  // ) {
  //   super();
  //   this.graphState = graphManagerState;
  //   this.selectInitialQuery = selectQuery;
  //   this.mappingPath = mappingPath;
  //   this.runtimePath = runtimePath;
  //   this.parameterValues = parameterValues;
  // }

  // get sourceLabel(): string {
  //   return `Query Builder Report`;
  // }

  // get graph(): PureModel {
  //   return this.graphState.graph;
  // }

  // private getSourceFunctionExpression() {
  //   let srcFuncExp = V1_deserializeValueSpecification(
  //     this.graphManager.serializeRawValueSpecification(
  //       this.selectInitialQuery,
  //     ),
  //     [],
  //   );
  //   // We could do a further check here to ensure the experssion is an applied funciton
  //   // this is because data cube expects an expression to be able to built further upon the queery
  //   if (
  //     srcFuncExp instanceof V1_Lambda &&
  //     srcFuncExp.body.length === 1 &&
  //     srcFuncExp.body[0]
  //   ) {
  //     srcFuncExp = srcFuncExp.body[0];
  //   }
  //   return srcFuncExp;
  // }

  // async getBaseQuery() {
  //   const srcFuncExp = this.getSourceFunctionExpression();
  //   this._parameters = this.selectInitialQuery.parameters;
  //   const fromFuncExp = new V1_AppliedFunction();
  //   fromFuncExp.function = _functionName(SUPPORTED_FUNCTIONS.FROM);
  //   fromFuncExp.parameters = [srcFuncExp];
  //   if (this.mappingPath) {
  //     fromFuncExp.parameters.push(_elementPtr(this.mappingPath));
  //   }
  //   if (this.runtimePath) {
  //     fromFuncExp.parameters.push(_elementPtr(this.runtimePath));
  //   }
  //   const columns = (await this.getRelationalType(this.selectInitialQuery))
  //     .columns;
  //   const query = new DataCubeQuery();
  //   query.query = `~[${columns.map((e) => `'${e.name}'`)}]->select()`;

  //   return query;
  // }

  private buildRawLambdaFromValueSpec(query: V1_Lambda): RawLambda {
    const json = guaranteeType(
      V1_deserializeRawValueSpecification(
        V1_serializeValueSpecification(query, []),
      ),
      V1_RawLambda,
    );
    return new RawLambda(json.parameters, json.body);
  }

  private async getRelationalType(query: RawLambda): Promise<RelationType> {
    const relationType = await this.graphManager.getLambdaRelationType(
      query,
      this.graph,
    );
    return relationType;
  }

  override async processQuerySource(
    value: PlainObject,
  ): Promise<DataCubeSource> {
    switch (value._type) {
      default:
        throw new UnsupportedOperationError(
          `Can't process query source of type '${value._type}'`,
        );
    }
  }

  override async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ) {
    const lambda = this.buildRawLambdaFromValueSpec(baseQuery);
    const queryString = await this.graphManager.lambdaToPureCode(lambda);
    let codeBlock = queryString + code;
    if (codeBlock[0] === '|') {
      codeBlock = codeBlock.substring(1);
    }
    const result = await this.graphManager.getCodeComplete(
      codeBlock,
      this.graph,
      undefined,
    );
    return result.completions as CompletionItem[];
  }

  override async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean,
  ) {
    return V1_deserializeValueSpecification(
      await this.graphManager.pureCodeToValueSpecification(
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
    return this.graphManager.valueSpecificationToPureCode(
      V1_serializeValueSpecification(value, []),
      pretty,
    );
  }

  override async getQueryRelationType(
    query: V1_Lambda,
    source: DataCubeSource,
  ) {
    const lambda = this.buildRawLambdaFromValueSpec(query);
    return this.getRelationalType(lambda);
  }

  override async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ) {
    const queryString = await this.graphManager.valueSpecificationToPureCode(
      V1_serializeValueSpecification(baseQuery, []),
    );
    const fullQuery = queryString + code;
    return this.getRelationalType(
      await this.graphManager.pureCodeToLambda(fullQuery),
    );
  }

  override async executeQuery(query: V1_Lambda, source: DataCubeSource) {
    const lambda = this.buildRawLambdaFromValueSpec(query);
    // lambda.parameters = this._parameters;
    const [executionWithMetadata, queryString] = await Promise.all([
      this.graphManager.runQuery(lambda, undefined, undefined, this.graph, {
        // parameterValues: this.parameterValues ?? [],
      }),
      this.graphManager.lambdaToPureCode(lambda),
    ]);
    const expectedTDS = guaranteeType(
      executionWithMetadata.executionResult,
      TDSExecutionResult,
      'Query returned expected to be of tabular data set',
    );
    const sql =
      expectedTDS.activities?.[0] instanceof RelationalExecutionActivities
        ? expectedTDS.activities[0].sql
        : undefined;
    if (!sql) {
      throw new Error(`Can't generate SQL for query`);
    }
    return {
      result: expectedTDS,
      executedQuery: queryString,
      executedSQL: sql,
    };
  }

  override buildExecutionContext(source: DataCubeSource) {
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

  // ---------------------------------- APPLICATION ----------------------------------

  override getDocumentationURL(): string | undefined {
    return this.application.documentationService.url;
  }

  override getDocumentationEntry(key: string) {
    return this.application.documentationService.getDocEntry(key);
  }

  override shouldDisplayDocumentationEntry(entry: DocumentationEntry) {
    return shouldDisplayVirtualAssistantDocumentationEntry(entry);
  }

  override openLink(url: string) {
    this.application.navigationService.navigator.visitAddress(url);
  }

  override sendTelemetry(event: string, data: PlainObject) {
    this.application.telemetryService.logEvent(event, data);
  }

  override logDebug(message: string, ...data: unknown[]) {
    this.application.logService.debug(
      LogEvent.create(APPLICATION_EVENT.DEBUG),
      message,
      ...data,
    );
  }

  override debugProcess(processName: string, ...data: [string, unknown][]) {
    this.application.logService.debug(
      LogEvent.create(APPLICATION_EVENT.DEBUG),
      `\n------ START DEBUG PROCESS: ${processName} ------`,
      ...data.flatMap(([key, value]) => [`\n[${key.toUpperCase()}]:`, value]),
      `\n------- END DEBUG PROCESS: ${processName} -------\n\n`,
    );
  }

  override logInfo(event: LogEvent, ...data: unknown[]) {
    this.application.logService.info(event, ...data);
  }

  override logWarning(event: LogEvent, ...data: unknown[]) {
    this.application.logService.warn(event, ...data);
  }

  override logError(event: LogEvent, ...data: unknown[]) {
    this.application.logService.error(event, ...data);
  }

  override logUnhandledError(error: Error) {
    this.application.logUnhandledError(error);
  }

  override logIllegalStateError(message: string, error?: Error) {
    this.logError(
      LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
      message,
      error,
    );
  }
}
