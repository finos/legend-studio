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

// ------------------------------------- Copyright header -------------------------------------

export const getCopyrightHeaderSnippet =
  (): string => `// Copyright \${1:${new Date().getFullYear()}} Goldman Sachs
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.\n`;

// ------------------------------------- Class -------------------------------------

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
  \${2:prop1}: \${3:String[1]};
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

// ------------------------------------- Profile -------------------------------------

export const SIMPLE_PROFILE_SNIPPET = `Profile \${1:model::NewProfile}
{
  stereotypes: [\${2:}];
  tags: [\${3:}];
}`;

// ------------------------------------- Enumeration -------------------------------------

export const SIMPLE_ENUMERATION_SNIPPET = `Enum \${1:model::NewEnumeration}
{
  \${2:VALUE_1,\n  VALUE_2}
}`;

// ------------------------------------- Association -------------------------------------

export const SIMPLE_ASSOCIATION_SNIPPET = `Association \${1:model::NewAssociation}
{
  \${2:prop1}: \${3:model::Type1[1]};
  \${4:prop2}: \${5:model::Type2[1]};
}`;

// ------------------------------------- Function -------------------------------------

export const BLANK_FUNCTION_SNIPPET = `function \${1:model::NewEnumeration}(\${2:param1: String[1]}): \${3:String[1]}
{
  \${4:''; // function content}
}`;

export const SIMPLE_FUNCTION_SNIPPET = `function \${1:model::NewEnumeration}(): String[1]
{
  ''
}`;

// ------------------------------------- Mapping -------------------------------------

export const BLANK_MAPPING_SNIPPET = `Mapping \${1:model::NewMapping}
(
  \${2:// mapping content}
)`;

export const MAPPING_WITH_M2M_CLASS_MAPPING_SNIPPET = `Mapping \${1:model::NewMapping}
(
  \${2:model::TargetClass}: Pure
  {
    ~src \${3:model::SourceClass}
    // example of property mappings
    // prop1: $src.prop1
  }
)`;

export const MAPPING_WITH_RELATIONAL_CLASS_MAPPING_SNIPPET = `Mapping \${1:model::NewMapping}
(
  \${2:model::TargetClass}: Relational {
    ~mainTable \${3:[model::SomeDatabase]SomeTable}
    // example of property mappings
    // prop1: [model::SomeDatabase]SomeTable.col1,
  }
)`;

export const MAPPING_WITH_ENUMERATION_MAPPING_SNIPPET = `Mapping \${1:model::NewMapping}
(
  \${2:model::TargetEnumeration}: EnumerationMapping \${3:EnumerationMappingID}
  {
    // example of enum-value mapping
    // VAL_1: ['val1'],
    // VAL_2: ['val2', 'val_2']
  }
)`;

// ------------------------------------- Relational -------------------------------------

export const BLANK_RELATIONAL_DATABASE_SNIPPET = `Database \${1:model::NewDatabase}
(
  // example database schema
  // Schema SOME_SCHEMA
  // (
  //   Table TABLE_1
  //   (
  //     COL_1 VARCHAR(200)
  //   )
  //   Table TABLE_2
  //   (
  //     COL_2 VARCHAR(200) PRIMARY_KEY
  //   )
  // )

  // example database join
  // Join SomeJoin(SOME_SCHEMA.TABLE_1.COL_1 = SCHEMA1.TABLE_2.COL_2)

  \${2:// database content}
)`;

// ------------------------------------- Diagram -------------------------------------

export const BLANK_DIAGRAM_SNIPPET = `Diagram \${1:model::NewDiagram}(width=0.0, height=0.0)
{
  // NOTE: it is recommended to use diagram visual editor
  // to edit diagram: double-click on the diagram in
  // the concept explorer tree to open the editor
}`;
