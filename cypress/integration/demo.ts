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

// eslint-disable-next-line no-restricted-imports
/// <reference path="../support/index.d.ts" />
import { TEST_ID } from '../../app/const';
import { getConfigUrls } from '../utils/configUtil';
import StudioTest from "../utils/StudioTest";

Cypress.config('defaultCommandTimeout', 30000);
Cypress.config('pageLoadTimeout', 60000);

type Argument<T> = {
  sdlcServer: T,
  execServer: T
}

type Setup = {
  ({ sdlcServer, execServer }: Argument<string>): void;
}

const setUp: Setup = ({ sdlcServer, execServer }) => {
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/UAT-5520/workspaces`
  }).as('getWorkspaces');
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/UAT-5520/conflictResolution`
  }).as('getConflictResolution');
  cy.route({
    method: 'POST',
    url: `${sdlcServer}/projects/UAT-5520/workspaces/myDemo`
  }).as('postWorkspace');
  //same as above but with different alias
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/UAT-5520/workspaces/myDemo/entities`
  }).as('getEntities');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/schemaGeneration/avro`
  }).as('avroGeneration');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/codeGeneration/java`
  }).as('javaGeneration');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/schemaGeneration/jsonSchema`
  }).as('jsonSchemaGeneration');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/schemaGeneration/protobuf`
  }).as('protobufGeneration');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/schemaGeneration/rosetta`
  }).as('rosettaGeneration');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/compilation/compile`
  }).as('compile');
  cy.route({
    method: 'POST',
    url: `${sdlcServer}/projects/UAT-5520/workspaces/myDemo/entityChanges`
  }).as('syncChanges');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/execution/execute`
  }).as('postExecute');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/execution/generatePlan`
  }).as('postGeneratePlan');
};

describe('Demo Script Test', () => {
  let sdlcServer: string = '';
  let execServer: string = '';
  let PROJECT_NAME: string, PROJECT_ID: string, WORKSPACE: string, TITLE: object;
  let demoTest: StudioTest;
  beforeEach(() => {
    cy.viewport(1920, 1080);
    cy.fixture('demo.json').then(demoJSON => {
      PROJECT_NAME = demoJSON.PROJECT_NAME;
      PROJECT_ID = demoJSON.PROJECT_ID;
      WORKSPACE = demoJSON.WORKSPACE;
      TITLE = demoJSON.TITLE;

      getConfigUrls().then((response) => {
        sdlcServer = response[0];
        execServer = response[1];
        cy.server();
        demoTest = new StudioTest({ sdlcServer, execServer, PROJECT_NAME, PROJECT_ID, WORKSPACE });
      })
    });
  });

  const showAndVerifyGenerationView = (generationType: string, apiAlias: string) => {
    cy.getByTestID(TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS).contains(generationType).click();
    cy.wait(apiAlias).its('status').should('eq', 200);
    cy.getByTestID(TEST_ID.TREE_VIEW__NODE__BLOCK).should('not.be.empty');
    cy.getByTestID(TEST_ID.EDIT_PANEL).contains(generationType).click();
  };

  const createMapping = (target: string, source: string) => {
    cy.getByTestID(TEST_ID.MAPPING_EXPLORER).get('[title="Create new mapping element"]').click();
    cy.get('.selector-input__control').last().click().type(`${target}{enter}`);
    cy.get('.btn').contains('Create').click();
    cy.getByTestID(TEST_ID.SOURCE_PANEL).get('[title="Choose source"]').click();
    cy.get('.selector-input__control').last().click().type(`${source}{enter}`);
  };

  it('successfully creates models', () => {
    setUp({ sdlcServer, execServer });
    // TODO: this breaks the test during different generations
    cy.on('uncaught:exception', (err, runnable) => {
      expect(err.message).to.include('Cannot read property \'getText\' of null');
      // using mocha's async done callback to finish
      // this test so we prove that an uncaught exception
      // was thrown

      // return false to prevent the error from
      // failing this test
      return false;
    });

    cy.visit(PROJECT_ID);
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    demoTest.createAndOpenWorkspace();

    demoTest.createPackage('demo');

    demoTest.createClass('demo', 'Person');

    demoTest.createClass('demo', 'Firm');
    demoTest.addProperty('Firm', 'employees');
    cy.get('.property-basic-editor__type').contains('String').getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER).invoke('show').click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').type('Person{enter}');
    cy.get('input[name="Type to bound"]').clear().type('*');

    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT).get('[title="Toggle text mode (F8)"]').click();
    cy.get('.monaco-editor').contains('employees');
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT).get('[title="Toggle text mode (F8)"]').click();

    demoTest.addProperty('Firm', 'legalName', 1);

    cy.getByTestID(TEST_ID.EDIT_PANEL).contains('Form').click();

    showAndVerifyGenerationView('Avro', '@avroGeneration');
    showAndVerifyGenerationView('Java', '@javaGeneration');
    showAndVerifyGenerationView('JSON Schema', '@jsonSchemaGeneration');
    showAndVerifyGenerationView('Protobuf', '@protobufGeneration');
    showAndVerifyGenerationView('Rosetta', '@rosettaGeneration');

    cy.getByTestID(TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS).contains('Form').click();

    //Create new profile
    cy.contains('demo').rightclick();
    cy.contains('Add a new profile').click();
    cy.get('input[name="Element name"]').type('ProfileExtension');
    cy.get('[title="Create new profile"]').contains('Create').click();

    //Add tag
    cy.contains('Tags').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add tagged value"]').click();
    cy.get('input[name="Tag value"]').type('doc');

    //Add stereotype
    cy.contains('Stereotypes').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add stereotype"]').click();
    cy.get('input[name="Stereotype value"]').type('important');

    cy.contains('Person').click();
    cy.contains('Stereotypes').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add stereotype"]').click();
    cy.get('.selector-input__control').first().click().type('ProfileExtension{enter}');
    cy.get('[title="Visit profile"]').click();

    //Add properties
    cy.contains('Person').click();
    cy.contains('Properties').click();
    demoTest.addProperty('Person', 'firstName');
    demoTest.addProperty('Person', 'lastName', 1);

    //Create class
    demoTest.createClass('demo', 'LegalEntity');

    //Add super types
    cy.contains('Firm').click();
    cy.contains('Super Types').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add super type"]').click();
    cy.get('.selector-input__control').click().type('LegalEntity{enter}');

    //Add constraint
    cy.contains('Constraints').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add constraint"]').click();
    cy.get('input[name="Constraint name"]').type('constraintSize');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).click().type('{selectall}{backspace}$this.employees->size() > 2');

    //Add derived properties
    cy.contains('Derived Properties').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add derived property"]').click();
    cy.get('input[name="Derived property name"]').click().type('firstEmployee');
    cy.getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER).invoke('show').click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').type('Person{enter}');
    cy.get('input[name="Type from bound"]').clear().type('0');
    cy.get('input[name="Type to bound"]').clear().type('1');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).click().type('{selectall}{backspace}|$this.employees->first()');

    demoTest.compile();

    //Sync changes
    cy.get('[title="Sync with workspace (Ctrl + S)"]').click();
    cy.wait('@syncChanges').its('status').should('eq', 200)
  });

  it('Successfully creates mappings', () => {
    //Initialize workspace
    setUp({ sdlcServer, execServer });
    cy.visit(`${PROJECT_ID}/${WORKSPACE}`);
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    demoTest.openWorkspace();

    cy.contains('demo').rightclick();
    cy.contains('Add a new package').click();
    cy.get('input[name="Element name"]').type('other');
    cy.get('[title="Create new package"]').contains('Create').click();

    demoTest.createClass('other', 'NPerson');
    demoTest.addProperty('NPerson', 'fullName');

    //Add Enums
    cy.contains('other').rightclick();
    cy.contains('Add a new enumeration').click();
    cy.get('input[name="Element name"]').type('IncType');
    cy.get('[title="Create new enumeration"]').contains('Create').click();
    cy.contains('IncType').click();
    cy.contains('Values').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add enum value"]').click();
    cy.get('input[name="Type enum name"]').type('LLC');
    cy.get('[title="See detail"]').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).first().get('[title="Add enum value"]').click();
    cy.get('input[name="Type enum name"]').eq(1).type('CORP');
    cy.get('[title="See detail"]').eq(1).click();

    //Adding property in Firm
    cy.contains('Firm').click();
    cy.contains('Properties').click();
    demoTest.addProperty('Firm', 'incType', 2);
    cy.get('.property-basic-editor__type').contains('String').getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER).eq(2).invoke('show').click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').eq(2).type('IncType{enter}');

    demoTest.createClass('other', 'NFirm');
    demoTest.addProperty('NFirm', 'nEmployees');
    cy.get('.property-basic-editor__type').contains('String').getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER).invoke('show').click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').type('NPerson{enter}');
    cy.get('input[name="Type to bound"]').clear().type('*');
    demoTest.addProperty('NFirm', 'name', 1);
    demoTest.addProperty('NFirm', 'incType', 2);
    cy.get('.property-basic-editor__type').contains('String').getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER).eq(2).invoke('show').click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').eq(2).type('IncType{enter}');

    //Adding constraint
    cy.contains('Constraints').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add constraint"]').click();
    cy.get('input[name="Constraint name"]').type('namePrefix');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).click().type('{selectall}{backspace}$this.name->startsWith(\'MC\')');

    //Add new mapping
    cy.contains('demo').rightclick();
    cy.contains('Add a new mapping').click();
    cy.get('input[name="Element name"]').type('MyMapping');
    cy.get('[title="Create new mapping"]').contains('Create').click();

    //Mapping NPerson to Person
    createMapping('NPerson', 'Person');

    //Mapping properties
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).click().type('$src.firstName + \' \' + $src.lastName');

    //Toggle Auxiliary panel
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();

    //Execute
    cy.contains('EXECUTE').click();
    cy.get('[title="Choose a target"]').click();
    cy.get('.selector-input__control').click().type('NPerson{enter}');

    cy.get('.tree-view__node__container').contains('fullName').click();

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').its('status').should('eq', 200);

    //see execution plan
    cy.get('[title="See exection plan"]').click();
    cy.wait('@postGeneratePlan').its('status').should('eq', 200);
    cy.contains('Close').click();

    //Toggle Auxiliary panel
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();

    //Mapping NFirm to Firm
    createMapping('NFirm', 'Firm');

    //Mapping properties
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).eq(0).click().type('$src.incType');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).eq(1).click().type('$src.legalName');
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).eq(2).click().type('$src.employees');

    //Toggle Auxiliary panel
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();

    //Execute
    cy.contains('EXECUTE').click();
    cy.get('[title="Choose a target"]').click();
    cy.get('.selector-input__control').last().click().type('NFirm{enter}');

    cy.get('.mapping-execution-panel__target-panel__query-container').contains('incType').click();
    cy.get('.mapping-execution-panel__target-panel__query-container').contains('name').click();
    cy.get('.mapping-execution-panel__target-panel__query-container').contains('nEmployees').click();
    cy.get('.mapping-execution-panel__target-panel__query-container').contains('fullName').click();

    cy.get('.monaco-editor').eq(3).click().focused().type('{ctrl}a').type('{{}' +
      '  "employees": [' +
      '    {{}' +
      '      "firstName": "Tyler",' +
      '      "lastName": "Durden"' +
      '    }' +
      '  ],' +
      '  "legalName": "DataTeam",' +
      '  "incType": "LLC"' +
      '');

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(200);
      const namePrefixDefect = response.body?.values?.defects[0];
      const constraintSizeDefect = response.body?.values?.source?.defects[0];

      expect(namePrefixDefect).to.deep.equal({
        enforcementLevel: "Error",
        externalId: null,
        id: "namePrefix",
        message: "Constraint :[namePrefix] violated in the Class NFirm",
        path: [],
        ruleDefinerPath: "demo::other::NFirm",
        ruleType: "ClassConstraint"
      });

      expect(constraintSizeDefect).to.deep.equal({
        enforcementLevel: "Error",
        externalId: null,
        id: "constraintSize",
        message: "Constraint :[constraintSize] violated in the Class Firm",
        path: [],
        ruleDefinerPath: "demo::Firm",
        ruleType: "ClassConstraint"
      });
    });

    //add data to clear defects
    cy.get('.monaco-editor').eq(3).click().focused().type('{ctrl}a').type('{{}' +
      '  "employees": [' +
      '    {{}' +
      '      "firstName": "Tyler",' +
      '      "lastName": "Durden"' +
      '    },' +
      '    {{}' +
      '      "firstName": "Big",' +
      '      "lastName": "Lebowski"' +
      '    },' +
      '    {{}' +
      '      "firstName": "Geralt",' +
      '      "lastName": "Witcher"' +
      '    }' +
      '  ],' +
      '  "legalName": "MCDataTeam",' +
      '  "incType": "LLC"' +
      '');

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
    cy.get('[title="See exection plan"]').click();
    cy.wait('@postGeneratePlan').its('status').should('eq', 200);
    cy.contains('Close').click();


    //Add new mapping for IncType
    cy.getByTestID(TEST_ID.MAPPING_EXPLORER).get('[title="Create new mapping element"]').click();
    cy.get('.selector-input__control').last().click().type('IncType{enter}');
    cy.get('.btn').contains('Create').click();
    cy.get('[placeholder="Source value"]').eq(0).click().type('Llc');
    cy.get('[placeholder="Source value"]').eq(1).click().type('Corporation');

    //Setting property of IncType to string
    cy.getByTestID(TEST_ID.EDIT_PANEL__HEADER_TABS).contains('Firm').click();
    cy.contains('Properties').click();
    cy.get('.property-basic-editor__type').contains('IncType').getByTestID(TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER).eq(2).invoke('show').click();
    cy.get('.selector-input__control').click();
    cy.get('.property-basic-editor__type').eq(2).type('String{enter}');

    cy.getByTestID(TEST_ID.EDIT_PANEL__HEADER_TABS).contains('MyMapping').click();

    cy.contains('EXECUTE').click();
    cy.get('[title="Choose a target"]').click();
    cy.get('.selector-input__control').last().click().type('NFirm{enter}');

    cy.get('.mapping-execution-panel__target-panel__query-container').contains('incType').click();
    cy.get('.mapping-execution-panel__target-panel__query-container').contains('name').click();
    cy.get('.mapping-execution-panel__target-panel__query-container').contains('nEmployees').click();
    cy.get('.mapping-execution-panel__target-panel__query-container').contains('fullName').click();

    cy.get('[title="Execute"]').click();
    cy.wait('@postExecute').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(500);
      expect(response.body.message).to.equal("Error in class mapping 'demo::MyMapping' for property 'incType' - Type error: 'String' is not a subtype of 'demo::other::IncType'");
    });


    //add data to clear defects
    cy.get('.monaco-editor').eq(0).click().focused().type('{ctrl}a').type('{{}' +
      '  "employees": [' +
      '    {{}' +
      '      "firstName": "Tyler",' +
      '      "lastName": "Durden"' +
      '    },' +
      '    {{}' +
      '      "firstName": "Big",' +
      '      "lastName": "Lebowski"' +
      '    },' +
      '    {{}' +
      '      "firstName": "Geralt",' +
      '      "lastName": "Witcher"' +
      '    }' +
      '  ],' +
      '  "legalName": "MCDataTeam",' +
      '  "incType": "Corporation"' +
      '');

    cy.get('[title="Class mapping \'demo_other_NFirm\' for \'NFirm\'"]').click();

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
    cy.get('[title="See exection plan"]').click();
    cy.wait('@postGeneratePlan').its('status').should('eq', 200);
    cy.contains('Close').click();

    //Promote to test
    cy.get('[title="Promote to test"]').click();
    cy.get('[title="Run test"]').first().click();
    cy.wait('@postExecute').its('status').should('eq', 200);

    //Failing a test
    cy.get('[title="Class mapping \'demo_other_NFirm\' for \'NFirm\'"]').click();
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).eq(1).click().type('{selectall}{backspace}$src.legalName + \' \'');
    cy.wait(500);
    cy.contains('test_1').click();
    cy.get('[title="Run test"]').first().click();
    cy.wait('@postExecute').its('status').should('eq', 200);
    cy.contains('Test failed');

    //Passing test
    cy.get('[title="Class mapping \'demo_other_NFirm\' for \'NFirm\'"]').click();
    cy.getByTestID(TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT).eq(1).click().type('{selectall}{backspace}$src.legalName');
    cy.wait(500);
    cy.contains('test_1').click();
    cy.get('[title="Run test"]').first().click();
    cy.wait('@postExecute').its('status').should('eq', 200);
    cy.contains('Test passed');

    demoTest.cleanup();
  });
});
