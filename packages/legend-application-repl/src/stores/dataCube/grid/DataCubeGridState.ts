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
  ContentType,
  downloadFileUsingDataURI,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { GridApi } from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeGridClientServerSideDataSource } from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridQuerySnapshotAnalyzer.js';

export class DataCubeGridState extends DataCubeQuerySnapshotSubscriber {
  private _client?: GridApi | undefined;
  clientDataSource: DataCubeGridClientServerSideDataSource;
  clientLicenseKey?: string | undefined;
  isPaginationEnabled = false;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      clientDataSource: observable,
      clientLicenseKey: observable,
      setClientLicenseKey: action,
      isPaginationEnabled: observable,
      setPaginationEnabled: action,
      generateCSVFile: action,
      generateExcelFile: action,
      generateEmail: action,
    });

    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setClientLicenseKey(val: string): void {
    this.clientLicenseKey = val;
  }

  setPaginationEnabled(val: boolean): void {
    this.isPaginationEnabled = val;

    // When pagination is toggled off, we don't need to reset the grid since data is
    // already loaded data will still be there, but we need to collapse all expanded
    // row groupings since the data there are now stale.
    // Maybe, we can handle this transition more elegantly by refreshing data for all
    // expanded row groupings as well, but for now, we opt for the simple mechanics.
    if (!this.isPaginationEnabled) {
      this.client.collapseAll();
      this.client.refreshServerSide();
    } else {
      // When pagination is toggled on, we simply reset the grid to clear all data and reset scroll;
      // otherwise each page that we already loaded when pagination is off will get refetched by
      // server-side data source, which is expensive.
      this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
    }
  }

  configureClient(val: GridApi | undefined): void {
    this._client = val;
  }

  get client(): GridApi {
    return guaranteeNonNullable(this._client, 'Grid client is not configured');
  }

  override async applySnapshot(snapshot: DataCubeQuerySnapshot): Promise<void> {
    const gridOptions = generateGridOptionsFromSnapshot(snapshot);
    this.client.updateGridOptions(gridOptions);
  }

  override async initialize(): Promise<void> {
    this.setClientLicenseKey(
      await this.dataCube.replStore.client.getGridClientLicenseKey(),
    );
  }

  generateCSVFile = () => {
    const params = {
      fileName: 'csv_data.csv',
    };
    if (this._client) {
      this._client.exportDataAsCsv(params);
    } else {
      console.error('Grid API not set');
    }
  };

  generateExcelFile = () => {
    if (!this._client) {
      throw new Error('Grid API is not initialized.');
    }
    const params = {
      fileName: 'excel_data.xlsx',
      processCellCallbacks: (cell: any) => {
        return cell ? cell.toString() : '';
      },
    };
    this._client.exportDataAsExcel(params);
  };

  blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64Data = result.split(',')[1];
          if (base64Data) {
            resolve(base64Data);
          } else {
            console.error('Base64 conversion failed: Invalid base64 data.');
            reject(
              new Error('Failed to convert blob to base64. Base64 is invalid.'),
            );
          }
        } else {
          console.error(
            'Base64 conversion failed: FileReader result is not a string.',
          );
          reject(
            new Error(
              'Failed to convert blob to base64. FileReader result is not a string.',
            ),
          );
        }
      };
      reader.onerror = (error) => {
        console.error('Base64 conversion failed: FileReader error.', error);
        reject(
          new Error('Failed to convert blob to base64: FileReader error.'),
        );
      };
      reader.readAsDataURL(blob);
    });
  };

  generateEmail = async (isHtml: boolean, includeAttachments: boolean) => {
    try {
      const textContent =
        'Please find the attached CSV and Excel(.xlsx) files.';
      const htmlContent = `
      <html>
       <body>
        <p>${textContent}</p>
       <body>
      </html>
      `;

      const emailBody = isHtml ? htmlContent : textContent;
      const contentType = isHtml ? 'text/html' : 'text/plain';
      const boundaryMixed = 'boundary----------123456789----------987654321';
      const boundaryAlternative =
        'boundary----------0987654321----------1234567890';

      let emlContent = `
From: somebody@test.com
To: someone@test.com
Subject: subject of the some files generated
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="${boundaryMixed}"

--${boundaryMixed}
Content-Type: multipart/alternative; boundary="${boundaryAlternative}"

--${boundaryAlternative}
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${textContent}

--${boundaryAlternative}
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${htmlContent}

--${boundaryAlternative}--
`;

      if (includeAttachments) {
        const csvContent =
          this._client?.getDataAsCsv({
            fileName: 'csv_data.csv',
            columnSeparator: ',',
            suppressQuotes: true,
          }) ?? '';
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });

        const xlsxContent = this._client?.getDataAsExcel({
          fileName: 'excel_data.xlsx',
          processCellCallback: (cell: any) => {
            return cell ? cell.toString() : '';
          },
        });
        let xlsxBlob;
        if (xlsxContent instanceof Blob) {
          xlsxBlob = xlsxContent;
        } else if (typeof xlsxContent === 'string') {
          xlsxBlob = new Blob([xlsxContent], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        } else {
          throw new Error('Failed to generate Excel content.');
        }

        emlContent += `
--${boundaryMixed}
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="excel_data.xlsx"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="excel_data.xlsx"

${await this.blobToBase64(xlsxBlob)}

--${boundaryMixed}
Content-Type: text/csv; name="csv_data.csv"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="csv_data.csv"

${await this.blobToBase64(csvBlob)};

--${boundaryMixed}--

`;
      } else {
        emlContent += `
Content-Type: ${contentType}; charset= "UTF-8"
Content-Transfer-Encoding: 7bit

${emailBody}
`;
      }

      downloadFileUsingDataURI('emlFile.eml', emlContent, ContentType.ALL); //NEED TO ADD MESSAGE_RFC822 to CONTENT-TYPE
    } catch (error) {
      console.error('Error creating EML file:', error);
    }
  };
}
