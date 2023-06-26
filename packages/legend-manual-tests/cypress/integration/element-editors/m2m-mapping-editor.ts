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
import { MappingHelperExtension } from '../../utils/ElementHelperExtension.js';

Cypress.config('defaultCommandTimeout', 30000);
Cypress.config('pageLoadTimeout', 60000);

const SOURCE_MODEL =
  'Class <<demo::ProfileExtension.important>> demo::Person\r\n{\r\n  firstName: String[1];\r\n  lastName: String[1];\r\n}\r\n\r\nClass demo::Firm extends demo::LegalEntity\r\n[\r\n  constraintSize: $this.employees->size() > 2\r\n]\r\n{\r\n  employees: demo::Person[1..*];\r\n  legalName: String[1];\r\n  firstEmployee() {$this.employees->first()}: demo::Person[0..1];\r\n}\r\n\r\nClass demo::LegalEntity\r\n{\r\n}\r\n\r\nProfile demo::ProfileExtension\r\n{\r\n  stereotypes: [important];\r\n  tags: [doc];\r\n}\r\n';
const FULL_MODEL =
  "Class demo::Firm extends demo::LegalEntity\n[\n  constraintSize: $this.employees->size() > 2\n]\n{\n  employees: demo::Person[1..*];\n  legalName: String[1];\n  incType: String[1];\n  firstEmployee() {$this.employees->first()}: demo::Person[0..1];\n}\n\nClass demo::LegalEntity\n{\n}\n\nClass <<demo::ProfileExtension.important>> demo::Person\n{\n  firstName: String[1];\n  lastName: String[1];\n}\n\nClass demo::other::NPerson\n{\n  fullName: String[1];\n}\n\nClass demo::other::NFirm\n[\n  namePrefix: $this.name->startsWith('MC')\n]\n{\n  nEmployees: demo::other::NPerson[1..*];\n  name: String[1];\n  incType: demo::other::IncType[1];\n}\n\nEnum demo::other::IncType\n{\n  LLC,\n  CORP\n}\n\nProfile demo::ProfileExtension\n{\n  stereotypes: [important];\n  tags: [doc];\n}\n";
const MAPPING =
  '\n\n###Mapping\nMapping demo::MyMapping\n(\n  *demo::other::NPerson: Pure\n  {\n    ~src demo::Person\n    fullName: $src.firstName + \' \' + $src.lastName\n  }\n  *demo::other::NFirm: Pure\n  {\n    ~src demo::Firm\n    nEmployees[demo_other_NPerson]: $src.employees,\n    name: $src.legalName,\n    incType: EnumerationMapping demo_other_IncType: $src.incType\n  }\n\n  demo::other::IncType: EnumerationMapping\n  {\n    LLC: [\'Llc\'],\n    CORP: [\'Corporation\']\n  }\n\n  MappingTests\n  [\n    test_1\n    (\n      query: |demo::other::NFirm.all()->graphFetchChecked(#{demo::other::NFirm{incType,name,nEmployees{fullName}}}#)->serialize(#{demo::other::NFirm{incType,name,nEmployees{fullName}}}#);\n      data:\n      [\n        <Object, JSON, demo::Firm, \'{"employees":[{"firstName":"Tyler","lastName":"Durden"},{"firstName":"Big","lastName":"Lebowski"},{"firstName":"Geralt","lastName":"Witcher"}],"legalName":"MCDataTeam","incType":"Corporation"}\'>\n      ];\n      assert: \'{"defects":[],"source":{"defects":[],"source":{"number":1,"record":"{ \\"employees\\": [{ \\"firstName\\": \\"Tyler\\", \\"lastName\\": \\"Durden\\"}, { \\"firstName\\": \\"Big\\", \\"lastName\\": \\"Lebowski\\"}, { \\"firstName\\": \\"Geralt\\", \\"lastName\\": \\"Witcher\\"}], \\"legalName\\": \\"MCDataTeam\\", \\"incType\\": \\"Corporation\\" } "},"value":{"incType":"Corporation","legalName":"MCDataTeam","employees":[{"firstName":"Tyler","lastName":"Durden"},{"firstName":"Big","lastName":"Lebowski"},{"firstName":"Geralt","lastName":"Witcher"}]}},"value":{"incType":"CORP","name":"MCDataTeam","nEmployees":[{"fullName":"Tyler Durden"},{"fullName":"Big Lebowski"},{"fullName":"Geralt Witcher"}]}}\';\n    )\n  ]\n)\n';

