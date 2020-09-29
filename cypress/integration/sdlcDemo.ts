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
// eslint-disable-next-line no-restricted-imports
import { TEST_ID } from '../../app/const';
import { getConfigUrls } from '../utils/configUtil';
import StudioTest from "../utils/StudioTest";

type Argument<T> = {
  sdlcServer: T,
  execServer: T,
  PROJECT_ID: T,
  WORKSPACE: T
}

type Setup = {
  ({ sdlcServer, execServer, PROJECT_ID, WORKSPACE }: Argument<string>): void;
}
const setUp: Setup = ({ sdlcServer, execServer, PROJECT_ID, WORKSPACE }) => {
  cy.server();
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/${PROJECT_ID}/workspaces`
  }).as('getWorkspaces');
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/${PROJECT_ID}/conflictResolution`
  }).as('getConflictResolution');

  cy.route({
    method: 'POST',
    url: `${sdlcServer}/projects/${PROJECT_ID}/workspaces/${WORKSPACE}`
  }).as('postWorkspace');
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/${PROJECT_ID}`
  }).as('getProjectDetails');
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/${PROJECT_ID}/workspaces/${WORKSPACE}`
  }).as('getWorkspace');
  cy.route({
    method: 'POST',
    url: `${sdlcServer}/projects/${PROJECT_ID}/workspaces/${WORKSPACE}/entityChanges`
  }).as('postEntityChanges');
  cy.route({
    method: 'OPTIONS',
    url: `${sdlcServer}/projects/${PROJECT_ID}/workspaces/${WORKSPACE}/entityChanges`
  }).as('optionsEntityChanges');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/grammar/transformJsonToGrammar`
  }).as('postTransformJsonToGrammar');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/grammar/transformGrammarToJson`
  }).as('postTransformGrammarToJson');
  cy.route({
    method: 'GET',
    url: `${sdlcServer}/projects/${PROJECT_ID}/workspaces/${WORKSPACE}/inConflictResolutionMode`
  }).as('getInConflictResolutionMode');
  cy.route({
    method: 'POST',
    url: `${execServer}/api/pure/v1/compilation/compile`
  }).as('compile');
  cy.route({
    method: 'POST',
    url: `${sdlcServer}/projects/${PROJECT_ID}/reviews`
  }).as('postReview');
};

Cypress.config('defaultCommandTimeout', 30000);
Cypress.config('pageLoadTimeout', 60000);

let sdlcServer = '', execServer = '', PROJECT_NAME = '', DESCRIPTION = '', PROJECT_ID = '', WORKSPACE = '', TITLE: any = {}, PACKAGE_NAME = '';
let sdlcDemoTest: StudioTest;

