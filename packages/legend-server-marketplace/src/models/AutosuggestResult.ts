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

export enum DataProductDetailsType {
  LAKEHOUSE = 'lakehouse',
  LEGACY = 'legacy',
  SDLC_DEPLOYMENT = 'SdlcDeployment',
}

export interface AutosuggestDataProductOrigin {
  _type: string;
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
}

export interface AutosuggestDataProductDetails {
  _type: string;
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  dataProductId?: string;
  deploymentId?: number;
  producerEnvironmentName?: string;
  producerEnvironmentType?: string;
  origin?: AutosuggestDataProductOrigin;
}

export interface AutosuggestResult {
  dataProductName: string;
  dataProductDescription: string;
  dataProductDetails: AutosuggestDataProductDetails;
  matchedText: string;
}

export interface AutosuggestResponse {
  results: AutosuggestResult[];
}
