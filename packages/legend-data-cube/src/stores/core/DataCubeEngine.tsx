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
  type V1_ValueSpecification,
  type V1_Lambda,
  type TDSExecutionResult,
  type V1_AppliedFunction,
  PRIMITIVE_TYPE,
  type EngineError,
} from '@finos/legend-graph';
import { getFilterOperation } from './filter/DataCubeQueryFilterOperation.js';
import { getAggregateOperation } from './aggregation/DataCubeQueryAggregateOperation.js';
import { DataCubeQueryAggregateOperation__Sum } from './aggregation/DataCubeQueryAggregateOperation__Sum.js';
import { DataCubeQueryAggregateOperation__Average } from './aggregation/DataCubeQueryAggregateOperation__Average.js';
import { DataCubeQueryAggregateOperation__Count } from './aggregation/DataCubeQueryAggregateOperation__Count.js';
import { DataCubeQueryAggregateOperation__Min } from './aggregation/DataCubeQueryAggregateOperation__Min.js';
import { DataCubeQueryAggregateOperation__Max } from './aggregation/DataCubeQueryAggregateOperation__Max.js';
import { DataCubeQueryAggregateOperation__UniqueValue } from './aggregation/DataCubeQueryAggregateOperation__UniqueValue.js';
import { DataCubeQueryAggregateOperation__First } from './aggregation/DataCubeQueryAggregateOperation__First.js';
import { DataCubeQueryAggregateOperation__Last } from './aggregation/DataCubeQueryAggregateOperation__Last.js';
import { DataCubeQueryAggregateOperation__VariancePopulation } from './aggregation/DataCubeQueryAggregateOperation__VariancePopulation.js';
import { DataCubeQueryAggregateOperation__VarianceSample } from './aggregation/DataCubeQueryAggregateOperation__VarianceSample.js';
import { DataCubeQueryAggregateOperation__StdDevPopulation } from './aggregation/DataCubeQueryAggregateOperation__StdDevPopulation.js';
import { DataCubeQueryAggregateOperation__StdDevSample } from './aggregation/DataCubeQueryAggregateOperation__StdDevSample.js';
import { DataCubeQueryAggregateOperation__JoinStrings } from './aggregation/DataCubeQueryAggregateOperation__JoinStrings.js';
import { DataCubeQueryFilterOperation__Equal } from './filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from './filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';
import { DataCubeQueryFilterOperation__LessThan } from './filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from './filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__GreaterThan } from './filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__NotEqual } from './filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__EqualColumn } from './filter/DataCubeQueryFilterOperation__EqualColumn.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitive } from './filter/DataCubeQueryFilterOperation__EqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitive } from './filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn } from './filter/DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn } from './filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualColumn } from './filter/DataCubeQueryFilterOperation__NotEqualColumn.js';
import { DataCubeQueryFilterOperation__LessThanColumn } from './filter/DataCubeQueryFilterOperation__LessThanColumn.js';
import { DataCubeQueryFilterOperation__LessThanOrEqualColumn } from './filter/DataCubeQueryFilterOperation__LessThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanColumn } from './filter/DataCubeQueryFilterOperation__GreaterThanColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqualColumn } from './filter/DataCubeQueryFilterOperation__GreaterThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__Contain } from './filter/DataCubeQueryFilterOperation__Contain.js';
import { DataCubeQueryFilterOperation__ContainCaseInsensitive } from './filter/DataCubeQueryFilterOperation__ContainCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotContain } from './filter/DataCubeQueryFilterOperation__NotContain.js';
import { DataCubeQueryFilterOperation__StartWith } from './filter/DataCubeQueryFilterOperation__StartWith.js';
import { DataCubeQueryFilterOperation__StartWithCaseInsensitive } from './filter/DataCubeQueryFilterOperation__StartWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotStartWith } from './filter/DataCubeQueryFilterOperation__NotStartWith.js';
import { DataCubeQueryFilterOperation__EndWith } from './filter/DataCubeQueryFilterOperation__EndWith.js';
import { DataCubeQueryFilterOperation__EndWithCaseInsensitive } from './filter/DataCubeQueryFilterOperation__EndWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEndWith } from './filter/DataCubeQueryFilterOperation__NotEndWith.js';
import { DataCubeQueryFilterOperation__IsNull } from './filter/DataCubeQueryFilterOperation__IsNull.js';
import { DataCubeQueryFilterOperation__IsNotNull } from './filter/DataCubeQueryFilterOperation__IsNotNull.js';
import {
  CODE_EDITOR_LANGUAGE,
  configureCodeEditor,
  setupPureLanguageService,
} from '@finos/legend-code-editor';
import { DataCubeFont } from './DataCubeQueryEngine.js';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import { buildExecutableQuery } from './DataCubeQueryBuilder.js';
import type { DataCubeColumn } from './models/DataCubeColumn.js';
import { LicenseManager } from 'ag-grid-enterprise';
import {
  type DataCubeSource,
  INTERNAL__DataCubeSource,
} from './models/DataCubeSource.js';
import { _primitiveValue } from './DataCubeQueryBuilderUtils.js';
import {
  uuid,
  type DocumentationEntry,
  type LogEvent,
  type PlainObject,
} from '@finos/legend-shared';
import {
  Alert,
  AlertType,
  type ActionAlertAction,
} from '../../components/core/DataCubeAlert.js';
import {
  DEFAULT_SMALL_ALERT_WINDOW_CONFIG,
  LayoutConfiguration,
  LayoutManagerState,
  WindowState,
  type WindowConfiguration,
} from './DataCubeLayoutManagerState.js';
import { editor as monacoEditorAPI, Uri } from 'monaco-editor';
import { DataCubeCodeCheckErrorAlert } from '../../components/core/DataCubeCodeCheckErrorAlert.js';
import type { DataCubeAPI } from '../DataCubeAPI.js';

