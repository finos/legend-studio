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
import { ElementEditorTester } from '../../utils/ElementEditorTester';
import { CoreElementHelper } from '../../utils/ElementHelperExtension';

Cypress.config('defaultCommandTimeout', 30000);
Cypress.config('pageLoadTimeout', 60000);
describe('UML End to End Test', () => {
  let tester: ElementEditorTester;
  beforeEach(() => {
    tester = ElementEditorTester.create(
      'element-editor.json',
    ).withHelperExtension(new CoreElementHelper());
  });

  it('Flat data editor', () => {
    const DATA =
      '###FlatData\n' +
      'FlatData studio::demo::SomeCSV\n' +
      '{\n' +
      '  section default: DelimitedWithHeadings\n' +
      '  {\n' +
      '    scope.untilEof;\n' +
      "    delimiter: ',';\n" +
      "    recordSeparator: '\\n';\n" +
      '    mayContainBlankLines;\n' +
      '\n' +
      '    RecordType default\n' +
      '    {\n' +
      "      data['i']: String[0..1];\n" +
      "      data['f']: Float[1];\n" +
      "      data['d']: Decimal[1];\n" +
      '    }\n' +
      '  }\n' +
      '}\n' +
      '\n' +
      '\n' +
      '###Pure\n' +
      'Class studio::demo::A\n' +
      '{\n' +
      '  i: String[0..1];\n' +
      '  f: Float[1];\n' +
      '  d: Decimal[0..1];\n' +
      '}\n' +
      '\n' +
      '\n' +
      '###Mapping\n' +
      'Mapping studio::demo::CSVToA\n' +
      '(\n' +
      '  *studio::demo::A[A]: FlatData\n' +
      '  {\n' +
      '    ~src studio::demo::SomeCSV.default.default\n' +
      "    ~filter $src['f'] > 0.0\n" +
      "    i: $src['i'],\n" +
      "    f: $src['f'],\n" +
      "    d: $src['d']\n" +
      '  }\n' +
      ')\n';
    tester.initEditorWithWorkspace();
    tester.buildGraphWithText(DATA);

    cy.contains('studio').eq(0).click();
    cy.contains('demo').eq(0).click();
    cy.contains('CSVToA').eq(0).click();

    //Toggle Auxiliary panel
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();

    //Execute
    cy.contains('EXECUTE').click();

    cy.get('[title="Select Target..."]').click();
    cy.get('.selector-input__control').click().type('A{enter}');

    //Selecting properties
    cy.get(
      '.mapping-execution-panel__target-panel__query-container > .tree-view__node__root > :nth-child(1) > :nth-child(1) > .tree-view__node__container',
    ).rightclick();
    cy.contains('Select Mapped Properties').click();

    tester.setTextToGraphText('i,f,d\n' + '1,2,3', 1);

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(200);
      const namePrefixDefect = response.body?.values?.defects;
      const constraintSizeDefect = response.body?.values?.source?.defects;

      expect(namePrefixDefect.length).to.deep.equal(0);
      expect(constraintSizeDefect.length).to.deep.equal(0);
    });

    //see execution plan
    cy.get('[title="View Execution Plan"]').click();
    cy.wait('@postGeneratePlan').its('status').should('eq', 200);
    cy.contains('Close').click();

    cy.get('[title="Promote to Test"]').click();

    //Selecting properties
    cy.get('.mapping-test-editor__header__name > [title="Run test"]').click();
    cy.wait('@postExecute').its('status').should('eq', 200);
    cy.get('.mapping-test-editor__result').contains('Test passed');
    cy.get('.mapping-editor__header__tab__close-btn').click();

    //Execute
    cy.contains('EXECUTE').click();

    cy.get('[title="Select Target..."]').click();
    cy.get('.selector-input__control').click().type('A{enter}');

    //Selecting properties
    cy.get(
      '.mapping-execution-panel__target-panel__query-container > .tree-view__node__root > :nth-child(1) > :nth-child(1) > .tree-view__node__container',
    ).rightclick();
    cy.contains('Select Mapped Properties').click();
    tester.setTextToGraphText('i,f,d\n' + '1,-2.0,3.0', 3);

    cy.wait(1500);

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(200);
      const namePrefixDefect = response.body?.values?.defects;
      const constraintSizeDefect = response.body?.values?.source?.defects;

      expect(namePrefixDefect[0]).to.deep.equal({
        id: 'f_non_negative',
        externalId: null,
        message: 'Constraint :[f_non_negative] violated in the Class A',
        enforcementLevel: 'Error',
        ruleType: 'ClassConstraint',
        ruleDefinerPath: 'studio::demo::A',
        path: [],
      });
      expect(constraintSizeDefect.length).to.deep.equal(0);
    });

    cy.get('[title="Promote to Test"]').click();

    //Selecting properties
    cy.get('.mapping-test-editor__header__name > [title="Run test"]').click();
    cy.wait('@postExecute').its('status').should('eq', 200);
    cy.get('.mapping-test-editor__result').contains('Test passed');
  });
});
