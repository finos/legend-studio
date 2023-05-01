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

import { test, expect } from '@jest/globals';
import {
  toSentenceCase,
  prettyCONSTName,
  tryToMinifyJSONString,
  tryToMinifyLosslessJSONString,
  tryToFormatJSONString,
  tryToFormatLosslessJSONString,
  fromGrammarString,
  toGrammarString,
  toTitleCase,
  TITLE_CASE_EXCEPTION_WORDS,
  parseCSVString,
  quantify,
  quantifyList,
} from '../FormatterUtils.js';
import { unitTest } from '../../__test-utils__/TestUtils.js';

test(unitTest('To sentence case'), () => {
  expect(toSentenceCase('')).toEqual('');
  expect(toSentenceCase(undefined)).toEqual('');
  expect(toSentenceCase('TOM')).toEqual('TOM');
  expect(toSentenceCase('tom')).toEqual('Tom');
  // trimming
  expect(toSentenceCase(' tom  ')).toEqual('Tom');
  // more than 1 word
  expect(toSentenceCase('tom tom')).toEqual('Tom tom');
});

test(unitTest('To title case'), () => {
  expect(toTitleCase('')).toEqual('');
  expect(toTitleCase(undefined)).toEqual('');
  // first and last words are capitalized
  expect(toTitleCase('TOM')).toEqual('TOM');
  expect(toTitleCase('tom')).toEqual('Tom');
  expect(toTitleCase('in out out in')).toEqual('In out out In');
  // trimming
  expect(toTitleCase(' tom is trying  ')).toEqual('Tom Is Trying');
  // exceptions
  expect(
    toTitleCase(
      `Exception words ${TITLE_CASE_EXCEPTION_WORDS.join(' ')} check`,
    ),
  ).toEqual(`Exception Words ${TITLE_CASE_EXCEPTION_WORDS.join(' ')} Check`);
});

test(unitTest('Prettify CONST name'), () => {
  expect(prettyCONSTName('')).toEqual('');
  expect(prettyCONSTName(undefined)).toEqual('');
  expect(prettyCONSTName('TOM')).toEqual('Tom');
  expect(prettyCONSTName('TOM_TOM')).toEqual('Tom Tom');
});

test(unitTest('Prettify CONST name with capitalizations'), () => {
  expect(prettyCONSTName('fiveTwoEight')).toEqual('Five Two Eight');
  expect(prettyCONSTName('FIVETwoEight')).toEqual('FIVE Two Eight');
  expect(prettyCONSTName('FIVETwoEIGHT')).toEqual('FIVE Two EIGHT');
  expect(prettyCONSTName('fiveTWOEight')).toEqual('Five TWO Eight');
  expect(prettyCONSTName('fiveTwoEIGHT')).toEqual('Five Two EIGHT');
  expect(prettyCONSTName('   fiveTwoEIGHT   ')).toEqual('Five Two EIGHT');
  expect(prettyCONSTName('five_Two_EIGHT')).toEqual('Five Two EIGHT');
  expect(prettyCONSTName('five5TWOEight')).toEqual('Five 5 TWO Eight');
  expect(prettyCONSTName('five5TwoEIGHT')).toEqual('Five 5 Two EIGHT');
  expect(prettyCONSTName('five5TWOEight9Two')).toEqual(
    'Five 5 TWO Eight 9 Two',
  );
  expect(prettyCONSTName('five28FOUR91')).toEqual('Five 28 FOUR 91');
  expect(prettyCONSTName('FIVE5TwoEIGHT')).toEqual('FIVE 5 Two EIGHT');
  expect(prettyCONSTName('I')).toEqual('I');
  expect(prettyCONSTName('ID')).toEqual('Id');
  expect(prettyCONSTName('Id')).toEqual('Id');
  expect(prettyCONSTName('Personid')).toEqual('Personid');
  expect(prettyCONSTName('PERSONID')).toEqual('Personid');
});

