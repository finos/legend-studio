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
import type { CSVFileQueryDataCubeSourceBuilderState } from '../../../stores/builder/source/CSVFileQueryDataCubeSourceBuilderState.js';
import { csvStringify, parseCSVFile } from '@finos/legend-shared';

export const CSVFileQueryDataCubeSourceBuilder = observer(
  (props: { sourceBuilder: CSVFileQueryDataCubeSourceBuilderState }) => {
    const { sourceBuilder } = props;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files ? e.target.files[0] : null;

      if (file) {
        parseCSVFile(file, {
          complete: (result) => {
            // Set the parsed data to state
            sourceBuilder.setFileData(
              csvStringify(result.data, { escapeChar: `'`, quoteChar: `'` }),
            );
            sourceBuilder.setFileName(file.name);
            sourceBuilder.setRowCount(result.data.length);
          },
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
        });
      }
    };

    return (
      <div className="flex h-full w-full">
        <div className="flex h-6 items-center text-neutral-500">
          <input type="file" onChange={handleFileChange} />
        </div>
      </div>
    );
  },
);