describe('SDLC Demo Script Test', () => {
  beforeEach(() => {
    cy.fixture('sdlcDemo.json').then(sdlcDemoJSON => {
      PROJECT_NAME = sdlcDemoJSON.PROJECT_NAME;
      DESCRIPTION = sdlcDemoJSON.DESCRIPTION;
      PROJECT_ID = sdlcDemoJSON.PROJECT_ID;
      WORKSPACE = sdlcDemoJSON.WORKSPACE;
      TITLE = sdlcDemoJSON.TITLE;
      PACKAGE_NAME = sdlcDemoJSON.PACKAGE_NAME;

      getConfigUrls().then(response => {
        sdlcServer = response[0];
        execServer = response[1];
        sdlcDemoTest = new StudioTest({ sdlcServer, execServer, PROJECT_NAME, PROJECT_ID, WORKSPACE});
      });
    });

    cy.viewport(1920, 1080);
  });

  it('successfully test local changes', () => {
    cy.visit(PROJECT_ID);
    setUp({ sdlcServer, execServer, PROJECT_ID, WORKSPACE });
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    //Creating workspace
    sdlcDemoTest.createAndOpenWorkspace();

    //Verifying No changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES}"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '0');

    //Creating package
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    sdlcDemoTest.createPackage(PACKAGE_NAME);

    //Creating Class
    sdlcDemoTest.createClass(PACKAGE_NAME, 'Person');

    //Verifying local changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES} - 1 unsynced changes"]`).click();
    cy.getByTestID(TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR).should('have.text', '1');
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '1');
    cy.get(`[title="${PACKAGE_NAME}::Person • Created"]`).click();
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT).get('.entity-diff-view__header__info__comparison-summary').should('have.text', `Entity '${PACKAGE_NAME}::Person' is created`);

    //Saving local changes
    cy.getByTestID(TEST_ID.STATUS_BAR).contains('1 unsynced changes');
    cy.getByTestID(TEST_ID.STATUS_BAR).get('[title="Sync with workspace (Ctrl + S)"]').should('not.be.disabled');
    cy.getByTestID(TEST_ID.STATUS_BAR).get('[title="Sync with workspace (Ctrl + S)"]').last().click();
    cy.wait('@postTransformJsonToGrammar').its('status').should('eq', 200);
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);
    cy.wait('@postEntityChanges').its('status').should('eq', 200);

    cy.getByTestID(TEST_ID.STATUS_BAR).contains('synced with workspace');
    cy.getByTestID(TEST_ID.STATUS_BAR).get('[title="Sync with workspace (Ctrl + S)"]').should('be.disabled');
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT).contains('Entity contents are identical');

    //Verifying Review changes
    cy.get(`[title="${TITLE.REVIEW} - 1 changes"]`).get('.activity-bar__review-icon > div').should('have.class', 'activity-bar__item__icon__indicator activity-bar__item__icon__indicator__dot activity-bar__item__icon__review-changes__indicator');

    //Add class
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    sdlcDemoTest.createClass(PACKAGE_NAME, 'Firm');

    //Add properties
    sdlcDemoTest.addProperty('Person', 'firstName');

    //Verify local changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES} - 2 unsynced changes"]`).click();
    cy.getByTestID(TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR).should('have.text', '2');
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '2');

    cy.get(`[title="${PACKAGE_NAME}::Person • Modified"]`).click();
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT).get('.entity-diff-view__header__info__comparison-summary').should('have.text', `Entity '${PACKAGE_NAME}::Person' is modified`);

    cy.get(`[title="${PACKAGE_NAME}::Firm • Created"]`).click();
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT).get('.entity-diff-view__header__info__comparison-summary').should('have.text', `Entity '${PACKAGE_NAME}::Firm' is created`);

    //Save local changes
    cy.getByTestID(TEST_ID.STATUS_BAR).contains('2 unsynced changes');
    cy.getByTestID(TEST_ID.STATUS_BAR).get('[title="Sync with workspace (Ctrl + S)"]').should('not.be.disabled');
    cy.getByTestID(TEST_ID.STATUS_BAR).get('[title="Sync with workspace (Ctrl + S)"]').last().click();
    cy.wait('@postTransformJsonToGrammar').its('status').should('eq', 200);
    cy.wait('@postEntityChanges').its('status').should('eq', 200);
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    cy.getByTestID(TEST_ID.STATUS_BAR).contains('synced with workspace');
    cy.getByTestID(TEST_ID.STATUS_BAR).get('[title="Sync with workspace (Ctrl + S)"]').should('be.disabled');
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT).first().contains('Entity contents are identical');
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT).last().contains('Entity contents are identical');

    //Update property
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    cy.contains('Person').click();
    cy.get('input[name="Property name"]').focus().clear();
    cy.get('input[name="Property name"]').type('lastName');

    //Verify changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES} - 1 unsynced changes"]`).click();
    cy.getByTestID(TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR).should('have.text', '1');
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '1');

    //Reverting changes
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    cy.contains('Person').click();
    cy.get('input[name="Property name"]').focus().clear();
    cy.get('input[name="Property name"]').type('firstName');

    //Verify changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES}"]`).click();
    cy.getByTestID(TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR).should('have.text', '');
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '0');
  });

  it('successfully test local changes in hackermode', () => {
    cy.visit(`${PROJECT_ID}/${WORKSPACE}`);
    setUp({ sdlcServer, execServer, PROJECT_ID, WORKSPACE });
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    sdlcDemoTest.openWorkspace();

    //Toggle Hackermode
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT).get('[title="Toggle text mode (F8)"]').click();
    cy.wait('@postTransformJsonToGrammar');

    //Delete class
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    cy.get('.monaco-editor').first().click().focused().type('{ctrl}a').type(`Class model::Person {{}firstName: String[1]; }`);

    sdlcDemoTest.compile();

    //Verify changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES} - 1 unsynced changes"]`).click();
    cy.getByTestID(TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR).should('have.text', '1');
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '1');

    //Re-adding class
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    cy.get('.monaco-editor').first().click().focused().type('{moveToEnd}').type(`Class model::Firm {{}}`);

    sdlcDemoTest.compile();

    //Verify changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES}"]`).click();
    cy.getByTestID(TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR).should('have.text', '');
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '0');

    //Exit hackermode
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT).get('[title="Toggle text mode (F8)"]').click();
    cy.wait('@postTransformGrammarToJson');
});

