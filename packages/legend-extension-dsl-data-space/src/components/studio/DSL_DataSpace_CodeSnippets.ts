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

export const SIMPLE_DATA_SPACE_SNIPPET = `DataSpace \${1:model::NewDataSpace}
{
  executionContexts:
  [
    {
      name: '\${5:Some Context}';
      description: 'some information about the execution context';
      mapping: \${6:model::SomeMapping};
      defaultRuntime: \${7:model::SomeRuntime};
    }
  ];
  defaultExecutionContext: '\${5:Some Context}';
  // description: 'description of the data models';
  // featuredDiagrams:
  // [
  //   model::SomeDiagram
  // ];
  // supportInfo: Email {
  //   address: 'someEmail@test.org';
  // };
}`;

export const SIMPLE_DATASPACE_SNIPPET_WITH_PARSER = (path: string): string =>
  `###DataSpace\nDataSpace ${path}\n{\n}\n`;
