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

// TODO: ledav -- add a suggestion snippet for persistence and persistence context
//
// ###Persistence
// Persistence test::TestPersistence
// {
//   doc: 'This is test documentation.';
//   trigger: Manual;
//   service: test::Service;
//   persister: Batch
//   {
//     sink: Relational
//     {
//     }
//     targetShape: Flat
//     {
//       targetName: 'TestDataset1';
//       modelClass: test::ModelClass;
//     }
//     ingestMode: AppendOnly
//     {
//       auditing: None;
//       filterDuplicates: false;
//     }
//   }
//   notifier:
//   {
//     notifyees:
//     [
//       PagerDuty
//       {
//         url: 'http://xyz.com';
//       },
//       Email
//       {
//         address: 'http://xyz.com';
//       }
//     ]
//   }
//   tests:
//   [
//     test1:
//     {
//       testBatches:
//       [
//         testBatch1:
//         {
//           data:
//           {
//             connection:
//             {
//                ExternalFormat
//                #{
//                  contentType: 'application/x.flatdata';
//                  data: 'FIRST_NAME,LAST_NAME\\nFred,Bloggs\\nJane,Doe';
//                }#
//             }
//             asserts:
//             {
//               assert1:
//                 EqualToJson
//                 #{
//                   expected:
//                   ExternalFormat
//                   #{
//                     contentType: 'application/json';
//                     data: '{\"Age\":12, \"Name\":\"dummy\"}';
//                   }#;
//                 }#
//             }
//           }
//         }
//       ]
//       isTestDataFromServiceOutput: true;
//     }
//   ]
// }

export const BLANK_PERSISTENCE_SNIPPET = `Persistence \${1:model::NewPersistence}
{
  \${2:// persistence content}
}`;

export const BLANK_PERSISTENCE_CONTEXT_SNIPPET = `PersistenceContext \${1:model::NewPersistenceContext}
{
  \${2:// persistence context content}
}`;
