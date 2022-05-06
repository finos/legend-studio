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

export const BASIC_BINDING_SNIPPET = `Binding \${1:model::NewBinding}
{
  schemaSet: \${2:model::SomeSchemaSet};
  schemaId: \${3:testSchemaId};
  contentType: \${4:'application/json'};
  modelIncludes: [
    \${5:model::SomeClass}
  ];
}`;

export const BASIC_SCHEMASET_SNIPPET = `SchemaSet \${1:model::NewSchemaSet}
{
  format: \${2:};
  schemas: [
    {
      id: \${3:};
      location: '\${4:}';
      content: '\${5:}';
    }
  ];
}`;

export const SCHEMASET_WITH_JSON_SCHEMA_SNIPPET = `SchemaSet \${1:model::NewSchemaSet}
{
  format: JSON;
  schemas: [
    {
      id: \${2:testId};
      location: '\${3:example.json}';
      // example of JSON content
      // content: '{\\n "\\$schema": "http://json-schema.org/draft-07/schema#",\\n  "type": "object",\\n  "properties": {\\n    "stringField": {\\n      "type": "string"\\n    },\\n    "floatField": {\\n      "type": "number"\\n    },\\n    "decimalField": {\\n      "type": "number"\\n    },\\n    "integerField": {\\n      "type": "integer"\\n    },\\n    "dateField": {\\n      "type": "string",\\n      "format": "date-time"\\n    },\\n    "dateTimeField": {\\n      "type": "string",\\n      "format": "date-time"\\n    },\\n    "strictDateField": {\\n      "type": "string",\\n      "format": "date"\\n    },\\n    "booleanField": {\\n      "type": "boolean"\\n    }\\n  },\\n  "required": [\\n    "stringField",\\n    "floatField",\\n    "decimalField",\\n    "integerField",\\n    "dateField",\\n    "dateTimeField",\\n    "strictDateField",\\n    "booleanField"\\n  ]\\n}';
      content: '\${4:}';
    }
  ];
}`;

export const SCHEMASET_WITH_XML_SCHEMA_SNIPPET = `SchemaSet \${1:model::NewSchemaSet}
{
  format: XSD;
  schemas: [
    {
      id: \${2:testId};
      location: '\${3:example.xsd}';
      // example of XSD content
      // content: '<?xml version=\\'1.0\\'?>\\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">\\n    <xs:complexType name="Rectangle">\\n        <xs:sequence>\\n            <xs:element name="height" type="xs:int" minOccurs="1" maxOccurs="unbounded">\\n                <xs:annotation>\\n                    <xs:documentation xml:lang="en">One of two dimensions of a rectangle</xs:documentation>\\n                </xs:annotation>\\n            </xs:element>\\n            <xs:element name="width" type="xs:int" minOccurs="0" maxOccurs="unbounded"/>\\n        </xs:sequence>\\n    </xs:complexType>\\n</xs:schema>\\n';
      content: '\${4:}';
    }
  ];
}`;

export const SCHEMASET_WITH_FLAT_DATA_SCHEMA_SNIPPET = `SchemaSet \${1:model::NewSchemaSet}
{
  format: FlatData;
  schemas: [
    {
      id: \${2:testId};
      // example of flat-data content
      // content: 'section data: DelimitedWithHeadings\\n{\\n  scope.untilEof;\\n  delimiter: \\',\\';\\n\\n  Record\\n  {\\n    FULL_NAME: STRING;\\n    NICK_NAME: STRING;\\n  }\\n}';
      content: '\${3:}';
    }
  ];
}`;
