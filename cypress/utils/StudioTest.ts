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

import {TEST_ID} from "../../app/const";

type ConstructorArguments = {
  sdlcServer: string,
  PROJECT_ID: string,
  WORKSPACE: string,
  PROJECT_NAME: string,
  execServer: string
}

class StudioTest {
  private sdlcServer: string;
  private execServer: string;
  private PROJECT_NAME: string;
  private PROJECT_ID: string;
  private WORKSPACE: string;
  private TITLE = {
    REVIEW: "Review (Ctrl + Shift + M)",
    EXPLORER: "Explorer (Ctrl + Shift + X)",
    LOCAL_CHANGES: "Local Changes (Ctrl + Shift + G)",
    PROJECT_OVERVIEW: "Project",
    OVERVIEW: "Overview",
    UPDATE_WORKSPACE: "Update Workspace (Ctrl + Shift + U)"
  };

  constructor({ sdlcServer, execServer, PROJECT_NAME, PROJECT_ID, WORKSPACE }: ConstructorArguments) {
    this.sdlcServer = sdlcServer;
    this.execServer = execServer;
    this.PROJECT_NAME = PROJECT_NAME;
    this.PROJECT_ID = PROJECT_ID;
    this.WORKSPACE = WORKSPACE;
    this.loadRoutes();
  }

  private loadRoutes = () => {
    cy.server();
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.PROJECT_ID}/workspaces`
    }).as('getWorkspaces');
    cy.route({
      method: 'POST',
      url: `${this.sdlcServer}/projects/${this.PROJECT_ID}/workspaces/${this.WORKSPACE}`
    }).as('postWorkspace');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.PROJECT_ID}`
    }).as('getProjectDetails');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.PROJECT_ID}/workspaces/${this.WORKSPACE}`
    }).as('getWorkspace');
    cy.route({
      method: 'POST',
      url: `${this.execServer}/api/pure/v1/compilation/compile`
    }).as('compile');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.PROJECT_ID}/workspaces/${this.WORKSPACE}/entities`
    }).as('getEntities');
  };

  public createAndOpenWorkspace = () => {
    cy.get('[title="Create a Workspace"]').click();
    cy.get('input[name="Type workspace name"]').clear().type(`${this.WORKSPACE}{enter}`).should('have.value', this.WORKSPACE);
    cy.wait('@postWorkspace').its('status').should('eq', 200);
    this.openWorkspace();
  };

  public openWorkspace = () => {
    cy.getByTestID(TEST_ID.SETUP__CONTENT).should('contain', this.PROJECT_NAME).and('contain', this.WORKSPACE);
    cy.getByTestID(TEST_ID.SETUP__CONTENT).contains('Next').click();
    cy.wait('@getEntities').its('status').should('eq', 200);
  };

  public backToProject = () => {
    cy.visit(`${this.PROJECT_ID}/${this.WORKSPACE}`);
    cy.contains(this.WORKSPACE);
    cy.getByTestID(TEST_ID.SETUP__CONTENT).contains('Next').click();
  };

  public cleanup = () => {
    //Cleanup
    cy.get(`[title="${this.TITLE.PROJECT_OVERVIEW}"]`).click();
    cy.get('[title="Workspaces"]').click();
    cy.get('[title="Go to workspace detail"]').contains(this.WORKSPACE).rightclick();
    cy.contains('Delete').click();

    cy.url().should('include', `/studio/${this.PROJECT_ID}`);
  };

  public createPackage = (packageName: string) => {
    cy.get('[title="Create new element (Ctrl + Shift + N)"]').click();
    cy.contains('Add a new package').click();
    cy.get('[name="Element name"]').type(packageName);
    cy.get('[title="Create new package"').click();
  };

  public createClass = (packageName: string, className: string) => {
    cy.contains(packageName).rightclick();
    cy.contains('Add a new class').click();
    cy.get('[name="Element name"]').type(className);
    cy.get('[title="Create new class"]').contains('Create').click();
  };

  public addProperty = (className:string, property: string, childNo: number = 0) => {
    cy.contains(className).click();
    cy.contains('Properties').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER).get('[title="Add property"]').click();
    cy.get('input[name="Property name"]').eq(childNo).type(property);
  };

  public compile = () => {
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT).get('[title="Compile (F9)"]').click();
    cy.wait('@compile').its('status').should('eq', 200);
    cy.contains('Compiled sucessfully');
  }
}

export default StudioTest;