export type CompletionItem = {
  completion: string;
  display: string;
};

export type DataCubeRelationType = {
  columns: DataCubeColumn[];
};

export type DataCubeExecutionResult = {
  result: TDSExecutionResult;
  executedQuery: string;
  executedSQL: string;
};

export abstract class DataCubeEngine {
  readonly layout = new LayoutManagerState();
  readonly filterOperations = [
    new DataCubeQueryFilterOperation__LessThan(),
    new DataCubeQueryFilterOperation__LessThanOrEqual(),
    new DataCubeQueryFilterOperation__Equal(),
    new DataCubeQueryFilterOperation__NotEqual(),
    new DataCubeQueryFilterOperation__GreaterThanOrEqual(),
    new DataCubeQueryFilterOperation__GreaterThan(),

    new DataCubeQueryFilterOperation__IsNull(),
    new DataCubeQueryFilterOperation__IsNotNull(),

    new DataCubeQueryFilterOperation__EqualCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotEqualCaseInsensitive(),
    new DataCubeQueryFilterOperation__Contain(),
    new DataCubeQueryFilterOperation__ContainCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotContain(),
    new DataCubeQueryFilterOperation__StartWith(),
    new DataCubeQueryFilterOperation__StartWithCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotStartWith(),
    new DataCubeQueryFilterOperation__EndWith(),
    new DataCubeQueryFilterOperation__EndWithCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotEndWith(),

    new DataCubeQueryFilterOperation__LessThanColumn(),
    new DataCubeQueryFilterOperation__LessThanOrEqualColumn(),
    new DataCubeQueryFilterOperation__EqualColumn(),
    new DataCubeQueryFilterOperation__NotEqualColumn(),
    new DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn(),
    new DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn(),
    new DataCubeQueryFilterOperation__GreaterThanColumn(),
    new DataCubeQueryFilterOperation__GreaterThanOrEqualColumn(),
  ];
  readonly aggregateOperations = [
    new DataCubeQueryAggregateOperation__Sum(),
    new DataCubeQueryAggregateOperation__Average(),
    new DataCubeQueryAggregateOperation__Count(),
    new DataCubeQueryAggregateOperation__Min(),
    new DataCubeQueryAggregateOperation__Max(),
    new DataCubeQueryAggregateOperation__UniqueValue(),
    new DataCubeQueryAggregateOperation__First(),
    new DataCubeQueryAggregateOperation__Last(),
    new DataCubeQueryAggregateOperation__VariancePopulation(),
    new DataCubeQueryAggregateOperation__VarianceSample(),
    new DataCubeQueryAggregateOperation__StdDevPopulation(),
    new DataCubeQueryAggregateOperation__StdDevSample(),
    new DataCubeQueryAggregateOperation__JoinStrings(),
  ];

