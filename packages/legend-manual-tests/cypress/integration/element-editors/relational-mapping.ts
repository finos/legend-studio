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
import { TEST_ID } from '../../../src/const';
import { ElementEditorTester } from '../../utils/ElementEditorTester';
import { ServiceHelperExtension } from '../../utils/ElementHelperExtension';

Cypress.config('defaultCommandTimeout', 30000);
Cypress.config('pageLoadTimeout', 60000);

// grammar includes full model to build pure mapping `meta::relational::tests::simpleRelationalMapping`
const FULL_GRAMMAR = '###Reltional something...'; // TODO

describe('Testing Executing Relational Mapping via Service Editor', () => {
  let demoTest: ElementEditorTester;
  beforeEach(() => {
    demoTest = ElementEditorTester.create(
      'element-editor.json',
    ).withHelperExtension(new ServiceHelperExtension());
  });

  it('Loads grammar with relational mapping and tests service editor basic functionality', () => {
    // setup
    demoTest.initEditorWithWorkspace();
    const serviceHelper = demoTest.getHelperExtension(ServiceHelperExtension);
    serviceHelper.loadServiceRoutes(demoTest.engineServer);
    demoTest.buildGraphWithText(FULL_GRAMMAR);
    serviceHelper.openElement('model', 'MyService');
    cy.get('input[value="/myServicePath"]');
    cy.contains('Execution').click();
    cy.get('[title="Generate test data"]').click();
    cy.wait('@generateServiceData').its('status').should('eq', 200);
    demoTest.getMonacoText().then((text) => {
      expect(text).to.include('default');
      expect(text).to.include('firmTable');
      expect(text).to.include('1,');
    });
    cy.get('[title="Run service execution"]').click();
    cy.wait('@execute').its('status').should('eq', 200);
    cy.contains('Execution Result');
    cy.contains('Close').click();
    const query1 =
      "model::pure::tests::model::simple::Firm.all()->project([x|$x.legalName], ['Legal Name'])";
    const query2 = 'model::pure::tests::model::simple::Person.all();';
    const query3 =
      "model::pure::tests::model::simple::Person.all()->filter(x|$x.age > 0)->project([x|$x.firstName, x|$x.lastName, x|$x.age], ['First Name', 'Last Name', 'Age']);";
    // TODO refactor and cleanup
    cy.on('uncaught:exception', (err, runnable) => {
      expect(err.message).to.include("Cannot read property 'getText' of null");
      return true;
    });
    cy.contains('Edit in text mode').click();
    cy.wait('@postTransformJsonToGrammar').its('status').should('eq', 200);
    demoTest.setTextToGraphText(query1, 1);
    cy.wait(1500);
    cy.wait('@postTransformGrammarToJson').its('status').should('eq', 200);
    cy.contains('Close').click();
    cy.get('[title="Run service execution"]').click();
    cy.wait('@execute').its('status').should('eq', 200);
    cy.contains('Execution Result');
    cy.contains('Close').click();

    cy.on('uncaught:exception', (err, runnable) => {
      expect(err.message).to.include("Cannot read property 'getText' of null");
      return true;
    });
    cy.contains('Edit in text mode').click();
    demoTest.setTextToGraphText(query2, 1);
    cy.wait(1500);
    cy.wait('@postTransformGrammarToJson').its('status').should('eq', 200);
    cy.contains('Close').click();
    cy.get('[title="Run service execution"]').click();
    cy.wait('@execute').its('status').should('eq', 200);
    cy.contains('Execution Result');
    cy.contains('Close').click();

    cy.on('uncaught:exception', (err, runnable) => {
      expect(err.message).to.include("Cannot read property 'getText' of null");
      return true;
    });
    cy.contains('Edit in text mode').click();
    demoTest.setTextToGraphText(query3, 1);
    cy.wait(1500);
    cy.wait('@postTransformGrammarToJson').its('status').should('eq', 200);
    cy.contains('Close').click();
    cy.get('[title="Run service execution"]').click();
    cy.wait('@execute').its('status').should('eq', 200);
    cy.contains('Execution Result');
    cy.contains('Close').click();
  });
});
