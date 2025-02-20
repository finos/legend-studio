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

import { observer } from 'mobx-react-lite';
import { AlertType, FormAlert, FormCodeEditor } from '@finos/legend-data-cube';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import type { LocalFileDataCubeSourceLoaderBuilderState } from '../../../../stores/builder/source/loader/LocalFileDataCubeSourceLoaderBuilderState.js';

export const LocalFileDataCubeSourceLoader = observer(
  (props: { sourceBuilder: LocalFileDataCubeSourceLoaderBuilderState }) => {
    const { sourceBuilder } = props;

    return (
      <div className="h-full w-full p-2">
        <FormAlert
          message="Local file support is experimental"
          type={AlertType.WARNING}
          text={`Currently, support for local file comes with the following limitations:
- Only CSV files are supported, but not all variants of CSV files are supported (required header row, comma delimiter, single escape quote).
- Data from uploaded file will not be stored nor shared.
- DataCube created with local file source cannot be saved.`}
        />
        <div className="mt-2 flex h-6 w-full items-center text-neutral-500">
          <input
            type="file"
            onChange={(event) => {
              sourceBuilder.processFile(event.target.files?.[0]);
            }}
            className="w-full"
          />
        </div>
        {sourceBuilder.previewText !== undefined && (
          <div className="mt-2 h-40">
            <FormCodeEditor
              value={sourceBuilder.previewText}
              language={CODE_EDITOR_LANGUAGE.TEXT}
              isReadOnly={true}
              hidePadding={true}
              title="Data Preview"
            />
          </div>
        )}
      </div>
    );
  },
);
