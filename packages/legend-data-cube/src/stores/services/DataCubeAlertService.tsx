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

import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import {
  type DataCubeLayoutService,
  DEFAULT_ALERT_WINDOW_CONFIG,
  LayoutConfiguration,
  WindowState,
  type WindowConfiguration,
} from './DataCubeLayoutService.js';
import { Alert } from '../../components/core/DataCubeAlert.js';
import type { EngineError } from '@finos/legend-graph';
import { editor as monacoEditorAPI, Uri } from 'monaco-editor';
import { DataCubeCodeCheckErrorAlert } from '../../components/core/DataCubeCodeCheckErrorAlert.js';
import { uuid } from '@finos/legend-shared';
import type { DataCubeLogService } from './DataCubeLogService.js';
import type { DataCubeExecutionError } from '../core/DataCubeEngine.js';
import { DataCubeExecutionErrorAlert } from '../../components/core/DataCubeExecutionErrorAlert.js';

export enum AlertType {
  ERROR = 'ERROR',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
}

export type ActionAlertAction = { label: string; handler: () => void };

export type ActionAlert = {
  title?: string | undefined;
  message: string;
  prompt?: string | undefined;
  type: AlertType;
  text?: string | undefined;
  actions?: ActionAlertAction[] | undefined;
  onClose?: () => void;
};

export type ActionAlertOptions = {
  message: string;
  text?: string | undefined;
  actions?: ActionAlertAction[] | undefined;
  windowTitle?: string | undefined;
  windowConfig?: WindowConfiguration | undefined;
};

export class DataCubeAlertService {
  private readonly _logService: DataCubeLogService;
  private readonly _layoutService: DataCubeLayoutService;

  constructor(
    logService: DataCubeLogService,
    layoutService: DataCubeLayoutService,
  ) {
    this._logService = logService;
    this._layoutService = layoutService;
  }

  alert(
    options: ActionAlertOptions & {
      type: AlertType;
    },
  ) {
    const { message, type, text, actions, windowTitle, windowConfig } = options;
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? '', () => (
        <Alert
          type={type}
          message={message}
          text={text}
          actions={actions}
          onClose={() => this._layoutService.closeWindow(window)}
        />
      )),
    );
    window.configuration.window = windowConfig ?? DEFAULT_ALERT_WINDOW_CONFIG;
    this._layoutService.newWindow(window);
  }

  alertError(error: Error, options: ActionAlertOptions) {
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
    window.configuration.window = windowConfig ?? DEFAULT_ALERT_WINDOW_CONFIG;
    this._layoutService.newWindow(window);
  }

  alertUnhandledError(error: Error) {
    this._logService.logUnhandledError(error);
    this.alertError(error, {
      message: error.message,
    });
  }

  alertCodeCheckError(
    error: EngineError,
    code: string,
    codePrefix: string,
    options: ActionAlertOptions,
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
      this._layoutService.newWindow(window);
    }
  }

  alertExecutionError(
    error: DataCubeExecutionError,
    options: ActionAlertOptions,
  ) {
    const { message, text, windowTitle, windowConfig } = options;
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? 'Error', () => (
        <DataCubeExecutionErrorAlert
          error={error}
          message={message}
          text={text}
          onClose={() => this._layoutService.closeWindow(window)}
        />
      )),
    );
    window.configuration.window = windowConfig ?? {
      width: 600,
      height: 250, // leave some space to show debug content
      minWidth: 500,
      minHeight: 200,
      center: true,
    };
    this._layoutService.newWindow(window);
  }
}
