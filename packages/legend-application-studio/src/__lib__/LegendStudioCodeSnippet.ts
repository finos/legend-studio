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

import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { indent } from '@finos/legend-shared';

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

// ------------------------------------- Measure -------------------------------------

export const SIMPLE_MEASURE_SNIPPET = `Measure \${1:model::NewEnumeration}
{
  // canonical unit: the unit that other units will be based off for conversion
  *\${1:Unit_1}: \${2:x -> $x};
  // example of other units and their conversation functions
  // Unit_2: x -> $x * 100;
  // Unit_3: x -> $x * 1000;
}`;

// ------------------------------------- Runtime -------------------------------------

export const SIMPLE_RUNTIME_SNIPPET = `Runtime \${1:model::NewRuntime}
{
  mappings:
  [
    \${2:model::SomeMapping}
  ];
  connections:
  [
    // example of a stored connection which covers the mapping
    // ModelStore:
    // [
    //
    // example of using connection pointer
    //   id1: test::connection2,
    //
    // example of using embedded connection
    //   #{
    //     JsonModelConnection
    //     {
    //       class: model::SomeClass;
    //       url: 'someUrl';
    //     }
    //   }#
    // ]
  ];
}`;

// ------------------------------------- Connection -------------------------------------

export const JSON_MODEL_CONNECTION_SNIPPET = `JsonModelConnection \${1:model::NewConnection}
{
  class: \${2:model::SomeClass};
  // data URL
  url: '\${3:data:application/json,{\\}}';
}`;

export const XML_MODEL_CONNECTION_SNIPPET = `XmlModelConnection \${1:model::NewConnection}
{
  class: \${2:model::SomeClass};
  // data URL
  url: '\${3:data:application/json,{\\}}';
}`;

export const MODEL_CHAIN_CONNECTION_SNIPPET = `ModelChainConnection \${1:model::NewConnection}
{
  mappings: [
    \${2:model::SomeMapping}
  ];
}`;

export const RELATIONAL_DATABASE_CONNECTION_SNIPPET = `RelationalDatabaseConnection \${1:model::NewConnection}
{
  store: \${2:model::SomeStore};
  // example of a simple H2 connection
  type: \${3:H2};
  specification: \${4:LocalH2 {\\}};
  auth: \${5:DefaultH2 {\\}};
}`;

// ------------------------------------- Post-Processor -------------------------------------

export const POST_PROCESSOR_RELATIONAL_DATABASE_CONNECTION_SNIPPET = `RelationalDatabaseConnection \${1:model::NewConnection}
{
  store: \${2:model::SomeStore};
  // example of a simple H2 connection with a mapper post processor
  type: \${3:H2};
  specification: \${4:LocalH2 {\\}};
  auth: \${5:DefaultH2 {\\}};
  // example of mapper post processor
  postProcessors:
  [
    mapper
    {
      mappers:
      [
      ];
    }
  ];
}`;

export const createConnectionSnippetWithPostProcessorSuggestionSnippet = (
  snippetText: string,
): string =>
  `RelationalDatabaseConnection \${1:model::NewConnection}
  {
    store: \${2:model::SomeStore};
    type: \${3:H2};
    specification: \${4:LocalH2 {\\}};
    auth: \${5:DefaultH2 {\\}};
    postProcessors:
    [
    ${indent(snippetText, ' '.repeat(DEFAULT_TAB_SIZE))}\n`;

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

// ------------------------------------- Service -------------------------------------

export const BLANK_SERVICE_SNIPPET = `Service \${1:new::NewService}
{
  pattern: '/\${2:myPattern/}';
  owners: [\${3:'owner1', 'owner2'}]; // at least 2 owners required
  documentation: \${4:'documentation'};
  autoActivateUpdates: \${5:true};
  execution: \${6:}
  testSuites:
  [
  ]
}`;

export const SERVICE_WITH_SINGLE_EXECUTION_SNIPPET = `Service \${1:new::NewService}
{
  pattern: '/\${2:myPattern/}';
  owners: [\${3:'owner1', 'owner2'}]; // at least 2 owners required
  documentation: \${4:'documentation'};
  autoActivateUpdates: \${5:true};

  // example of using a single execution context
  execution: Single
  {
    query: \${6:|''};
    mapping: \${7:model::SomeMapping};

    // example of using embedded runtime
    // runtime:
    // #{
    //   connections: [];
    // }#;

    // example of using runtime pointer
    // runtime: model::SomeRuntime;
  }
  testSuites:
  [
  ]
}`;

export const SERVICE_WITH_MULTI_EXECUTION_SNIPPET = `Service \${1:new::NewService}
{
  pattern: '/\${2:myPattern/}';
  owners: [\${3:'owner1', 'owner2'}]; // at least 2 owners required
  documentation: \${4:'documentation'};
  autoActivateUpdates: \${5:true};

  // example of using multiple execution contexts
  execution: Multi
  {
    query: \${6:|''};
    key: '\${7:keyName}';
    executions['key_1']:
    {
      mapping: \${8:model::SomeMapping};

      // example of using embedded runtime
      // runtime:
      // #{
      //   connections: [];
      // }#;

      // example of using runtime pointer
      // runtime: model::SomeRuntime;
    }
    // executions['key_2']:
    // {
    //   mapping: model::SomeMapping;
    //   runtime: model::SomeRuntime;
    // }
  }
  testSuites:
  [
  ]
}`;

// ------------------------------------- Generation -------------------------------------

export const SIMPLE_GENERATION_SPECIFICATION_SNIPPET = `GenerationSpecification \${1:model::NewGenerationSpecification}
{
  // exmple of file generation nodes (which will be generated last)
  // fileGenerations: [_meta::myAvroMisSpelled];

  // example of model generation nodes (tree form) to order the generations
  // generationNodes: [
  //   {
  //     generationElement: model::MissingElement;
  //   }
  // ];

  \${2:// generation specification content}
}`;

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

// ------------------------------------- Data -------------------------------------

export const DATA_WITH_EXTERNAL_FORMAT_SNIPPET = `Data \${1:model::NewData}
{
  ExternalFormat
  #{
    contentType: '\${2:application/x.flatdata}';
    data: '\${3:data}';
  }#
}`;

export const DATA_WITH_MODEL_STORE_SNIPPET = `Data \${1:model::NewData}
{
  ModelStore
  #{
    \${2:model::SomeClass:}
      [
      ]
  }#
}`;

export const createDataElementSnippetWithEmbeddedDataSuggestionSnippet = (
  snippetText: string,
): string =>
  `Data \${1:model::NewData}\n${indent(
    snippetText,
    ' '.repeat(DEFAULT_TAB_SIZE),
  )}\n}`;
