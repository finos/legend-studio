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

import { DataCubeIcon } from '@finos/legend-art';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { DATE_TIME_FORMAT } from '@finos/legend-graph';
import {
  ContentType,
  downloadFileUsingDataURI,
  formatDate,
} from '@finos/legend-shared';
import type { DataCubeExecutionError } from '../../stores/core/DataCubeEngine.js';
import {
  FormButton,
  FormCheckbox,
  FormCodeEditor,
} from './DataCubeFormUtils.js';
import { useState } from 'react';

export function DataCubeExecutionErrorAlert(props: {
  error: DataCubeExecutionError;
  message: string;
  text?: string | undefined;
  onClose: () => void;
}) {
  const { error, message, text, onClose } = props;
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const queryCode = error.queryCode;
  const executeInput = error.executeInput;
  let prompt = undefined;
  if (executeInput !== undefined && queryCode !== undefined) {
    prompt = `Check the execute input and the query code below to debug or report issue`;
  } else if (queryCode !== undefined) {
    prompt = `Check the query code below to debug or report issue`;
  } else if (executeInput !== undefined) {
    prompt = `Check the execute input below to debug or report issue`;
  }

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full pt-2">
        <div className="h-full w-full overflow-auto">
          <div className="flex w-full p-6 pb-4">
            <div className="mr-3">
              <DataCubeIcon.AlertError className="flex-shrink-0 stroke-[0.5px] text-[40px] text-red-500" />
            </div>
            <div>
              <div className="whitespace-break-spaces text-lg">{message}</div>
              <div className="mt-1 whitespace-break-spaces text-neutral-500">
                {text}
              </div>
            </div>
          </div>
          {showDebugInfo && (
            <>
              <div className="h-[1px] w-full bg-neutral-300" />
              {prompt !== undefined && (
                <div className="pl-5 pt-1">{prompt}</div>
              )}
              {queryCode !== undefined && (
                <div className="h-40 justify-center px-4 pt-1">
                  <div className="h-full w-full">
                    <FormCodeEditor
                      value={queryCode}
                      isReadOnly={true}
                      title="Query Code"
                      language={CODE_EDITOR_LANGUAGE.PURE}
                      hidePadding={true}
                    />
                  </div>
                </div>
              )}
              {executeInput !== undefined && (
                <div className="h-40 justify-center px-4 pt-1">
                  <div className="h-full w-full">
                    <FormCodeEditor
                      value={JSON.stringify(executeInput, null, 2)}
                      isReadOnly={true}
                      title="Execute Input"
                      language={CODE_EDITOR_LANGUAGE.JSON}
                      hidePadding={true}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex h-10 items-center justify-between border border-t-neutral-300 px-2">
        <div className="flex h-full items-center pl-1">
          <FormCheckbox
            label="Show debug info?"
            checked={showDebugInfo}
            onChange={() => setShowDebugInfo(!showDebugInfo)}
          />
        </div>
        <div className="flex">
          <FormButton onClick={onClose}>OK</FormButton>
          {showDebugInfo && (
            <FormButton
              className="ml-2"
              onClick={() =>
                downloadFileUsingDataURI(
                  `DEBUG__ExecuteInput__${formatDate(
                    new Date(Date.now()),
                    DATE_TIME_FORMAT,
                  )}.json`,
                  JSON.stringify(executeInput, null, 2),
                  ContentType.APPLICATION_JSON,
                )
              }
            >
              Download Execute Input
            </FormButton>
          )}
        </div>
      </div>
    </>
  );
}
