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
  hashArray,
} from '@finos/legend-shared';
import { action, makeObservable, observable, runInAction } from 'mobx';
import type { GridApi } from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeGridClientServerSideDataSource } from './DataCubeGridClientEngine.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { generateGridOptionsFromSnapshot } from './DataCubeGridQuerySnapshotAnalyzer.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

class DataCubeGridDatasourceConfiguration {
  readonly limit?: number | undefined;

  constructor(input: {
    snapshot?: DataCubeQuerySnapshot | undefined;
    queryConfiguration?: DataCubeConfiguration | undefined;
  }) {
    const { snapshot } = input;
    this.limit = snapshot?.data.limit;
  }

  get hashCode(): string {
    return hashArray([`limit: ${this.limit ?? ''}`]);
  }
}

export class DataCubeGridState extends DataCubeQuerySnapshotSubscriber {
  private _client?: GridApi | undefined;
  clientDataSource: DataCubeGridClientServerSideDataSource;
  clientLicenseKey?: string | undefined;

  isPaginationEnabled = false;
  scrollHintText = '';
  datasourceConfiguration: DataCubeGridDatasourceConfiguration;
  queryConfiguration: DataCubeConfiguration;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      clientDataSource: observable,
      datasourceConfiguration: observable,
      queryConfiguration: observable,

      clientLicenseKey: observable,
      setClientLicenseKey: action,

      isPaginationEnabled: observable,
      setPaginationEnabled: action,

      scrollHintText: observable,
      setScrollHintText: action,

      generateCSVFile: action,
      generateExcelFile: action,
      generateEmail: action,
    });

    this.datasourceConfiguration = new DataCubeGridDatasourceConfiguration({});
    this.queryConfiguration = new DataCubeConfiguration();
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setClientLicenseKey(val: string): void {
    this.clientLicenseKey = val;
  }

  setPaginationEnabled(val: boolean): void {
    this.isPaginationEnabled = val;

    // hard reset the grid, this will force the grid to fetch data again
    // NOTE: if we don't fully reset the datasource, and say we just turned on pagination,
    // for how many page that we loaded when pagination is off, the datasource
    // will fire that many data fetch operations which is expensive.
    this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
  }

  setScrollHintText(val: string): void {
    this.scrollHintText = val;
  }

  get client(): GridApi {
    return guaranteeNonNullable(this._client, 'Grid client is not configured');
  }

  configureClient(val: GridApi | undefined): void {
    this._client = val;
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
    const existingExtraConfiguration = this.datasourceConfiguration;
    const queryConfiguration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );

    // NOTE: if one of the change affects the structure of the data cube but cannot be captured
    // in the grid client options, we will need to manually reset the grid by resetting the
    // datasource to ensure we don't fetch the result twice while forcing the data to be refreshed
    runInAction(() => {
      this.datasourceConfiguration = new DataCubeGridDatasourceConfiguration({
        snapshot,
        queryConfiguration,
      });
      this.queryConfiguration = queryConfiguration;
    });
    if (
      existingExtraConfiguration.hashCode !==
      this.datasourceConfiguration.hashCode
    ) {
      // reset the entire grid
      this.clientDataSource = new DataCubeGridClientServerSideDataSource(this);
    }

    const gridOptions = generateGridOptionsFromSnapshot(
      snapshot,
      queryConfiguration,
      this.dataCube,
    );
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
From:
To:
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

      downloadFileUsingDataURI(
        'emlFile.eml',
        emlContent,
        ContentType.MESSAGE_RFC822,
      ); //NEED TO ADD MESSAGE_RFC822 to CONTENT-TYPE
    } catch (error) {
      console.error('Error creating EML file:', error);
    }
  };
}