test(unitTest('Minify JSON string'), () => {
  expect(tryToMinifyJSONString('1\n2\n\t123')).toEqual('12123');
  expect(tryToMinifyJSONString('{')).toEqual('{');
  expect(tryToMinifyJSONString('')).toEqual('');
  expect(tryToMinifyJSONString(`{\n\t"doc": "doc"}`)).toEqual('{"doc":"doc"}');
});

test(unitTest('Minify JSON string with decimal'), () => {
  expect(tryToMinifyLosslessJSONString('1.0')).toEqual('1.0');
  expect(tryToMinifyLosslessJSONString('{\n  "i": 1.0\n}')).toEqual(
    '{"i":1.0}',
  );
});

test(unitTest('Format JSON string'), () => {
  expect(tryToFormatJSONString('1\n2')).toEqual('1\n2');
  expect(tryToFormatJSONString('{')).toEqual('{');
  expect(tryToFormatJSONString('')).toEqual('');
  expect(tryToFormatJSONString(`{"doc": "doc"}`)).toEqual(
    '{\n  "doc": "doc"\n}',
  );
});

test(unitTest('Format JSON String with decimal'), () => {
  expect(tryToFormatLosslessJSONString('1.0')).toEqual('1.0');
  expect(tryToFormatLosslessJSONString('{"i":1.0}')).toEqual(
    '{\n  "i": 1.0\n}',
  );
});

test(unitTest('Convert grammar string to JSON value string'), () => {
  expect(fromGrammarString('id \r\nid1')).toEqual('id \r\nid1');
  expect(fromGrammarString("id 'id1'")).toEqual("id 'id1'"); // NOTE: this case should not happen in PURE as this is an invalid string
  expect(fromGrammarString("id \\'id1\\'")).toEqual("id 'id1'");
  expect(fromGrammarString("id \\\\'id1\\\\'")).toEqual("id \\'id1\\'");
});

test(unitTest('Convert JSON value string to grammar string'), () => {
  expect(toGrammarString("id 'id1'")).toEqual("id \\'id1\\'");
  expect(toGrammarString("id \\'id1\\'")).toEqual("id \\\\'id1\\\\'");
  expect(toGrammarString("id \r\nid1'")).toEqual("id \r\nid1\\'");
});

test(unitTest('Format lossless JSON'), () => {
  expect(tryToFormatLosslessJSONString('{"a": "1.00000"}')).toEqual(
    '{\n  "a": "1.00000"\n}',
  );
  expect(tryToMinifyLosslessJSONString('{"a": "1.00000"}')).toEqual(
    '{"a":"1.00000"}',
  );
});

test(unitTest('Separate String to List'), () => {
  const stringSingleWord = 'value';
  expect(parseCSVString(stringSingleWord)).toEqual(['value']);

  const stringSeparatedByComma = '5,2,8';
  expect(parseCSVString(stringSeparatedByComma)).toEqual(['5', '2', '8']);

  const stringSeparatedByNewLine = '4\n9\n1';
  expect(parseCSVString(stringSeparatedByNewLine)).toEqual(['4', '9', '1']);

  const stringNewLinesAndCommas = '5,2,8,4\n2,0,1,0\n9,1';
  expect(parseCSVString(stringNewLinesAndCommas)).toEqual([
    '5,2,8,4',
    '2,0,1,0',
    '9,1',
  ]);
});

test(unitTest('Generate quantity label'), () => {
  expect(quantify(-1, 'car')).toEqual('no cars');
  expect(quantify(0, 'car')).toEqual('no cars');
  expect(quantify(1, 'car')).toEqual('1 car');
  expect(quantify(3, 'car')).toEqual('3 cars');

  expect(quantifyList([], 'car')).toEqual('no cars');
  expect(quantifyList(['dummy'], 'car')).toEqual('1 car');
  expect(quantifyList(['dummy', 'dummy'], 'car')).toEqual('2 cars');

  expect(quantify(-1, 'fish', 'fishes')).toEqual('no fishes');
  expect(quantify(0, 'fish', 'fishes')).toEqual('no fishes');
  expect(quantify(1, 'fish', 'fishes')).toEqual('1 fish');
  expect(quantify(3, 'fish', 'fishes')).toEqual('3 fishes');
});
