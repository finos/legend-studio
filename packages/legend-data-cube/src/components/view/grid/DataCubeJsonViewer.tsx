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

import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { assertErrorThrown } from '@finos/legend-shared';
import { FormButton, FormCodeEditor } from '../../core/DataCubeFormUtils.js';
import {
  LayoutConfiguration,
  WindowState,
} from '../../../stores/services/DataCubeLayoutService.js';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';
import {
  formatDataCubeJsonPretty,
  readDataCubeJson,
} from '../../../stores/core/variant/DataCubeJson.js';

export function DataCubeJsonViewer(props: {
  json: string;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  const { json, onCopy, onClose } = props;
  const node = readDataCubeJson(json);
  const text = node ? formatDataCubeJsonPretty(node) : json;

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <FormCodeEditor
          value={text}
          isReadOnly={true}
          title="Value"
          language={CODE_EDITOR_LANGUAGE.JSON}
          hidePadding={true}
        />
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton onClick={() => onCopy(text)}>Copy</FormButton>
        <FormButton className="ml-2" onClick={onClose}>
          Close
        </FormButton>
      </div>
    </>
  );
}

export function openDataCubeJsonViewer(
  view: DataCubeViewState,
  columnName: string,
  json: string,
) {
  const window = new WindowState(
    new LayoutConfiguration(`JSON: ${columnName}`, () => (
      <DataCubeJsonViewer
        json={json}
        onCopy={(text) => {
          navigator.clipboard.writeText(text).catch((error: unknown) => {
            assertErrorThrown(error);
            view.alertService.alertUnhandledError(error);
          });
        }}
        onClose={() => view.layoutService.closeWindow(window)}
      />
    )),
  );
  window.configuration.window = {
    width: 600,
    height: 420,
    minWidth: 300,
    minHeight: 200,
    center: true,
  };
  view.layoutService.newWindow(window);
}