it('successfully test project overview', () => {
    cy.visit(`${PROJECT_ID}/${WORKSPACE}`);
    setUp({ sdlcServer, execServer, PROJECT_ID, WORKSPACE });
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    sdlcDemoTest.openWorkspace();
    //Project Overview
    cy.get(`[title="${TITLE.PROJECT_OVERVIEW}"]`).click();
    cy.get(`[title="${TITLE.OVERVIEW}"]`).click();
    cy.get('[title="Project Name"]').should('have.value', PROJECT_NAME);
    cy.get('[title="PROJECT DESCRIPTION"]').should('have.value', DESCRIPTION);

    //Add tag
    cy.contains('Add Value').click();
    cy.get('[title="TAG INPUT"]').click().type('testTag');
    cy.contains('Save').click();
    cy.get(`[title="Update project"]`).click();
    cy.wait('@getProjectDetails').its('status').should('eq', 200);

    //Refresh
    cy.reload();
    cy.wait('@getProjectDetails').its('status').should('eq', 200);
    cy.wait('@getWorkspace').its('status').should('eq', 200);

    cy.get(`[title="${TITLE.PROJECT_OVERVIEW}"]`).click();
    cy.get(`[title="${TITLE.OVERVIEW}"]`).click();

    //Verify Changes
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS).eq(0).should('have.text', 'testTag');
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS).eq(0).trigger('mouseover');
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS).eq(0).get('.panel__content__form__section__list__item__remove-btn').click({ force: true });
    cy.get(`[title="Update project"]`).click();
    cy.wait('@getProjectDetails').its('status').should('eq', 200);

    //Refresh
    cy.reload();
    cy.wait('@getProjectDetails').its('status').should('eq', 200);
    cy.wait('@getWorkspace').its('status').should('eq', 200);

    cy.get(`[title="${TITLE.PROJECT_OVERVIEW}"]`).click();
    cy.get(`[title="${TITLE.OVERVIEW}"]`).click();

    //Verify Changes
    cy.getByTestID(TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS).children().should('have.length', 0);
  });

  it('successfully test project review', () => {
    cy.visit(`${PROJECT_ID}/${WORKSPACE}`);
    setUp({ sdlcServer, execServer, PROJECT_ID, WORKSPACE });
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    sdlcDemoTest.openWorkspace();

    //Verfying no changes in workspace update panel
    cy.get(`[title="${TITLE.UPDATE_WORKSPACE}"]`).click();
    cy.get(`[title="Update workspace"]`).should('be.disabled');
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).first().should('have.text', '0');

    //Verifying changes in review panel
    cy.get(`[title="${TITLE.REVIEW} - 2 changes"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).first().should('have.text', '2');

    //Creating review
    cy.get('[placeholder="Title"]').focus().clear().type('MyReview');
    cy.get('[title="Create review"]').click();
    cy.wait('@postReview').its('status').should('eq', 200);

    cy.get('[title="Close review"]').click();
    cy.wait(2000);

    cy.get('[placeholder="Title"]').focus().clear().type('MyReview2{enter}');
    cy.wait('@postReview').its('status').should('eq', 200);

    // //goto reviewer screen (Update: not needed)
    // cy.get('.workspace-review__title__content__input__link').should('have.attr', 'href').then(href => {
    //   reviewerHref = href;
    //   cy.visit(href);
    // });
  });

  //not needed
  // it('successfully test project review from reviewer screen', () => {
  //   cy.visit(reviewerHref.slice(7));
  //   setUp({ sdlcServer, execServer, PROJECT_ID, WORKSPACE });
  //   cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT).should('have.text', '2');
  //   cy.get('[title="Close review"]').click();

  //   cy.get('[title="Re-open review"]').click();
  // });

  it('successfully test merge project', () => {
    cy.visit(`${PROJECT_ID}/${WORKSPACE}`);
    setUp({ sdlcServer, execServer, PROJECT_ID, WORKSPACE });
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    sdlcDemoTest.openWorkspace();

    cy.get(`[title="${TITLE.REVIEW}"]`).click();

    //Commit changes
    cy.get('[title="Commit review"]').click();

    cy.contains('Leave').click();

    //Verfying homepage
    cy.url().should('include', `/studio/${PROJECT_ID}`);
  });

  it('successfully delete package', () => {
    cy.visit(`${PROJECT_ID}`);
    setUp({ sdlcServer, execServer, PROJECT_ID, WORKSPACE });
    cy.wait('@getWorkspaces').its('status').should('eq', 200);
    cy.wait('@getConflictResolution').its('status').should('eq', 200);

    sdlcDemoTest.createAndOpenWorkspace();

    //Delete package
    cy.contains(PACKAGE_NAME).rightclick();
    cy.getByTestID(TEST_ID.EXPLORER_CONTEXT_MENU).contains('Delete').click();

    //Save changes
    cy.get(`[title="${TITLE.LOCAL_CHANGES} - 2 unsynced changes"]`).click();
    cy.getByTestID(TEST_ID.STATUS_BAR).get('[title="Sync with workspace (Ctrl + S)"]').last().click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);
    cy.wait('@postEntityChanges').its('status').should('eq', 200);

    cy.get(`[title="${TITLE.REVIEW} - 2 changes"]`).click();
    cy.get('[placeholder="Title"]').focus().clear().type('Deleting model changes{enter}');
    cy.wait('@postReview').its('status').should('eq', 200);
    cy.get('[title="Commit review"]').click();

    cy.contains('Leave').click();

    //Verfying homepage
    cy.url().should('include', `/studio/${PROJECT_ID}`);
  });
});
