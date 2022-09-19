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

export const TEST_DATA__ProjectDependencyInfo = {
  tree: [
    {
      groupId: 'com.company.myCompanyA',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
      path: 'com.company.myCompanyA:my-artifact:1.0.0',
      dependencies: [
        {
          groupId: 'com.company.myCompanyB',
          artifactId: 'my-artifact',
          versionId: '1.0.0',
          path: 'com.company.myCompanyA:my-artifact:1.0.0>com.company.myCompanyB:my-artifact:1.0.0',
        },
      ],
    },
    {
      groupId: 'com.company.myCompanyC',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
      path: 'com.company.myCompanyC:my-artifact:1.0.0',
      dependencies: [
        {
          groupId: 'com.company.myCompanyB',
          artifactId: 'my-artifact',
          versionId: '2.0.0',
          path: 'com.company.myCompanyC:my-artifact:1.0.0>com.company.myCompanyB:my-artifact:2.0.0',
        },
      ],
    },
    {
      groupId: 'com.company.myCompanyD',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
      path: 'com.company.myCompanyD:my-artifact:1.0.0',
      dependencies: [
        {
          groupId: 'com.company.myCompanyE',
          artifactId: 'my-artifact',
          versionId: '1.0.0',
          path: 'com.company.myCompanyD:my-artifact:1.0.0>com.company.myCompanyE:my-artifact:1.0.0',
        },
      ],
    },
    {
      groupId: 'com.company.myCompanyF',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
      path: 'com.company.myCompanyF:my-artifact:1.0.0',
      dependencies: [
        {
          groupId: 'com.company.myCompanyE',
          artifactId: 'my-artifact',
          versionId: '2.0.0',
          path: 'com.company.myCompanyF:my-artifact:1.0.0>com.company.myCompanyB:my-artifact:2.0.0',
        },
      ],
    },
    {
      groupId: 'com.company.myCompanyE',
      artifactId: 'my-artifact',
      versionId: '3.0.0',
      path: 'com.company.myCompanyE:my-artifact:1.0.0',
      dependencies: [],
    },
  ],
  conflicts: [
    {
      groupId: 'com.company.myCompanyB',
      artifactId: 'my-artifact',
      versions: ['1.0.0', '2.0.0'],
      conflictPaths: [
        'com.company.myCompanyA:my-artifact:1.0.0>com.company.myCompanyB:my-artifact:1.0.0',
        'com.company.myCompanyC:my-artifact:1.0.0>com.company.myCompanyB:my-artifact:2.0.0',
      ],
    },
    {
      groupId: 'com.company.myCompanyE',
      artifactId: 'my-artifact',
      versions: ['1.0.0', '2.0.0', '3.0.0'],
      conflictPaths: [
        'com.company.myCompanyD:my-artifact:1.0.0>com.company.myCompanyE:my-artifact:1.0.0',
        'com.company.myCompanyF:my-artifact:1.0.0>com.company.myCompanyB:my-artifact:2.0.0',
        'com.company.myCompanyE:my-artifact:1.0.0',
      ],
    },
  ],
};
