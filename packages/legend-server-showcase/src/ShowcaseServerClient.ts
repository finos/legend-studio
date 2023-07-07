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

// import {
//   NetworkClient,
//   guaranteeNonNullable,
//   type NetworkClientConfig,
//   type PlainObject,
//   SerializationFactory,
// } from '@finos/legend-shared';
// import {
//   createModelSchema,
//   list,
//   object,
//   optional,
//   primitive,
// } from 'serializr';

export type GitlabShowcaseRegistryClientConfig = {
  apiBaseUrl: string;
  repository: {
    id: string;
    defaultBranch: string;
    READONLY__projectAccessToken: string;
  };
  // structure;
};

// export class GitlabShowcaseRegistryClient {
//   private readonly networkClient: NetworkClient;
//   private readonly baseUrl: string;
//   private readonly projectId = '46910590';
//   private readonly defaultBranch = 'main';
//   private readonly metadataFile = 'metadata.json' assert { type: 'json' };
//   private readonly showcaseCodeFile = 'code.pure';
//   private readonly showcaseInfoFile = 'info.md';
//   private readonly showcaseDirectory = 'showcases';
//   // NOTE: this token has readonly scopes, Guest role needed to make safe unauthenticated API call

//   constructor(config: GitlabShowcaseRegistryClientConfig) {
//     this.networkClient = new NetworkClient(config);
//     // this.baseUrl = guaranteeNonNullable(config.baseUrl);
//     this.baseUrl = 'https://gitlab.com/api/v4';
//   }
//   // - [ ] /GET - tags - https://gitlab.com/api/v4/projects/28982479/repository/files/pom.xml?ref=master
//   // - [ ] /GET - showcases metadata - https://gitlab.com/api/v4/projects/28982479/repository/files/pom.xml?ref=master
//   // - [ ] /GET - single showcase code and metadata - https://gitlab.com/api/v4/projects/28982479/repository/files/pom.xml?ref=master
//   // - [ ] /GET - Text search - https://gitlab.com/api/v4/projects/28982479/search?scope=blobs&search=Mapping&ref=workspace%2FCathyBae%2FMyWorkspace_v1

//   async getMetadata(): Promise<ShowcaseMetadata> {
//     return ShowcaseMetadata.serialization.fromJson(
//       await this.networkClient.get(
//         `${this.baseUrl}/projects/${this.projectId}/repository/files/${this.metadataFile}/raw`,
//         {
//           credentials: 'omit',
//         },
//         undefined,
//         {
//           ref: this.defaultBranch,
//         },
//       ),
//     );
//   }

//   getShowcaseCode(path: string): Promise<string> {
//     return this.networkClient.get(
//       `${this.baseUrl}/projects/${this.projectId}/repository/files/${this.showcaseDirectory}/${path}/${this.showcaseCodeFile}/raw`,
//       {
//         credentials: 'omit',
//       },
//       undefined,
//       {
//         ref: this.defaultBranch,
//       },
//     );
//   }

//   // TODO: we might want to have a cheap way to parse front matter somehow
//   // See https://www.npmjs.com/package/front-matter
//   getShowcaseDescription(path: string): Promise<string> {
//     throw new Error('Method not implemented.');
//   }

//   search(text: string): Promise<any> {
//     return this.networkClient.get(
//       `${this.baseUrl}/projects/${this.projectId}/search`,
//       {
//         credentials: 'omit',
//       },
//       {},
//       {
//         scope: 'blobs',
//         ref: this.defaultBranch,
//         search: text,
//       },
//     );
//   }
// }
