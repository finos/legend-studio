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

/// <reference path="../support/index.d.ts" />

import { TEST_ID } from '../../src/const.js';

const TITLE = {
  REVIEW: 'Review (Ctrl + Shift + M)',
  EXPLORER: 'Explorer (Ctrl + Shift + X)',
  LOCAL_CHANGES: 'Local Changes (Ctrl + Shift + G)',
  PROJECT_OVERVIEW: 'Project',
  OVERVIEW: 'Overview',
  UPDATE_WORKSPACE: 'Update Workspace (Ctrl + Shift + U)',
  TOGGLE_TEXT_MODE: 'Toggle text mode (F8)',
};

export class EndToEndTester {
  _sdlcServer!: string;
  _engineServer!: string;
  _projectId!: string;
  _projectName!: string;
  _workspace!: string;
  _domTitles = TITLE;
  get projectName(): string {
    return this._projectName;
  }
  get workspace(): string {
    return this._workspace;
  }
  get projectId(): string {
    return this._projectId;
  }
  get sdlcServer(): string {
    return this._sdlcServer;
  }
  get engineServer(): string {
    return this._engineServer;
  }

  initEditorWithWorkspace = (requireNewWorkspace = false): void => {
    this.createOrReplaceWorkspace(requireNewWorkspace);
    this.openWorkspace();
  };

  createOrReplaceWorkspace = (requireNewWorkspace = false): void => {
    this.setUpRoutes();
    // TODO: figure out why the app is throwing this and fix
    cy.on('uncaught:exception', (err, runnable) => {
      expect(err.message).to.include("Cannot read property 'getText' of null");
      return true;
    });
    cy.visit(`${this.projectId}/${this.workspace}`);
    this.ensureWorkspaceExists(requireNewWorkspace);
  };

  /**
   * Assumption: We are in the setup editor with the url /{projectId}/{workspace}
   * Our goal is to ensure we have a working workspace
   * We create a workspace if it doesn't exist or if the test requires a new workspace
   */
  ensureWorkspaceExists = (requireNewWorkspace?: boolean): void => {
    cy.getByTestID(TEST_ID.SETUP__CONTENT).should('contain', this.projectName);
    cy.wait('@getWorkspaces').then((data) => {
      const { status, response }: any = data;
      expect(status).to.equal(200);
      const workspaces = response.body;
      const result = workspaces.filter(
        (workspace: any) => workspace.workspaceId === this.workspace,
      );
      if (requireNewWorkspace && result.length === 1) {
        this.enterEditorAndDeleteWorkspace();
        cy.wait(5000);
        this.createWorkspace();
      } else if (result.length === 0) {
        this.createWorkspace();
      }
    });
  };

  enterEditorAndDeleteWorkspace(): void {
    cy.wait(500);
    cy.getByTestID(TEST_ID.SETUP__CONTENT).contains('Next').click();
    cy.get(`[title="${this._domTitles.PROJECT_OVERVIEW}"]`).click();
    cy.get('[title="Workspaces"]').click();
    cy.get('[title="Go to workspace detail"]')
      .contains(this.workspace)
      .rightclick();
    cy.contains('Delete').click();
    cy.url().should('include', `/studio/${this.projectId}`);
  }

  createWorkspace = (): void => {
    cy.get('[title="Create a Workspace"]').click();
    cy.get('input[name="Type workspace name"]')
      .clear()
      .type(`${this.workspace}`);
    cy.get('input[name="Type workspace name"]').should(
      'have.value',
      this.workspace,
    );
    cy.get('button:contains("Create")').click();
    cy.wait('@postWorkspace').its('status').should('eq', 200);
  };

  openWorkspace = (): void => {
    cy.visit(`${this.projectId}/${this.workspace}`);
    cy.getByTestID(TEST_ID.SETUP__CONTENT)
      .should('contain', this.projectName)
      .and('contain', this.workspace);
    cy.getByTestID(TEST_ID.SETUP__CONTENT).contains('Next').click();
    cy.wait('@getEntities').its('status').should('eq', 200);
  };

  compileSuccessfully = (): void => {
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Compile (F9)"]')
      .click();
    cy.wait('@compile').its('status').should('eq', 200);
    cy.contains('Compiled successfully');
  };

  compileFailure = (): void => {
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Compile (F9)"]')
      .click();
    cy.contains('Compilation failed');
  };

  backToProject = (): void => {
    cy.visit(`${this.projectId}/${this.workspace}`);
    cy.contains(this.workspace);
    cy.getByTestID(TEST_ID.SETUP__CONTENT).contains('Next').click();
  };

  setUpRoutes = (): void => {
    // ovveride
  };

  loadRoutes = (): void => {
    cy.server();
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces`,
    }).as('getWorkspaces');
    cy.route({
      method: 'POST',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}`,
    }).as('postWorkspace');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/compilation/compile`,
    }).as('compile');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}/entities`,
    }).as('getEntities');
  };
}
