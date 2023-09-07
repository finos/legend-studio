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

export const SIMPLE_MASTER_RECORD_DEFINITION_SNIPPET = `MasterRecordDefinition \${1:model::NewMasterRecordDefinition}
 {
   modelClass: \${2:model::SomeClass};
   identityResolution:
   {
     resolutionQueries:
       [
         {
           queries: [ {input: \${2:model::SomeClass}[1], EFFECTIVE_DATE: StrictDate[1]|\${2:model::SomeClass}.all()->filter(//\${3:Add logic for query for first precedence level})}
                    ];
           keyType: GeneratedPrimaryKey;
           precedence: 1;
         },
         {
           queries: [ {input: \${2:model::SomeClass}[1], EFFECTIVE_DATE: StrictDate[1]|\${2:model::SomeClass}.all()->filter(//\${4:Add logic for query for second precedence level})}
                    ];
           keyType: AlternateKey;
           precedence: 2;
         }
       ]
   }
   recordSources:
   [
     test-source-id: {
       status: Development;
       description: 'Test Source Description';
       recordService: {
          acquisitionProtocol: \${5:model::SomeAcquisitionService};
          parseService: \${6:model::SomeParseService};
          transformService: \${7:model::SomeTransformService};
       };
       createPermitted: true;
       createBlockedException: false;
       stagedLoad: false;
       sequentialData: false;
     }
   ]
 }`;