  async initialize(options?: {
    gridClientLicense?: string | undefined;
  }): Promise<void> {
    if (options?.gridClientLicense) {
      LicenseManager.setLicenseKey(options.gridClientLicense);
    }
    await configureCodeEditor(DataCubeFont.ROBOTO_MONO, (error) => {
      throw error;
    });
    setupPureLanguageService({});
  }

  // ------------------------------- CORE OPERATIONS -------------------------------

  getFilterOperation(value: string) {
    return getFilterOperation(value, this.filterOperations);
  }

  getAggregateOperation(value: string) {
    return getAggregateOperation(value, this.aggregateOperations);
  }

  /**
   * By default, for a function chain, Pure grammar composer will extract the first parameter of the first function
   * and render it as the caller of that function rather than a parameter
   * e.g. fx(fy(p1, p2), p3) will be rendered as p1->fy(p2)->fx(p3) instead of fy(p1, p2)-> fx(p3)
   *
   * We do a hack to get around this by setting a dummy value as the first parameter of the first function in the chain.
   * Then remove this dummy value from the final code.
   */
  async getPartialQueryCode(
    snapshot: DataCubeQuerySnapshot,
    pretty?: boolean | undefined,
  ) {
    const source = new INTERNAL__DataCubeSource();
    source.query = _primitiveValue(PRIMITIVE_TYPE.STRING, '');
    return (
      await this.getValueSpecificationCode(
        buildExecutableQuery(
          snapshot,
          source,
          () => undefined,
          this.filterOperations,
          this.aggregateOperations,
        ),
        pretty,
      )
    ).substring(`''->`.length);
  }

  // ---------------------------------- INTERFACE ----------------------------------

  abstract processQuerySource(value: PlainObject): Promise<DataCubeSource>;

