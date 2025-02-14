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
import type { CSVFileDataCubeSourceBuilderState } from '../../../stores/builder/source/CSVFileDataCubeSourceBuilderState.js';
import { csvStringify, parseCSVFile } from '@finos/legend-shared';
import { DataCubeIcon } from '@finos/legend-art';
import { FormBadge_WIP } from '@finos/legend-data-cube';
import { useState } from 'react';

export const CSVFileDataCubeSourceBuilder = observer(
  (props: { sourceBuilder: CSVFileDataCubeSourceBuilderState }) => {
    const { sourceBuilder } = props;
    const [isDataUploaded, setIsDataUploaded] = useState<boolean>(false);
    const [csvData, setCsvData] = useState<unknown[][]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsDataUploaded(false);

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

            setCsvData(result.data.slice(0, 5));
            setIsDataUploaded(true);
          },
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
        });
      }
    };

    // TODO: use a react library which gives preview and let users set advance options
    return (
      <div className="flex h-full w-full flex-col space-y-4 p-4">
        <div className="mb-4 w-full border-l-2 border-amber-500 bg-gray-200 p-4 text-black">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-4">
              <DataCubeIcon.Warning className="h-12 w-12 text-amber-500" />
              <div className="flex flex-col space-y-3">
                <p className="text-lg font-medium">
                  This is an experimental feature with following limitations:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
                  <li>Not all CSV files may be compatible.</li>
                  <li>
                    Data cube views created from CSV data cannot be saved.
                  </li>
                  <li>
                    Data is processed locally and cannot be stored or shared.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-6 w-full items-center text-neutral-500">
          <FormBadge_WIP />
          <input
            type="file"
            onChange={handleFileChange}
            className="ml-1 w-full"
          />
        </div>
        {isDataUploaded && csvData.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-max table-auto border-collapse border border-gray-300">
              <thead>
                <tr>
                  {csvData[0] &&
                    Object.keys(csvData[0]).map((key) => (
                      <th
                        key={key}
                        className="border bg-gray-200 px-4 py-2 text-left"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {csvData.map((row) => {
                  const rowKey = Object.values(row).join('-');

                  return (
                    <tr key={rowKey} className="bg-white hover:bg-gray-50">
                      {Object.entries(row).map(([columnName, value]) => {
                        const cellKey = `${rowKey}-${columnName}`;

                        return (
                          <td key={cellKey} className="border px-4 py-2">
                            {value as string}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  },
);
