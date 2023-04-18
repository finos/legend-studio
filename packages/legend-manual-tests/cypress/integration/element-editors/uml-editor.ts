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
import { EDITOR_LANGUAGE } from '../../../src/stores/EditorConfig.js';
import { ElementEditorTester } from '../../utils/ElementEditorTester.js';
import { CoreElementHelper } from '../../utils/ElementHelperExtension.js';

describe('UML End to End Test', () => {
  let tester: ElementEditorTester;
  beforeEach(() => {
    tester = ElementEditorTester.create(
      'element-editor.json',
    ).withHelperExtension(new CoreElementHelper());
  });

  it('Create UML Elements', () => {
    tester.initEditorWithWorkspace();
    tester.buildGraphWithText('');
    // begin
    const coreHelper = tester.getHelperExtension(CoreElementHelper);
    // Create basic Person, Firm in demo package
    coreHelper.createPackage('demo');
    coreHelper.createClass('demo', 'Person');
    coreHelper.createClass('demo', 'Firm');

    // add property to firms
    // cy.contains('Person').eq(0).dragTo('.panel__content__lists');
    // cy.get('input[name="Property name"]').eq(0).type('employees');
    coreHelper.addProperty('Firm', 'employees');
    cy.get('.property-basic-editor__type')
      .contains('String')
      .getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER)
      .invoke('show')
      .click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').type('Person{enter}');

    cy.get('input[name="Type to bound"]').clear().type('*');
    // Add enum through text mode
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get(`[title="${tester._domTitles.TOGGLE_TEXT_MODE}"]`)
      .click()
      .get(`[data-mode-id="${EDITOR_LANGUAGE.PURE}"]`);
    tester.addToGraphText('Enum demo::Inctype { CORP, LLC }');
    cy.get('.monaco-editor').contains('employees');
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Toggle text mode (F8)"]')
      .click();
    // validate enum is there
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('Inctype');
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('Firm');
    // wait until we are back to form mode
    cy.getByTestID('editor-group__content');
    coreHelper.addProperty('Firm', 'legalName', 1);
    //Create new profile
    cy.contains('demo').rightclick();
    cy.contains('New Profile...').click();
    cy.get('input[name="Element name"]').type('ProfileExtension');
    // TODO: use test-library query
    cy.get('.btn--primary').click();

    //Add tag
    cy.contains('Tags').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add tagged value"]')
      .click();
    cy.get('input[name="Tag value"]').type('doc');

    //Add stereotype
    cy.contains('Stereotypes').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add stereotype"]')
      .click();
    cy.get('input[name="Stereotype value"]').type('important');

    // add stereotype/tag to person
    cy.contains('Person').click();
    cy.contains('Stereotypes').click();
    // cy.contains('ProfileExtension').eq(0).dragTo('.panel__content__lists');
    // cy.get('.selector-input__value-container').eq(1).type('important{enter}');
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add stereotype"]')
      .click();
    cy.get('.selector-input__control')
      .first()
      .click()
      .type('ProfileExtension{enter}');

    cy.contains('Tagged Values').click();
    // cy.contains('ProfileExtension').eq(0).dragTo('.panel__content__lists');
    // cy.get('.selector-input__value-container').eq(0).type('doc{enter}');
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add tagged value"]')
      .click();
    cy.get('.selector-input__control')
      .first()
      .click()
      .type('ProfileExtension{enter}');

    cy.getByTestID(TEST_ID.CLASS_FORM_EDITOR)
      .get('input[placeholder="Value"]')
      .type('my doc');
    // TODO add test on diagram canvas to ensure you see the correct tag/stereotype
    cy.get('[title="Visit profile"]').click();
    //Add properties
    cy.contains('Person').click();
    cy.contains('Properties').click();
    coreHelper.addProperty('Person', 'firstName');
    coreHelper.addProperty('Person', 'lastName', 1);

    //Create class
    coreHelper.createClass('demo', 'LegalEntity');

    //Add super types
    cy.contains('Firm').click();
    cy.contains('Super Types').click();
    // cy.contains('LegalEntity').eq(0).dragTo('.panel__content__lists');
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add super type"]')
      .click();
    cy.get('.selector-input__control').click().type('LegalEntity{enter}');

    //Add constraint
    cy.contains('Constraints').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add constraint"]')
      .click();
    cy.get('input[name="Constraint name"]').type('constraintSize');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type('{selectall}{backspace}$this.employees->size() > 2');

    //Add derived properties
    cy.contains('Derived Properties').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add derived property"]')
      .click();
    // cy.contains('Person').eq(0).dragTo('.panel__content__lists');
    cy.get('input[name="Derived property name"]').click().type('firstEmployee');
    cy.getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER)
      .invoke('show')
      .click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').type('Person{enter}');
    cy.get('input[name="Type from bound"]').clear().type('0');
    cy.get('input[name="Type to bound"]').clear().type('1');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type('{selectall}{backspace}|$this.employees->first()');
    cy.wait(1500);

    tester.compileSuccessfully();
  });

  it('Validates Lamba Editor in Class', () => {
    const debug = false;
    const SIMPLE_MODEL =
      'Class demo::Firm extends demo::LegalEntity\n{\n  employees: demo::Person[1..*];\n  legalName: String[1];\n}\n\nClass demo::LegalEntity\n{\n}\n\nClass demo::Person\n{\n  firstName: String[1];\n  lastName: String[1];\n}';
    tester.initEditorWithWorkspace();
    tester.buildGraphWithText(SIMPLE_MODEL);
    if (debug) {
      tester.setDevTools();
    }
    // open firm and add constraint checking for parser error as well
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('demo').click();
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('Firm').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .contains('Constraints')
      .click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add constraint"]')
      .click();
    cy.get('input[name="Constraint name"]').type('constraintSize');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type('{selectall}{backspace},');
    cy.contains('fix error or discard changes to leave');
    cy.contains('Discard Changes').click();
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type(`{selectall}{backspace}true`);
    tester.compileSuccessfully();
    // firm derived properties
    cy.contains('Derived Properties').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add derived property"]')
      .click();
    cy.get('input[name="Derived property name"]').click().type('firstEmployee');
    cy.getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER)
      .invoke('show')
      .click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').type('Person{enter}');
    cy.get('.property-basic-editor__type').contains('Person');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type(`{selectall}{backspace}|'studioTest'`);
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).contains('studioTest');
    // TODO: figure out flakiness of not using wait before compileFailure
    cy.wait(1000);
    tester.compileFailure();
    cy.contains('Error in derived property');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type('{selectall}{backspace}|$this.employees->first()->toOne();');
    cy.wait(3000);
    tester.compileSuccessfully();
  });

  it('Class with complex constraint', () => {
    const debug = false;
    const SIMPLE_MODEL =
      "Class demo::Person\n[\n  constraint1\n  (\n    ~externalId: 'ext ID'\n    ~function: if($this.ok == 'ok', |true, |false)\n    ~enforcementLevel: Warn\n    ~message: $this.ok + ' is not ok'\n  ),\n  constraint2: true\n]\n{\n  ok: Integer[1..2];\n}\n";
    tester.initEditorWithWorkspace();
    tester.buildGraphWithText(SIMPLE_MODEL);
    if (debug) {
      tester.setDevTools();
    }
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('demo').click();
    cy.getByTestID(TEST_ID.EXPLORER_TREES).contains('Person').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .contains('Constraints')
      .click();
    cy.get('input[name="Constraint name"]').eq(0);
    cy.get('input[name="Constraint name"]')
      .eq(0)
      .should('have.value', 'constraint1');
    cy.get('input[name="Constraint name"]')
      .eq(1)
      .should('have.value', 'constraint2');
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Toggle text mode (F8)"]')
      .click();
    cy.contains('Class demo::Person');
    tester.getMonacoText().then((text) => {
      expect(text).to.include('~externalId');
      expect(text).to.include('~function');
      expect(text).to.include('~enforcementLevel');
      expect(text).to.include('~message');
      expect(text).to.include('ext ID');
    });
    tester.compileSuccessfully();
  });

  it('Function Editor', () => {
    tester.initEditorWithWorkspace();
    const TEXT =
      'Class demo::Person\n' +
      '{\n' +
      '  firstName: String[1];\n' +
      '  lastName: String[1];\n' +
      '}';
    tester.buildGraphWithText(TEXT);

    //Create function
    cy.contains('demo').rightclick();
    cy.contains('New Function...').click();
    cy.get('[name="Element name"]').type('getPersonName');
    // TODO: use test-library query
    cy.get('.btn--primary').click();

    const FUNCTION_TEXT = "$person.firstName + ' ' + $person.lastName";
    cy.get('[title="Add Parameter"]').click();
    cy.get('[placeholder="Property name"]').type('person');
    cy.contains('Click to edit').invoke('show').click();
    cy.get('.selector-input__value-container').type('Person{enter}');

    tester.setTextToGraphText(FUNCTION_TEXT, 0);
    cy.wait(2000);

    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Compile (F9)"]')
      .click();
    cy.wait('@compile').its('status').should('eq', 200);
    cy.contains('Compiled successfully');

    const INCORRECT_TEXT = "$person.firstName + ' ' + $person.lastN";
    tester.setTextToGraphText(INCORRECT_TEXT, 0);
    cy.wait(2000);
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Compile (F9)"]')
      .click();
    cy.contains('Compilation failed');
    cy.contains(`Can't find property 'lastN'`);
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Toggle text mode (F8)"]')
      .click();
    cy.contains('demo::getPersonName(person: demo::Person[1])');
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Compile (F9)"]')
      .click();
    cy.contains('Compilation failed');
    cy.contains(`Can't find property 'lastN'`);
    const UPDATED_GRAPH =
      "Class demo::Person\n{\n  firstName: String[1];\n  middleName: String[1];\n  lastName: String[1];\n}\n\nfunction demo::getPersonName(person: demo::Person[1], includeMiddleName: Boolean[1]): String[1]\n{\n   if($includeMiddleName, |$person.firstName + ' ' + $person.middleName + ' ' + $person.lastName, |$person.firstName + ' ' + $person.lastName)\n}\n";
    tester.setTextToGraphText(UPDATED_GRAPH);
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Toggle text mode (F8)"]')
      .click();
    cy.contains('Leaving text mode and rebuilding graph');
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT);
    cy.contains('includeMiddleName');
    cy.getByTestID(TEST_ID.EXPLORER_TREES)
      .get('[title="demo::Person"]')
      .click();
    cy.contains('Derived Properties').click();
    cy.get('[title="Add derived property"]').click();
    cy.get('[placeholder="Property name"]').type('fullName');
    const DERIVED_PROPERTY_USING_FUNCTION = '|demo::getPersonName($this,true)';
    tester.setTextToGraphText(DERIVED_PROPERTY_USING_FUNCTION, 0);
    cy.wait(1500);
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Compile (F9)"]')
      .click();
    cy.wait('@compile').its('status').should('eq', 200);
    cy.contains('Compiled successfully');
  });
});
