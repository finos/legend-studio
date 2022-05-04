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

export const BLANK_CLASS_SNIPPET = `Class \${1:model::NewClass}
// example of a constraint
// [
//   SomeConstraint: true
// ]
{
  \${2:// example of a standard property
  // prop1: String[1];

  // example of a derived property
  // derivation1() {''\\}: String[1];}
}`;

export const CLASS_WITH_PROPERTY_SNIPPET = `Class \${1:model::NewClass}
{
  \${2:prop1}:\${3:String[1]};
}`;

export const CLASS_WITH_INHERITANCE_SNIPPET = `Class \${1:model::NewClass} extends \${2:model::ParentClass}
{
  \${3:// class content}
}`;

export const CLASS_WITH_CONSTRAINT_SNIPPET = `Class \${1:model::NewClass}
[
  \${3:SomeConstraint: true}
]
{
  \${2:// class content}
}`;

export const DATA_WITH_EXTERNAL_FORMAT_SNIPPET = `Data \${1:model::NewData}
{
  ExternalFormat
  #{
    contentType: \${2:'application/x.flatdata';}
    data: \${3:'sample data';}
  }#
}`;

export const DATA_WITH_MODEL_STORE_SNIPPET = `Data \${1:model::NewData}
{
  ModelStore
  #{
    \${2:model::SomeClass:}
      [
        \${3:^model::SomeClass(
        )
      ]
  }#
}`;

export const DATA_WITH_STEREOTYPES_SNIPPET = `Data \${1:<<meta::pure::profiles::typemodifiers.abstract>> model::NewData}
// example of stereotype: meta::pure::profiles::typemodifiers.abstract
{
  ExternalFormat
  #{
    contentType: \${2:'application/json';}
    data: \${3:'{"some":"data"}';}
  }#
}`;

export const DATA_WITH_TAGGED_VALUES_SNIPPET = `Data \${1:{doc.doc = 'something'} model::NewData}
// example of tagged value: {doc.doc = 'something'}
{
  ExternalFormat}
  #{
    contentType: \${2:'application/json';}
    data: \${3:'{"some":"data"}';}
  }#
}`;