  abstract parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ): Promise<V1_ValueSpecification>;

  abstract getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ): Promise<string>;

  abstract getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ): Promise<CompletionItem[]>;

  abstract getQueryRelationType(
    query: V1_Lambda,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType>;

  abstract getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType>;

  abstract executeQuery(
    query: V1_Lambda,
    source: DataCubeSource,
    api: DataCubeAPI,
  ): Promise<DataCubeExecutionResult>;

  abstract buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined;

  // ---------------------------------- DOCUMENTATION ----------------------------------

  getDocumentationURL(): string | undefined {
    return undefined;
  }

  getDocumentationEntry(key: string): DocumentationEntry | undefined {
    return undefined;
  }

  shouldDisplayDocumentationEntry(entry: DocumentationEntry) {
    return false;
  }

  // ---------------------------------- LOGGING ----------------------------------

  logDebug(message: string, ...data: unknown[]) {
    // do nothing
  }

  debugProcess(processName: string, ...data: [string, unknown][]) {
    // do nothing
  }

  logInfo(event: LogEvent, ...data: unknown[]) {
    // do nothing
  }

  logWarning(event: LogEvent, ...data: unknown[]) {
    // do nothing
  }

  logError(event: LogEvent, ...data: unknown[]) {
    // do nothing
  }

  logUnhandledError(error: Error) {
    // do nothing
  }

  logIllegalStateError(message: string, error?: Error) {
    // do nothing
  }

  // ---------------------------------- ALERT ----------------------------------

  alert(options: {
    message: string;
    type: AlertType;
    text?: string | undefined;
    actions?: ActionAlertAction[] | undefined;
    windowTitle?: string | undefined;
    windowConfig?: WindowConfiguration | undefined;
  }) {
    const { message, type, text, actions, windowTitle, windowConfig } = options;
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? '', () => (
        <Alert
          type={type}
          message={message}
          text={text}
          actions={actions}
          onClose={() => this.layout.closeWindow(window)}
        />
      )),
    );
    window.configuration.window =
      windowConfig ?? DEFAULT_SMALL_ALERT_WINDOW_CONFIG;
    this.layout.newWindow(window);
  }

  alertError(
    error: Error,
    options: {
      message: string;
      text?: string | undefined;
      actions?: ActionAlertAction[] | undefined;
      windowTitle?: string | undefined;
      windowConfig?: WindowConfiguration | undefined;
    },
  ) {
    const { message, text, actions, windowTitle, windowConfig } = options;
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? 'Error', () => (
        <Alert
          type={AlertType.ERROR}
          message={message}
          text={text}
          actions={actions}
        />
      )),
    );
    window.configuration.window =
      windowConfig ?? DEFAULT_SMALL_ALERT_WINDOW_CONFIG;
    this.layout.newWindow(window);
  }

  alertUnhandledError(error: Error) {
    this.logUnhandledError(error);
    this.alertError(error, {
      message: error.message,
    });
  }

  alertCodeCheckError(
    error: EngineError,
    code: string,
    codePrefix: string,
    options: {
      message: string;
      text?: string | undefined;
      actions?: ActionAlertAction[] | undefined;
      windowTitle?: string | undefined;
      windowConfig?: WindowConfiguration | undefined;
    },
  ) {
    const { message, text, windowTitle, windowConfig } = options;
    // correct the source information since we added prefix to the code
    // and reveal error in the editor
    if (error.sourceInformation) {
      error.sourceInformation.startColumn -=
        error.sourceInformation.startLine === 1 ? codePrefix.length : 0;
      error.sourceInformation.endColumn -=
        error.sourceInformation.endLine === 1 ? codePrefix.length : 0;
      const editorModel = monacoEditorAPI.createModel(
        code,
        CODE_EDITOR_LANGUAGE.PURE,
        Uri.file(`/${uuid()}.pure`),
      );

      const fullRange = editorModel.getFullModelRange();
      if (
        error.sourceInformation.startLine < 1 ||
        (error.sourceInformation.startLine === 1 &&
          error.sourceInformation.startColumn < 1) ||
        error.sourceInformation.endLine > fullRange.endLineNumber ||
        (error.sourceInformation.endLine === fullRange.endLineNumber &&
          error.sourceInformation.endColumn > fullRange.endColumn)
      ) {
        error.sourceInformation.startColumn = fullRange.startColumn;
        error.sourceInformation.startLine = fullRange.startLineNumber;
        error.sourceInformation.endColumn = fullRange.endColumn;
        error.sourceInformation.endLine = fullRange.endLineNumber;
      }
      const window = new WindowState(
        new LayoutConfiguration(windowTitle ?? 'Error', () => (
          <DataCubeCodeCheckErrorAlert
            editorModel={editorModel}
            error={error}
            message={message}
            text={text}
          />
        )),
      );
      window.configuration.window = windowConfig ?? {
        width: 500,
        height: 400,
        minWidth: 300,
        minHeight: 300,
        center: true,
      };
      this.layout.newWindow(window);
    }
  }

  // ---------------------------------- MISC ----------------------------------

  openLink(url: string) {
    // do nothing
  }

  sendTelemetry(event: string, data: PlainObject) {
    // do nothing
  }
}
