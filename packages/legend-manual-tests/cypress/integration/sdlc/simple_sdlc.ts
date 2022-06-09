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
import { SDLCHelperExtension } from '../../utils/ElementHelperExtension.js';

const TEXT =
  'Class model::Firm\n' +
  '{\n' +
  '}\n' +
  '\n' +
  'Class model::Person\n' +
  '{\n' +
  '  firstName: String[1];\n' +
  '}\n';

describe('SDLC Demo Script Test', () => {
  let demoTest: ElementEditorTester;
  const PACKAGE_NAME = 'model';
  beforeEach(() => {
    demoTest = ElementEditorTester.create(
      'simple-sdlc.json',
    ).withHelperExtension(new SDLCHelperExtension());
  });

  it('successfully test local changes', () => {
    const TITLE = demoTest._domTitles;
    demoTest.initEditorWithWorkspace(true);
    const sdlcHelper = demoTest.getHelperExtension(SDLCHelperExtension);

    //Verifying No changes
    sdlcHelper.verifyLocalChanges(
      `[title="${demoTest._domTitles.LOCAL_CHANGES}"]`,
      '0',
    );

    //Creating package
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    sdlcHelper.createPackage(PACKAGE_NAME);

    //Creating Class
    sdlcHelper.createClass(PACKAGE_NAME, 'Person');

    //Verifying local changes
    sdlcHelper.verifyLocalChanges(`[title="${TITLE.LOCAL_CHANGES}"]`, '1');
    sdlcHelper.verifyEnitiy(
      `[title="${PACKAGE_NAME}::Person • Created"]`,
      `Entity '${PACKAGE_NAME}::Person' is created`,
    );

    //Saving local changes
    sdlcHelper.saveLocalChanges();
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT).contains(
      'Entity contents are identical',
    );

    //Verifying Review changes
    cy.get(`[title="${TITLE.REVIEW} - 1 changes"]`)
      .get('.activity-bar__review-icon > div')
      .should(
        'have.class',
        'activity-bar__item__icon__indicator activity-bar__item__icon__indicator__dot activity-bar__item__icon__review-changes__indicator',
      );

    //Add class
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    sdlcHelper.createClass(PACKAGE_NAME, 'Firm');

    //Add properties
    sdlcHelper.addProperty('Person', 'firstName');

    //Verify local changes
    sdlcHelper.verifyLocalChanges(
      `[title="${TITLE.LOCAL_CHANGES} - 2 unsynced changes"]`,
      '2',
    );
    sdlcHelper.verifyEnitiy(
      `[title="${PACKAGE_NAME}::Person • Modified"]`,
      `Entity '${PACKAGE_NAME}::Person' is modified`,
    );
    sdlcHelper.verifyEnitiy(
      `[title="${PACKAGE_NAME}::Firm • Created"]`,
      `Entity '${PACKAGE_NAME}::Firm' is created`,
    );

    //Save local changes
    sdlcHelper.saveLocalChanges();
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT)
      .first()
      .contains('Entity contents are identical');
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT)
      .last()
      .contains('Entity contents are identical');

    //Update property
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    sdlcHelper.updateProperty('Person', 'lastName');

    //Verify changes
    sdlcHelper.verifyLocalChanges(
      `[title="${TITLE.LOCAL_CHANGES} - 1 unsynced changes"]`,
      '1',
    );

    //Reverting changes
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    sdlcHelper.updateProperty('Person', 'firstName');

    //Verify changes
    sdlcHelper.verifyLocalChanges(`[title="${TITLE.LOCAL_CHANGES}"]`, '0');
  });

  it('successfully test local changes in hackermode', () => {
    const TITLE = demoTest._domTitles;
    demoTest.initEditorWithWorkspace(true);
    const sdlcHelper = demoTest.getHelperExtension(SDLCHelperExtension);

    demoTest.buildGraphWithText(TEXT);
    sdlcHelper.saveLocalChanges();

    //Toggle Hackermode
    demoTest.toggleOnHackerMode();
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Toggle text mode (F8)"]')
      .click();
    cy.wait('@postTransformJsonToGrammar');

    //Delete class
    const DEL_CLASS_TEXT =
      'Class model::Person\n' + '{\n' + '  firstName: String[1];\n' + '}';
    demoTest.buildGraphWithText(DEL_CLASS_TEXT);
    demoTest.compile();

    //Verify changes
    sdlcHelper.verifyLocalChanges(
      `[title="${TITLE.LOCAL_CHANGES} - 1 unsynced changes"]`,
      '1',
    );

    //Re-adding class
    const ADD_CLASS_TEXT =
      'Class model::Firm\n' +
      '{\n' +
      '}\n' +
      '\n' +
      'Class model::Person\n' +
      '{\n' +
      '  firstName: String[1];\n' +
      '}\n';
    demoTest.buildGraphWithText(ADD_CLASS_TEXT);
    demoTest.compile();

    //Verify changes
    sdlcHelper.verifyLocalChanges(`[title="${TITLE.LOCAL_CHANGES}"]`, '0');

    //Exit hackermode
    demoTest.toggleOffHackerMode();
  });

  it('successfully test project tag', () => {
    const TITLE = demoTest._domTitles;
    demoTest.initEditorWithWorkspace();
    const sdlcHelper = demoTest.getHelperExtension(SDLCHelperExtension);

    //Project Overview
    cy.get(`[title="${TITLE.PROJECT_OVERVIEW}"]`).click();
    cy.get(`[title="${TITLE.OVERVIEW}"]`).click();
    cy.get('[title="Project Name"]').should(
      'have.value',
      demoTest._projectName,
    );
    cy.get('[title="PROJECT DESCRIPTION"]').should(
      'have.value',
      'Test used for studio end to end testing. \nDO NOT DELETE',
    );

    //Add tag
    cy.contains('Add Value').click();
    cy.get('[title="TAG INPUT"]').click().type('testTag');
    cy.contains('Save').click();
    cy.get(`[title="Update project"]`).click();
    cy.wait('@getProjectDetails').its('status').should('eq', 200);

    //Refresh
    sdlcHelper.refresh();

    cy.get(`[title="${TITLE.PROJECT_OVERVIEW}"]`).click();
    cy.get(`[title="${TITLE.OVERVIEW}"]`).click();

    //Verify Changes
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS)
      .eq(0)
      .should('have.text', 'testTag');
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS)
      .eq(0)
      .trigger('mouseover');
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS)
      .eq(0)
      .get('.panel__content__form__section__list__item__remove-btn')
      .click({ force: true });
    cy.get(`[title="Update project"]`).click();
    cy.wait('@getProjectDetails').its('status').should('eq', 200);

    //Refresh
    sdlcHelper.refresh();

    cy.get(`[title="${TITLE.PROJECT_OVERVIEW}"]`).click();
    cy.get(`[title="${TITLE.OVERVIEW}"]`).click();

    //Verify Changes
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS)
      .children()
      .should('have.length', 0);
  });

  it('successfully test project review and merge', () => {
    const TITLE = demoTest._domTitles;
    demoTest.initEditorWithWorkspace(true);
    const sdlcHelper = demoTest.getHelperExtension(SDLCHelperExtension);

    demoTest.buildGraphWithText(TEXT);
    sdlcHelper.saveLocalChanges();

    //Verfying no changes in workspace update panel
    sdlcHelper.verifyLocalChanges(`[title="${TITLE.UPDATE_WORKSPACE}"]`, '0');

    //Verifying changes in review panel
    cy.get(`[title="${TITLE.REVIEW} - 2 changes"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '2');

    //Creating review
    demoTest.createReview('MyReview');

    cy.get('[title="Close review"]').click();
    cy.wait(2000);

    //creating review using enter key
    cy.get('[placeholder="Title"]').focus().clear().type('MyReview2{enter}');
    cy.wait('@postReview').its('status').should('eq', 200);

    //Commit changes
    cy.get('[title="Commit review"]').click();

    cy.contains('Leave').click();

    //Verfying homepage
    cy.url().should('include', `/studio/${demoTest.projectId}`);
  });

  it('successfully clear project', () => {
    const TITLE = demoTest._domTitles;
    //Cleaning workspace committed changes
    demoTest.initEditorWithWorkspace();
    cy.get('[title="Open model loader (F2)"]').click();
    cy.get('[title="Load model"]').click();
    cy.wait('@getEntities').its('status').should('eq', 200);

    cy.get(`[title="${TITLE.REVIEW} - 2 changes"]`).click();
    demoTest.createReview('Deleting model changes');

    //Commit changes
    cy.get('[title="Commit review"]').click();
    cy.contains('Leave').click();

    //Verfying homepage
    cy.url().should('include', `/studio/${demoTest.projectId}`);
  });
});
