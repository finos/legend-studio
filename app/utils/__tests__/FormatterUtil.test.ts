/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { capitalizeFirstChar, prettyCONSTName, tryToMinifyJSONString, tryToFormatJSONString, fromGrammarString, toGrammarString } from 'Utilities/FormatterUtil';
import { unit } from 'Utilities/TestUtil';

test(unit('Capitalize first charater'), () => {
  expect(capitalizeFirstChar('')).toEqual('');
  expect(capitalizeFirstChar(undefined)).toEqual('');
  expect(capitalizeFirstChar('TOM')).toEqual('TOM');
  expect(capitalizeFirstChar('tom')).toEqual('Tom');
});

test(unit('Prettify CONST name'), () => {
  expect(prettyCONSTName('')).toEqual('');
  expect(prettyCONSTName(undefined)).toEqual('');
  expect(prettyCONSTName('TOM')).toEqual('Tom');
  expect(prettyCONSTName('TOM_TOM')).toEqual('Tom Tom');
});

test(unit('Minify JSON string'), () => {
  expect(tryToMinifyJSONString('1\n2\n\t123')).toEqual('12123');
  expect(tryToMinifyJSONString('{')).toEqual('{');
  expect(tryToMinifyJSONString('')).toEqual('');
  expect(tryToMinifyJSONString(`{\n\t"doc": "doc"}`)).toEqual('{"doc":"doc"}');
});

test(unit('Format JSON string'), () => {
  expect(tryToFormatJSONString('1\n2')).toEqual('1\n2');
  expect(tryToFormatJSONString('{')).toEqual('{');
  expect(tryToFormatJSONString('')).toEqual('');
  expect(tryToFormatJSONString(`{"doc": "doc"}`)).toEqual('{\n  "doc": "doc"\n}');
});

test(unit('Convert grammar string to JSON value string'), () => {
  expect(fromGrammarString('id \r\nid1')).toEqual('id \r\nid1');
  expect(fromGrammarString('id \'id1\'')).toEqual('id \'id1\''); // NOTE: this case should not happen in PURE as this is an invalid string
  expect(fromGrammarString('id \\\'id1\\\'')).toEqual('id \'id1\'');
  expect(fromGrammarString('id \\\\\'id1\\\\\'')).toEqual('id \\\'id1\\\'');
});

test(unit('Convert JSON value string to grammar string'), () => {
  expect(toGrammarString('id \'id1\'')).toEqual('id \\\'id1\\\'');
  expect(toGrammarString('id \\\'id1\\\'')).toEqual('id \\\\\'id1\\\\\'');
  expect(toGrammarString('id \r\nid1\'')).toEqual('id \r\nid1\\\'');
});
