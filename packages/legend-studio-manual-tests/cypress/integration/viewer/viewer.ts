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

import { TEST_ID } from '../../../src/const';
import { ElementEditorTester } from '../../utils/ElementEditorTester';

describe('Viewer Demo Script Test', () => {
  let demoTest: ElementEditorTester;
  const PACKAGE_NAME = 'model';
  const REVISION_ID = '4502d6fefb7912aacc4d99c245fb70b44696aaee';
  beforeEach(() => {
    demoTest = ElementEditorTester.create('viewer.json');
  });

  it('successfully open element and verify', () => {
    const TITLE = demoTest._domTitles;
    const PROJECT_ID = demoTest.projectId;

    demoTest.initEditorWithWorkspace();

    //Click open viewer
    cy.get(`[title=${PACKAGE_NAME}]`).click();
    cy.contains('Person').rightclick();
    cy.getByTestID(TEST_ID.EXPLORER_CONTEXT_MENU).contains('Open Viewer');

    //Verify changes on viewer
    cy.visit(`viewer/${PROJECT_ID}/element/model::Person`);
    cy.contains(PACKAGE_NAME);
    cy.contains('Person').click();
    cy.get('[title="model::Person"').should('exist');
    cy.url().should('not.include', `/element/model::Person`);

    demoTest.backToProject();
  });

  it('successfully open not-found element and verify', () => {
    const TITLE = demoTest._domTitles;
    const PROJECT_ID = demoTest.projectId;

    demoTest.initEditorWithWorkspace();

    //Creating class
    cy.contains(PACKAGE_NAME).rightclick();
    cy.contains('New Class...').click();
    cy.getByTestID(TEST_ID.NEW_ELEMENT_MODAL).get('input').type('Firm');
    // TODO: use test-library query
    cy.get('.btn--primary').click();

    //Click open viewer
    cy.contains('Firm').rightclick();
    cy.getByTestID(TEST_ID.EXPLORER_CONTEXT_MENU).contains('Open Viewer');

    //Verify changes on viewer
    cy.visit(`viewer/${PROJECT_ID}/element/model::Firm`);
    cy.contains(PACKAGE_NAME);
    cy.contains('Person').should('not.exist');
    cy.contains(
      `Can\'t find element \'model::Firm\' in project \'${PROJECT_ID}\'`,
    );
    cy.url().should('not.include', `/element/model::Firm`);

    demoTest.backToProject();
  });

  it('successfully open project', () => {
    const TITLE = demoTest._domTitles;
    const PROJECT_ID = demoTest.projectId;

    demoTest.initEditorWithWorkspace();

    //click on share link button
    cy.get('[title="Share..."]').click();

    //copy link
    cy.contains('Copy Link').click();
    cy.contains('Copied project link to clipboard');

    //verify link
    cy.visit(`viewer/${PROJECT_ID}`);
    cy.contains(PACKAGE_NAME).click();
    cy.contains('Person').click();
    cy.get('[title="model::Person"').should('exist');

    demoTest.backToProject();
  });

  it('successfully open project from version', () => {
    const TITLE = demoTest._domTitles;
    const PROJECT_ID = demoTest.projectId;

    demoTest.initEditorWithWorkspace();

    //click on share link button
    cy.get('[title="Share..."]').click();

    //set version
    cy.contains('Select...').click();
    cy.get('#react-select-4-option-0').click();

    //copy link
    cy.contains('Copy Link').click();
    cy.contains('Copied project link to clipboard');

    //verify link
    cy.visit(`viewer/${PROJECT_ID}/version/0.1.0`);
    cy.contains(PACKAGE_NAME).click();
    cy.contains('Person').click();
    cy.get('[title="model::Person"').should('exist');

    demoTest.backToProject();
  });

  it('successfully open project from revision id', () => {
    const PROJECT_ID = demoTest.projectId;
    cy.visit(`viewer/${PROJECT_ID}/revision/${REVISION_ID}`);
    cy.contains(PACKAGE_NAME).click();
    cy.contains('Person').should('exist');
  });
});
