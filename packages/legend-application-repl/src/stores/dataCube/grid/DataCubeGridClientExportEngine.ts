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
  formatDate,
  IllegalStateError,
  isString,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeGridState } from './DataCubeGridState.js';
import { DataCubeGridClientExportFormat } from './DataCubeGridClientEngine.js';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (isString(result)) {
        const base64Data = result.split(',')[1];
        if (base64Data) {
          resolve(base64Data);
          return;
        }
      }
      reject(new Error(`Can't base64 encode blob data`));
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}

const EMAIL_TEXT_CONTENT = '';
const EMAIL_HTML_CONTENT = `<html><body><p>${EMAIL_TEXT_CONTENT}</p><body></html>`;
// See https://stackoverflow.com/questions/3902455/mail-multipart-alternative-vs-multipart-mixed
const EMAIL_MIXED_BOUNDARY = 'mixed_boundary';
const EMAIL_ALTERNATIVE_BOUNDARY = 'alternative_boundary';
const EMAIL_CONTENT = `
From:
To:
Subject:
X-Unsent: 1
Content-Type: multipart/mixed; boundary="${EMAIL_MIXED_BOUNDARY}"

--${EMAIL_MIXED_BOUNDARY}
Content-Type: multipart/alternative; boundary="${EMAIL_ALTERNATIVE_BOUNDARY}"

--${EMAIL_ALTERNATIVE_BOUNDARY}
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${EMAIL_TEXT_CONTENT}

--${EMAIL_ALTERNATIVE_BOUNDARY}
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

${EMAIL_HTML_CONTENT}

--${EMAIL_ALTERNATIVE_BOUNDARY}--

`;

/**
 * NOTE: this is a client-side export engine, this will and should eventually be replaced by a
 * server-side export engine which is more standardized and scalable.
 */
export class DataCubeGridClientExportEngine {
  readonly dataCube!: DataCubeState;
  readonly grid!: DataCubeGridState;

  constructor(grid: DataCubeGridState) {
    this.dataCube = grid.dataCube;
    this.grid = grid;
  }

  private generateFileName() {
    return `${this.dataCube.core.name} - ${formatDate(new Date(), 'EEE MMM dd yyyy HH_mm_ss')}`;
  }

  exportFile(format: DataCubeGridClientExportFormat) {
    const fileName = this.generateFileName();
    switch (format) {
      case DataCubeGridClientExportFormat.CSV: {
        this.grid.client.exportDataAsCsv({
          fileName: `${fileName}.csv`,
        });
        return;
      }
      case DataCubeGridClientExportFormat.EXCEL: {
        // TODO?: configure settings for Excel export so we can export styling as well
        // See https://www.ag-grid.com/angular-data-grid/excel-export-styles/
        this.grid.client.exportDataAsExcel({
          fileName: `${fileName}.xlsx`,
        });
        return;
      }
      default:
      // do nothing
    }
  }

  async exportEmail(format: DataCubeGridClientExportFormat) {
    const fileName = this.generateFileName();
    let fileNameWithExtension = fileName;
    let attachment: string;
    let contentType: string;
    switch (format) {
      case DataCubeGridClientExportFormat.CSV: {
        fileNameWithExtension = `${fileName}.csv`;
        contentType = ContentType.TEXT_CSV;
        attachment = await blobToBase64(
          new Blob([this.grid.client.getDataAsCsv() ?? ''], {
            type: ContentType.TEXT_CSV,
          }),
        );
        break;
      }
      case DataCubeGridClientExportFormat.EXCEL: {
        fileNameWithExtension += `${fileName}.xlsx`;
        contentType = ContentType.APPLICATION_XLSX;
        // TODO?: configure settings for Excel export so we can export styling as well
        // See https://www.ag-grid.com/angular-data-grid/excel-export-styles/
        const xlsxContent = this.grid.client.getDataAsExcel();
        let xlsxBlob: Blob;
        if (xlsxContent instanceof Blob) {
          xlsxBlob = xlsxContent;
        } else if (typeof xlsxContent === 'string') {
          xlsxBlob = new Blob([xlsxContent], {
            type: ContentType.APPLICATION_XLSX,
          });
        } else {
          throw new IllegalStateError(`Can't export Excel content`);
        }
        attachment = await blobToBase64(xlsxBlob);
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't export email in format '${format}'`,
        );
    }

    downloadFileUsingDataURI(
      `${fileName}.eml`,
      // NOTE: empty lines before email content can cause some mail client to not
      // recognize the email content, e.g. Outlook
      `${EMAIL_CONTENT.trimStart()}--${EMAIL_MIXED_BOUNDARY}\n` +
        `Content-Type: ${contentType}; name="${fileNameWithExtension}"\n` +
        `Content-Transfer-Encoding: base64\n` +
        `Content-Disposition: attachment; filename="${fileNameWithExtension}"\n\n` +
        `${attachment}\n\n` +
        `--${EMAIL_MIXED_BOUNDARY}--`,
      // This MIME type here might not matter
      ContentType.MESSAGE_RFC822,
    );
  }
}
