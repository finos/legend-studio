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

// eslint-disable-next-line no-restricted-imports
/// <reference path="../../support/index.d.ts" />
import { TEST_ID } from '../../../src/const.js';
import { ElementEditorTester } from '../../utils/ElementEditorTester.js';
import { FileGenerationHelperExtension } from '../../utils/ElementHelperExtension.js';

Cypress.config('defaultCommandTimeout', 30000);
Cypress.config('pageLoadTimeout', 60000);
describe('UML End to End Test', () => {
  let tester: ElementEditorTester;
  const MODEL =
    "Class model::Firm extends model::other::LegalEntity\n[\n  sizeEmploye: $this.employees->size() > 2\n]\n{\n  employees: model::Person[1..*];\n}\n\nClass {model::MyProfile.doc = 'my tag'} model::Person\n{\n  firstName: String[1];\n  lastName: String[1];\n  age: Integer[1];\n}\n\nClass model::other::LegalEntity\n{\n  id: String[1];\n  name: String[1];\n  incType: model::other::IncType[1];\n}\n\nEnum model::other::IncType\n{\n  CORP,\n  LLC\n}\n\nProfile model::MyProfile\n{\n  tags: [doc];\n}";
  beforeEach(() => {
    tester = ElementEditorTester.create(
      'element-editor.json',
    ).withHelperExtension(new FileGenerationHelperExtension());
  });
  it('Test file generaiton viewer within class/enumeration', () => {
    const fileGenerationHelper = tester.getHelperExtension(
      FileGenerationHelperExtension,
    );
    tester.initEditorWithWorkspace();
    tester.buildGraphWithText(MODEL);
    // class checks
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('model').click();
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('Person').click();
    cy.getByTestID(TEST_ID.EDIT_PANEL).contains('Form').click();
    fileGenerationHelper.showAndVerifyGenerationView('Avro', '@avroGeneration');
    fileGenerationHelper.showAndVerifyGenerationView(
      'Protobuf',
      '@protobufGeneration',
    );
    cy.getByTestID(TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS)
      .contains('Form')
      .click();
    // enum checks
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('other').click();
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('IncType').click();
    cy.getByTestID(TEST_ID.EDIT_PANEL).contains('Form').click();
    cy.getByTestID(TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS)
      .contains('Form')
      .click();
  });
  it('Test Building of file generation editor', () => {
    // TODO
  });
});

// TODO: consider making this test a bit more dynamic so it doesn't break when the backend changes slightly??
