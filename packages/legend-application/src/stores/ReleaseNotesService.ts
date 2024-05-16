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

import { guaranteeNonEmptyString } from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import { action, makeObservable, observable } from 'mobx';

export enum RELEASE_UPDATE_TYPE {
  BUG_FIX = 'BUG_FIX',
  ENHANCEMENT = 'ENHANCEMENT',
}

export interface ReleaseNote {
  type: RELEASE_UPDATE_TYPE;
  description: string;
  docLink?: string | undefined;
}

export interface VersionReleaseNotes {
  version: string;
  label?: string | undefined;
  docLink?: string | undefined;
  notes?: ReleaseNote[] | undefined;
}

export const collectReleaseNotes = (
  releaseNotes: VersionReleaseNotes[],
): VersionReleaseNotes[] =>
  releaseNotes.map((release) => {
    guaranteeNonEmptyString(
      release.version,
      "Release notes 'version' is missing",
    );
    release.notes?.map((note) => {
      guaranteeNonEmptyString(note.type, "Release note 'type' is missing");
      guaranteeNonEmptyString(
        note.description,
        "Release note 'description' is missing",
      );
      return note;
    });
    return release;
  });

export class ReleaseNotesService {
  static STORAGE_NAME = 'application.release-notes.lastOpenedVersion';
  applicationStore: GenericLegendApplicationStore;
  releaseNotes: VersionReleaseNotes[] | undefined;
  showCurrentReleaseModal = true;
  showReleaseLog = false;
  isConfigured = false;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      showCurrentReleaseModal: observable,
      showReleaseLog: observable,
      isConfigured: observable,
      setShowCurrentRelease: action,
      configure: action,
      updateViewedVersion: action,
      setReleaseLog: action,
    });
    this.applicationStore = applicationStore;
  }

  configure(releaseNotes: VersionReleaseNotes[]): void {
    this.isConfigured = true;
    this.releaseNotes = collectReleaseNotes(releaseNotes);
  }

  setShowCurrentRelease(val: boolean): void {
    this.showCurrentReleaseModal = val;
  }

  setReleaseLog(val: boolean): void {
    this.showReleaseLog = val;
  }

  getViewedVersions(): string | undefined {
    return this.applicationStore.settingService.getStringValue(
      ReleaseNotesService.STORAGE_NAME,
    );
  }

  updateViewedVersion(version: string): void {
    return this.applicationStore.settingService.persistValue(
      ReleaseNotesService.STORAGE_NAME,
      version,
    );
  }
}
