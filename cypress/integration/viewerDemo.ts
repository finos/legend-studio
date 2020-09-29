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

import {TEST_ID} from '../../app/const';
import {getConfigUrls} from '../utils/configUtil';
import StudioTest from "../utils/StudioTest";

type Argument<T> = {
    sdlcServer: T,
    PROJECT_ID: T,
    WORKSPACE: T
}

type Setup = {
    ({ sdlcServer, PROJECT_ID, WORKSPACE }: Argument<string>): void;
}
const setUp: Setup = ({ sdlcServer, PROJECT_ID, WORKSPACE }) => {
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

};

Cypress.config('defaultCommandTimeout', 30000);
Cypress.config('pageLoadTimeout', 60000);

let sdlcServer = '', execServer = '', PROJECT_NAME = '', PROJECT_ID = '', WORKSPACE = '', TITLE: any = {}, PACKAGE_NAME = '', REVISION_ID= '';
let viewerDemoTest: StudioTest;

describe('Viewer Demo Script Test', () => {
    beforeEach(() => {
        cy.fixture('viewerDemo.json').then(viewerDemoJSON => {
            PROJECT_NAME = viewerDemoJSON.PROJECT_NAME;
            PROJECT_ID = viewerDemoJSON.PROJECT_ID;
            WORKSPACE = viewerDemoJSON.WORKSPACE;
            PACKAGE_NAME = viewerDemoJSON.PACKAGE_NAME;
            TITLE = viewerDemoJSON.TITLE;
            REVISION_ID = viewerDemoJSON.REVISION_ID;

          getConfigUrls().then(response => {
            sdlcServer = response[0];
            execServer = response[1];
            cy.visit(PROJECT_ID, {
              onBeforeLoad(win) {
                cy.stub(win, 'open');
              }
            });
            setUp({sdlcServer, PROJECT_ID, WORKSPACE});
            cy.wait('@getWorkspaces').its('status').should('eq', 200);
            cy.wait('@getConflictResolution').its('status').should('eq', 200);
            viewerDemoTest = new StudioTest({ sdlcServer, execServer, PROJECT_NAME, PROJECT_ID, WORKSPACE});
          });
        });

        cy.viewport(1920, 1080);
    });

    it('successfully open element and verify', () => {
        viewerDemoTest.createAndOpenWorkspace();

        //Click open viewer
        cy.get(`[title=${PACKAGE_NAME}]`).click();
        cy.contains('Person').rightclick();
        cy.getByTestID(TEST_ID.EXPLORER_CONTEXT_MENU).contains('Open Viewer').click();
        cy.window().its('open').should('be.called');

        //Verify changes on viewer
        cy.visit(`viewer/${PROJECT_ID}/element/model::Person`);
        cy.contains(PACKAGE_NAME);
        cy.contains('Person').click();
        cy.get('[title="model::Person"').should('exist');
        cy.url().should('not.include', `/element/model::Person`);

        viewerDemoTest.backToProject();
        viewerDemoTest.cleanup();
    });

    it('successfully open not-found element and verify', () => {
        viewerDemoTest.createAndOpenWorkspace();

        //Creating class
        cy.contains(PACKAGE_NAME).rightclick();
        cy.contains('Add a new class').click();
        cy.getByTestID(TEST_ID.NEW_ELEMENT_MODAL).get('input').type('Firm');
        cy.get('[title="Create new class"]').contains('Create').click();

        //Click open viewer
        cy.contains('Firm').rightclick();
        cy.getByTestID(TEST_ID.EXPLORER_CONTEXT_MENU).contains('Open Viewer').click();
        cy.window().its('open').should('be.called');

        //Verify changes on viewer
        cy.visit(`viewer/${PROJECT_ID}/element/model::Firm`);
        cy.contains(PACKAGE_NAME);
        cy.contains('Person').should('not.exist');
        cy.contains(`Can\'t find element \'model::Firm\' in project \'${PROJECT_ID}\'`);
        cy.url().should('not.include', `/element/model::Firm`);

        viewerDemoTest.backToProject();
        viewerDemoTest.cleanup();
    });

    it('successfully open project', () => {
        viewerDemoTest.createAndOpenWorkspace();

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

        viewerDemoTest.backToProject();
        viewerDemoTest.cleanup();
    });

    it('successfully open project from version', () => {
        viewerDemoTest.createAndOpenWorkspace();

        //click on share link button
        cy.get('[title="Share..."]').click();

        //set version
        cy.contains('Select...').click();
        cy.get('#react-select-5-option-0').click();

        //copy link
        cy.contains('Copy Link').click();
        cy.contains('Copied project link to clipboard');

        //verify link
        cy.visit(`viewer/${PROJECT_ID}/version/0.1.0`);
        cy.contains(PACKAGE_NAME).click();
        cy.contains('Person').click();
        cy.get('[title="model::Person"').should('exist');

        viewerDemoTest.backToProject();
        viewerDemoTest.cleanup();
    });

    it('successfully open project from revision id', () => {
        cy.visit(`viewer/${PROJECT_ID}/revision/${REVISION_ID}`);
        cy.contains(PACKAGE_NAME).click();
        cy.contains('Person').should('exist');
    });
});