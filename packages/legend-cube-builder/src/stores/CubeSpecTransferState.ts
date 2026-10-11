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

import {
  CubeSpecDecodeError,
  MAX_SPEC_BYTES,
  parseCubeSpec,
  serializeCubeSpec,
} from '@finos/legend-cube';
import {
  ContentType,
  downloadFileUsingDataURI,
  type GeneratorFn,
  readFileAsText,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { CubeEditorState } from './CubeEditorState.js';

export enum CUBE_SPEC_TRANSFER_MODE {
  EXPORT = 'export',
  IMPORT = 'import',
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Why a spec can't be imported; a broken document names the path of the problem */
export const getSpecImportError = (error: unknown): string =>
  error instanceof CubeSpecDecodeError
    ? error.path
      ? `Can't import the spec: ${error.path} ${error.detail}`
      : `Can't import the spec: it ${error.detail}`
    : `Can't import the spec: ${errorMessage(error)}`;

/** A file name for a cube's spec, from its name */
export const getCubeSpecFileName = (name: string | undefined): string => {
  const base = name?.trim().replace(/[^\w.-]+/gu, '_') ?? '';
  return `${base.length ? base : 'cube'}.cube.json`;
};

/**
 * Export and import of the saved spec (PLAN §10.3), the only way to keep a
 * cube until the Cube store (M8). Labelled "(dev)" until 2026-10-10, when the
 * user dropped the label for the demo (PLAN §7.8).
 */
export class CubeSpecTransferState {
  readonly editorState: CubeEditorState;

  mode: CUBE_SPEC_TRANSFER_MODE | undefined;
  /** The spec to export, once written */
  exportText: string | undefined;
  /** The spec text to import, pasted or read from a file */
  importText = '';
  /** Why the export or the import failed */
  error: string | undefined;
  isReadingFile = false;
  /** Counts file reads, so a read that finishes after another starts is dropped */
  private fileRequest = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeSpecTransferState, 'fileRequest'>(this, {
      mode: observable,
      exportText: observable,
      importText: observable,
      error: observable,
      isReadingFile: observable,
      fileRequest: observable,
      openExport: action,
      openImport: action,
      close: action,
      setImportText: action,
      importSpec: action,
      readImportFile: flow,
    });
    this.editorState = editorState;
  }

  /** Writes the cube's spec, invalid queries included; a spec over the size cap is refused */
  openExport(): void {
    this.mode = CUBE_SPEC_TRANSFER_MODE.EXPORT;
    this.error = undefined;
    this.exportText = undefined;
    const { document, registry } = this.editorState;
    try {
      this.exportText = serializeCubeSpec(document, registry);
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  openImport(): void {
    this.mode = CUBE_SPEC_TRANSFER_MODE.IMPORT;
    this.error = undefined;
    this.importText = '';
    this.isReadingFile = false;
  }

  close(): void {
    this.mode = undefined;
    this.exportText = undefined;
    this.importText = '';
    this.error = undefined;
    this.fileRequest++;
    this.isReadingFile = false;
  }

  setImportText(text: string): void {
    this.importText = text;
    this.error = undefined;
  }

  async copyExport(): Promise<void> {
    if (this.exportText !== undefined) {
      await this.editorState.host.applicationStore.clipboardService.copyTextToClipboard(
        this.exportText,
        { notifySuccessMessage: 'Cube spec copied to the clipboard' },
      );
    }
  }

  downloadExport(): void {
    if (this.exportText !== undefined) {
      downloadFileUsingDataURI(
        getCubeSpecFileName(this.editorState.document.name),
        this.exportText,
        ContentType.APPLICATION_JSON,
      );
    }
  }

  /** Reads a spec file into the import text; a file over the size cap is refused unread */
  *readImportFile(file: File): GeneratorFn<void> {
    const request = ++this.fileRequest;
    this.error = undefined;
    if (file.size > MAX_SPEC_BYTES) {
      // a file being read before this one is dropped
      this.isReadingFile = false;
      this.error = `The file is too large to import: a spec is at most ${MAX_SPEC_BYTES} bytes`;
      return;
    }
    this.isReadingFile = true;
    try {
      const text = (yield readFileAsText(file)) as string;
      if (request === this.fileRequest) {
        this.importText = text;
      }
    } catch (error) {
      if (request === this.fileRequest) {
        // the browser's FileReader rejects with its error event, not an Error
        const reason =
          error instanceof Error
            ? error.message
            : error instanceof ProgressEvent &&
                error.target instanceof FileReader
              ? (error.target.error?.message ?? 'the browser could not read it')
              : String(error);
        this.error = `Can't read the file: ${reason}`;
      }
    } finally {
      if (request === this.fileRequest) {
        this.isReadingFile = false;
      }
    }
  }

  /**
   * Opens the spec in place of the cube, as one undo step, and never runs it.
   * A spec that can't be read leaves the cube as it was and says why: a
   * broken document names the path of the problem, e.g. `query.nodes[2].database`.
   */
  importSpec(): boolean {
    let decoded: ReturnType<typeof parseCubeSpec>;
    try {
      decoded = parseCubeSpec(this.importText, {
        registry: this.editorState.registry,
      });
    } catch (error) {
      this.error = getSpecImportError(error);
      return false;
    }
    this.editorState.importDocument(decoded.document, decoded.readOnly);
    this.close();
    return true;
  }
}