describe('Model to Model Mapping End to End Test', () => {
  let demoTest: ElementEditorTester;
  beforeEach(() => {
    demoTest = ElementEditorTester.create(
      'element-editor.json',
    ).withHelperExtension(new MappingHelperExtension());
  });

  it('Creates a Model to Model Mapping', () => {
    // setup
    demoTest.initEditorWithWorkspace();
    const mappingHelper = demoTest.getHelperExtension(MappingHelperExtension);
    demoTest.buildGraphWithText(SOURCE_MODEL);
    cy.contains('demo').rightclick();
    cy.contains('New Package...').click();
    cy.get('input[name="Element name"]').type('other');
    // TODO: use test-library query
    cy.get('.btn--primary').click();

    mappingHelper.createClass('other', 'NPerson');
    mappingHelper.addProperty('NPerson', 'fullName');

    // Add Enums
    cy.contains('other').rightclick();
    cy.contains('New Enumeration...').click();
    cy.get('input[name="Element name"]').type('IncType');
    // TODO: use test-library query
    cy.get('.btn--primary').click();
    cy.contains('IncType').click();
    cy.contains('Values').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add enum value"]')
      .click();
    cy.get('input[name="Type enum name"]').type('LLC');
    cy.get('[title="See detail"]').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .first()
      .get('[title="Add enum value"]')
      .click();
    cy.get('input[name="Type enum name"]').eq(1).type('CORP');
    cy.get('[title="See detail"]').eq(1).click();

    // Adding property in Firm
    cy.contains('Firm').click();
    cy.contains('Properties').click();
    // cy.contains('IncType').eq(0).dragTo('.panel__content__lists');
    mappingHelper.addProperty('Firm', 'incType', 2);
    cy.get('.property-basic-editor__type')
      .contains('String')
      .getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER)
      .eq(2)
      .invoke('show')
      .click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').eq(2).type('IncType{enter}');

    mappingHelper.createClass('other', 'NFirm');
    mappingHelper.addProperty('NFirm', 'nEmployees');
    cy.get('.property-basic-editor__type')
      .contains('String')
      .getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER)
      .invoke('show')
      .click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').type('NPerson{enter}');
    cy.get('input[name="Type to bound"]').clear().type('*');
    mappingHelper.addProperty('NFirm', 'name', 1);
    // cy.contains('IncType').eq(0).dragTo('.panel__content__lists');
    mappingHelper.addProperty('NFirm', 'incType', 2);
    cy.get('.property-basic-editor__type')
      .contains('String')
      .getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER)
      .eq(2)
      .invoke('show')
      .click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').eq(2).type('IncType{enter}');

    //Adding constraint
    cy.contains('Constraints').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add constraint"]')
      .click();
    cy.get('input[name="Constraint name"]').type('namePrefix');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type("{selectall}{backspace}$this.name->startsWith('MC')");

    // Add new mapping
    cy.contains('demo').rightclick();
    cy.contains('New Mapping...').click();
    cy.get('input[name="Element name"]').type('MyMapping');
    // TODO: use test-library query
    cy.get('.btn--primary').click();

    // Mapping NPerson to Person
    mappingHelper.createClassMapping('NPerson', 'Person');
    // cy.contains('NPerson').eq(0).dragTo('[data-testid="mapping-explorer"]');
    // cy.get('.btn').contains('Create').click();
    // cy.contains(/^Person$/).eq(0).dragTo('[data-testid="source-panel"]');

    //Mapping properties
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .click()
      .type("$src.firstName + ' ' + $src.lastName");

    //Toggle Auxiliary panel
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();

    // Execute
    cy.contains('EXECUTE').click();
    cy.get('[title="Select Target..."]').click();
    cy.get('.selector-input__control').click().type('NPerson{enter}');
    //cy.getByTestID(TEST_ID.MAPPING_EXPLORER).contains('NPerson').dragTo('.mapping-execution-panel__target');

    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('fullName')
      .click();

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').its('status').should('eq', 200);

    // see execution plan
    cy.get('[title="View Execution Plan"]').click();
    cy.wait('@postGeneratePlan').its('status').should('eq', 200);
    cy.contains('Close').click();

    //Toggle Auxiliary panel
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();

    // Mapping NFirm to Firm
    mappingHelper.createClassMapping('NFirm', 'Firm');
    // cy.contains('NFirm').eq(0).dragTo('[data-testid="mapping-explorer"]');
    // cy.get('.btn').contains('Create').click();
    // cy.contains(/^Firm$/).eq(0).dragTo('[data-testid="source-panel"]');

    //Mapping properties
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .eq(0)
      .click()
      .type('$src.incType');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .eq(1)
      .click()
      .type('$src.legalName');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .eq(2)
      .click()
      .type('$src.employees');

    // Toggle Auxiliary panel
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();

    // Execute
    cy.contains('EXECUTE').click();
    cy.get('[title="Select Target..."]').click();
    cy.get('.selector-input__control').last().click().type('NFirm{enter}');

    // cy.getByTestID(TEST_ID.MAPPING_EXPLORER).contains('NFirm').dragTo('.mapping-execution-panel__target-panel__query-container');

    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('incType')
      .click();
    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('name')
      .click();
    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('nEmployees')
      .click();
    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('fullName')
      .click();

    demoTest.setTextToGraphText(
      '{\n' +
        '  "employees": [\n' +
        '    {\n' +
        '      "firstName": "Tyler",\n' +
        '      "lastName": "Durden"\n' +
        '    }\n' +
        '  ],\n' +
        '  "legalName": "DataTeam",\n' +
        '  "incType": "LLC"\n' +
        '}',
      4,
    );

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(200);
      const namePrefixDefect = response.body?.values?.defects[0];
      const constraintSizeDefect = response.body?.values?.source?.defects[0];

      expect(namePrefixDefect).to.deep.equal({
        enforcementLevel: 'Error',
        externalId: null,
        id: 'namePrefix',
        message: 'Constraint :[namePrefix] violated in the Class NFirm',
        path: [],
        ruleDefinerPath: 'demo::other::NFirm',
        ruleType: 'ClassConstraint',
      });

      expect(constraintSizeDefect).to.deep.equal({
        enforcementLevel: 'Error',
        externalId: null,
        id: 'constraintSize',
        message: 'Constraint :[constraintSize] violated in the Class Firm',
        path: [],
        ruleDefinerPath: 'demo::Firm',
        ruleType: 'ClassConstraint',
      });
    });

    //add data to clear defects
    demoTest.setTextToGraphText(
      '{\n' +
        '  "employees": [\n' +
        '    {\n' +
        '      "firstName": "Tyler",\n' +
        '      "lastName": "Durden"\n' +
        '    },\n' +
        '    {\n' +
        '      "firstName": "Big",\n' +
        '      "lastName": "Lebowski"\n' +
        '    },\n' +
        '    {\n' +
        '      "firstName": "Geralt",\n' +
        '      "lastName": "Witcher"\n' +
        '    }\n' +
        '  ],\n' +
        '  "legalName": "MCDataTeam",\n' +
        '  "incType": "LLC"\n' +
        '}',
      4,
    );

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

    //Add new mapping for IncType
    cy.getByTestID(TEST_ID.MAPPING_EXPLORER)
      .get('[title="Create new mapping element"]')
      .click();
    cy.get('.selector-input__control').last().click().type('IncType{enter}');
    // cy.contains('IncType').eq(0).dragTo('[data-testid="mapping-explorer"]');
    cy.get('.btn').contains('Create').click();
    cy.get('[placeholder="Source value"]').eq(0).click().type('Llc');
    cy.get('[placeholder="Source value"]').eq(1).click().type('Corporation');

    //Setting property of IncType to string
    cy.getByTestID(TEST_ID.EDIT_PANEL__HEADER_TABS).contains('Firm').click();
    cy.contains('Properties').click();
    cy.get('.property-basic-editor__type')
      .contains('IncType')
      .getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER)
      .eq(2)
      .invoke('show')
      .click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').eq(2).type('String{enter}');

    cy.getByTestID(TEST_ID.EDIT_PANEL__HEADER_TABS)
      .contains('MyMapping')
      .click();

    cy.contains('EXECUTE').click();
    cy.get('[title="Select Target..."]').click();
    cy.get('.selector-input__control').last().click().type('NFirm{enter}');
    // cy.getByTestID(TEST_ID.MAPPING_EXPLORER).contains('NFirm').dragTo('.mapping-execution-panel__target-panel__query-container');

    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('incType')
      .click();
    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('name')
      .click();
    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('nEmployees')
      .click();
    cy.get('.mapping-execution-panel__target-panel__query-container')
      .contains('fullName')
      .click();

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(500);
      expect(response.body.message).to.equal(
        "Error in class mapping 'demo::MyMapping' for property 'incType' - Type error: 'String' is not a subtype of 'demo::other::IncType'",
      );
    });

    //add data to clear defects
    demoTest.setTextToGraphText(
      '{\n' +
        '  "employees": [\n' +
        '    {\n' +
        '      "firstName": "Tyler",\n' +
        '      "lastName": "Durden"\n' +
        '    },\n' +
        '    {\n' +
        '      "firstName": "Big",\n' +
        '      "lastName": "Lebowski"\n' +
        '    },\n' +
        '    {\n' +
        '      "firstName": "Geralt",\n' +
        '      "lastName": "Witcher"\n' +
        '    }\n' +
        '  ],\n' +
        '  "legalName": "MCDataTeam",\n' +
        '  "incType": "Corporation"\n' +
        '}',
      1,
    );

    cy.get("[title=\"Class mapping 'demo_other_NFirm' for 'NFirm'\"]").click();

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(200);
      const namePrefixDefect = response.body?.values?.defects;
      const constraintSizeDefect = response.body?.values?.source?.defects;

      expect(namePrefixDefect.length).to.deep.equal(0);
      expect(constraintSizeDefect.length).to.deep.equal(0);
    });

    // TODO figure out why it can't find execution plan btn
    // see execution plan
    cy.get('[title="View exection plan"]').click();
    cy.wait('@postGeneratePlan').its('status').should('eq', 200);
    cy.contains('Close').click();

    // Promote to test
    cy.get('[title="Promote to test"]').click();
    cy.wait(1500);
    // cy.getByTestID(TEST_ID.MAPPING_EXPLORER).contains('NFirm').dragTo(':nth-child(1) > .mapping-test-explorer__content');
    // cy.getByTestID(TEST_ID.MAPPING_EXPLORER).contains('NFirm').dragTo('.mapping-test-editor-panel__target');

    demoTest.setTextToGraphText(
      '{\n' +
        '  "employees": [\n' +
        '    {\n' +
        '      "firstName": "Tyler",\n' +
        '      "lastName": "Durden"\n' +
        '    },\n' +
        '    {\n' +
        '      "firstName": "Big",\n' +
        '      "lastName": "Lebowski"\n' +
        '    },\n' +
        '    {\n' +
        '      "firstName": "Geralt",\n' +
        '      "lastName": "Witcher"\n' +
        '    }\n' +
        '  ],\n' +
        '  "legalName": "MCDataTeam",\n' +
        '  "incType": "Corporation"\n' +
        '}',
      2,
    );

    cy.get('[title="Run test"]').first().click();
    cy.wait('@postExecute').its('status').should('eq', 200);

    // Failing a test
    cy.get("[title=\"Class mapping 'demo_other_NFirm' for 'NFirm'\"]").click();
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .eq(1)
      .click()
      .type("{selectall}{backspace}$src.legalName + ' '");
    cy.wait(1000);
    cy.contains('test_1').click();
    cy.get('[title="Run test"]').first().click();
    cy.wait('@postExecute').its('status').should('eq', 200);
    cy.contains('Test failed');

    // Passing test
    cy.get("[title=\"Class mapping 'demo_other_NFirm' for 'NFirm'\"]").click();
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT)
      .eq(1)
      .click()
      .type('{selectall}{backspace}$src.legalName');
    cy.wait(500);
    cy.contains('test_1').click();
    cy.get('[title="Run test"]').first().click();
    cy.wait('@postExecute').its('status').should('eq', 200);
    cy.contains('Test passed');

    // Deleting test
    cy.contains('test_1').rightclick();
    cy.contains('Delete').click();
  });

  it('Validates Model to Model Mapping Editor', () => {
    // setup
    demoTest.initEditorWithWorkspace();
    const mappingHelper = demoTest.getHelperExtension(MappingHelperExtension);
    demoTest.buildGraphWithText(FULL_MODEL + MAPPING);
    mappingHelper.openElement('demo', 'MyMapping');
    // check the root mapping
    const SECOND_NPERSON_MAPPING_ID = 'npersonMapping';
    const NPERSON_CLASS = 'NPerson';
    mappingHelper.createClassMapping(
      NPERSON_CLASS,
      'Person',
      SECOND_NPERSON_MAPPING_ID,
    );
    mappingHelper.toggleClassMappingRoot();
    // check that you see visit button and can go to NPerson
    cy.contains('NFirm').click();
    cy.contains(SECOND_NPERSON_MAPPING_ID);
    cy.get('[title="Visit class mapping"]').click();
    mappingHelper.toggleClassMappingRoot();
    cy.contains('NFirm').click();
    cy.contains('No set implementation found. Click');
    cy.get('[title="Create mapping element"]').click();
    cy.get('input[placeholder="Mapping element ID"]')
      .clear()
      .type(`${SECOND_NPERSON_MAPPING_ID}_1`);
    cy.get('.btn').contains('Create').click();
    // delete all but default
    mappingHelper.deleteMappingElement(SECOND_NPERSON_MAPPING_ID);
    mappingHelper.deleteMappingElement(`${SECOND_NPERSON_MAPPING_ID}_1`);
    cy.contains(NPERSON_CLASS).click();
    // assert you can't see the root class mapping
    expect(Cypress.$('[title="Set/Unset root class mapping"]')).not.to.exist;

    // NFirm Source Panel
    cy.contains('NFirm').click();
    cy.getByTestID(TEST_ID.SOURCE_PANEL)
      .getByTestID(TEST_ID.TREE_VIEW__NODE__BLOCK)
      .should('contain', 'employees')
      .and('contain', 'incType')
      .and('contain', 'legalName');
    cy.contains('employees').click();
    cy.getByTestID(TEST_ID.SOURCE_PANEL)
      .getByTestID(TEST_ID.TREE_VIEW__NODE__BLOCK)
      .should('contain', 'firstName')
      .and('contain', 'lastName');
    // TODO union check
    // enumeration mapping check
  });
});
