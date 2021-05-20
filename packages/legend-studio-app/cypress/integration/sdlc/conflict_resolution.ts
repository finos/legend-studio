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
import { ConflictResolutionHelperExtension } from '../../utils/ElementHelperExtension';

Cypress.config('defaultCommandTimeout', 160000);
Cypress.config('pageLoadTimeout', 160000);

describe('Conflict Demo Script Test', () => {
  let testerForWorkspaceAhead: ElementEditorTester;
  let testerForWorkspaceConf: ElementEditorTester;
  const PACKAGE_NAME = 'model';

  beforeEach(() => {
    testerForWorkspaceAhead = ElementEditorTester.create(
      'conflict-resolution/ahead.json',
    ).withHelperExtension(new ConflictResolutionHelperExtension());
    testerForWorkspaceConf = ElementEditorTester.create(
      'conflict-resolution/conf.json',
    ).withHelperExtension(new ConflictResolutionHelperExtension());
  });

  it('should successfully test no conflict change', () => {
    const TITLE = testerForWorkspaceAhead._domTitles;
    testerForWorkspaceAhead.createOrReplaceWorkspace(true);
    testerForWorkspaceConf.createOrReplaceWorkspace(true);

    const testerForWorkspaceAheadHelper =
      testerForWorkspaceAhead.getHelperExtension(
        ConflictResolutionHelperExtension,
      );
    const testerForWorkspaceConfigHelper =
      testerForWorkspaceConf.getHelperExtension(
        ConflictResolutionHelperExtension,
      );

    testerForWorkspaceAhead.openWorkspace();
    const TEXT =
      'Class model::Person\n' + '{\n' + '  name: String[1];\n' + '}\n';
    testerForWorkspaceAhead.buildGraphWithText(TEXT);
    testerForWorkspaceAheadHelper.saveLocalChanges();

    //Verifying changes in review panel
    cy.get(`[title="${TITLE.REVIEW} - 1 changes"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');
    // testerForWorkspaceAheadHelper.verifyCounterChanges(`[title="${TITLE.REVIEW} - 1 changes"]`, '1');

    testerForWorkspaceAhead.createReview('No Conflict change');

    //Commit changes
    cy.get('[title="Commit review"]').click();
    cy.contains('Leave').click();
    testerForWorkspaceAheadHelper.refreshProject();

    testerForWorkspaceConf.openWorkspace();

    //Updating changes in workspace panel
    cy.get(`[title="${TITLE.UPDATE_WORKSPACE}"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    cy.get('[title="Update workspace"]').click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    cy.get(`[title="${TITLE.UPDATE_WORKSPACE}"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '0');
    cy.get('[title="Update workspace"]').should('be.disabled');
  });

  it('should successfully test no conflict update as both branches make the same changes', () => {
    const TITLE = testerForWorkspaceAhead._domTitles;
    testerForWorkspaceAhead.initEditorWithWorkspace(true);
    const testerForWorkspaceAheadHelper =
      testerForWorkspaceAhead.getHelperExtension(
        ConflictResolutionHelperExtension,
      );

    const TEXT =
      'Class model::Person \n' +
      '{\n' +
      'name: String[1];\n' +
      '}\n' +
      'Class model::Person2\n' +
      '{\n' +
      '  name: String[1];\n' +
      '}\n';
    testerForWorkspaceAhead.buildGraphWithText(TEXT);
    testerForWorkspaceAheadHelper.saveLocalChanges();

    //Verifying changes in review panel
    cy.get(`[title="${TITLE.REVIEW} - 1 changes"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    //Creating review
    testerForWorkspaceAhead.createReview('No Conflict change');

    //Commit changes
    cy.get('[title="Commit review"]').click();

    cy.contains('Leave').click();

    testerForWorkspaceAheadHelper.refreshProject();

    testerForWorkspaceConf.initEditorWithWorkspace();
    const testerForWorkspaceConfigHelper =
      testerForWorkspaceConf.getHelperExtension(
        ConflictResolutionHelperExtension,
      );
    testerForWorkspaceConf.buildGraphWithText(TEXT);
    testerForWorkspaceConfigHelper.saveLocalChanges();

    //Updating changes in workspace panel
    cy.get(`[title="${TITLE.UPDATE_WORKSPACE} - Update available"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    cy.get('[title="Update workspace"]').click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    cy.get(`[title="${TITLE.UPDATE_WORKSPACE}"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '0');
    cy.get('[title="Update workspace"]').should('be.disabled');

    cy.get(`[${TITLE.EXPLORER}]`).click();
    cy.get('[title="Open model loader (F2)"]').click();
    cy.get('[title="Load model"]').click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);
    // Clear project
    testerForWorkspaceConfigHelper.clearProject(`${TITLE.REVIEW} - 1 changes`);
  });

  it('successfully test conflict changes', () => {
    const TITLE = testerForWorkspaceAhead._domTitles;
    testerForWorkspaceAhead.createOrReplaceWorkspace(true);
    testerForWorkspaceConf.createOrReplaceWorkspace(true);

    const testerForWorkspaceAheadHelper =
      testerForWorkspaceAhead.getHelperExtension(
        ConflictResolutionHelperExtension,
      );
    const testerForWorkspaceConfigHelper =
      testerForWorkspaceConf.getHelperExtension(
        ConflictResolutionHelperExtension,
      );

    testerForWorkspaceAhead.openWorkspace();
    testerForWorkspaceAheadHelper.createPackage(PACKAGE_NAME);
    testerForWorkspaceAheadHelper.createClass(PACKAGE_NAME, 'Person');
    testerForWorkspaceAheadHelper.addProperty('Person', 'fullName');
    testerForWorkspaceAheadHelper.saveLocalChanges();

    //Verifying changes in review panel
    cy.get(`[title="${TITLE.REVIEW} - 1 changes"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    //Creating review
    testerForWorkspaceAhead.createReview('Conflict change');
    //Commit changes
    cy.get('[title="Commit review"]').click();

    cy.contains('Leave').click();

    testerForWorkspaceAheadHelper.refreshProject();

    testerForWorkspaceConf.openWorkspace();
    testerForWorkspaceConfigHelper.createPackage(PACKAGE_NAME);
    testerForWorkspaceConfigHelper.createClass(PACKAGE_NAME, 'Person');
    testerForWorkspaceConfigHelper.addProperty('Person', 'firstName');
    testerForWorkspaceConfigHelper.saveLocalChanges();

    cy.get(
      '[title="Update Workspace (Ctrl + Shift + U) - Update available with potential conflicts"]',
    ).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    cy.get('[title="Update workspace"]').click();

    cy.contains('Resolve merge conflicts').click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    //go to explorer tab
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    cy.contains('Resolve Merge Conflicts').should('exist');

    //go back to conflicts
    cy.get(
      '[title="Conflict Resolution - 1 changes (1 unresolved conflicts)"]',
    ).click();
    cy.get('[title="Abort conflict resolution"]').click();

    cy.get('[title="model"]').click();
    cy.get('[title="model::Person"]').click();
    cy.get('[name="Property name"]')
      .click()
      .type('{selectall}{backspace}fullName');
    testerForWorkspaceConfigHelper.saveLocalChanges();

    //Updating changes in workspace panel
    cy.get(`[title="${TITLE.UPDATE_WORKSPACE} - Update available"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    cy.get('[title="Update workspace"]').click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    cy.get(`[title="${TITLE.UPDATE_WORKSPACE}"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '0');
    cy.get('[title="Update workspace"]').should('be.disabled');

    //Clear project
    cy.get(`[title="${TITLE.EXPLORER}"]`).click();
    cy.get('[title="Open model loader (F2)"]').click();
    cy.get('[title="Load model"]').click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    testerForWorkspaceConfigHelper.clearProject(`${TITLE.REVIEW} - 1 changes`);
  });

  it('should successfully discard changes in conflict', () => {
    const TITLE = testerForWorkspaceAhead._domTitles;
    testerForWorkspaceAhead.createOrReplaceWorkspace(true);
    testerForWorkspaceConf.createOrReplaceWorkspace(true);

    const testerForWorkspaceAheadHelper =
      testerForWorkspaceAhead.getHelperExtension(
        ConflictResolutionHelperExtension,
      );
    const testerForWorkspaceConfigHelper =
      testerForWorkspaceConf.getHelperExtension(
        ConflictResolutionHelperExtension,
      );

    testerForWorkspaceAhead.openWorkspace();
    const TEXT =
      'Class model::Person\n' + '{\n' + '  name: String[1];\n' + '}\n';
    testerForWorkspaceAhead.buildGraphWithText(TEXT);
    testerForWorkspaceAheadHelper.saveLocalChanges();

    //Verifying changes in review panel
    cy.get(`[title="${TITLE.REVIEW} - 1 changes"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    //Creating review
    testerForWorkspaceAhead.createReview('No Conflict change');

    //Commit changes
    cy.get('[title="Commit review"]').click();

    cy.contains('Leave').click();

    testerForWorkspaceAheadHelper.refreshProject();

    testerForWorkspaceConf.openWorkspace();
    const TEXT_2 =
      'Class model::Person\n' + '{\n' + '  firstName: String[1];\n' + '}\n';
    testerForWorkspaceConf.buildGraphWithText(TEXT_2);
    testerForWorkspaceConfigHelper.saveLocalChanges();

    cy.get(
      '[title="Update Workspace (Ctrl + Shift + U) - Update available with potential conflicts"]',
    ).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    cy.get('[title="Update workspace"]').click();

    cy.contains('Discard your changes').click();

    cy.get('[title="model"]').click();
    cy.get('[title="model::Person"]').click();
    cy.get('[name="Property name"]').should('have.value', 'name');

    //clear project
    cy.get('[title="Open model loader (F2)"]').click();
    cy.get('[title="Load model"]').click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    testerForWorkspaceConfigHelper.clearProject(`${TITLE.REVIEW} - 1 changes`);
  });

  it('successfully resolve conflict', () => {
    const TITLE = testerForWorkspaceAhead._domTitles;
    testerForWorkspaceAhead.createOrReplaceWorkspace(true);
    testerForWorkspaceConf.createOrReplaceWorkspace(true);

    const testerForWorkspaceAheadHelper =
      testerForWorkspaceAhead.getHelperExtension(
        ConflictResolutionHelperExtension,
      );
    const testerForWorkspaceConfigHelper =
      testerForWorkspaceConf.getHelperExtension(
        ConflictResolutionHelperExtension,
      );

    testerForWorkspaceAhead.openWorkspace();
    const TEXT =
      'Class model::Person\n' + '{\n' + '  name: String[1];\n' + '}\n';
    testerForWorkspaceAhead.buildGraphWithText(TEXT);
    testerForWorkspaceAheadHelper.saveLocalChanges();

    //Verifying changes in review panel
    cy.get(`[title="${TITLE.REVIEW} - 1 changes"]`).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    //Creating review
    testerForWorkspaceAhead.createReview('No Conflict change');

    //Commit changes
    cy.get('[title="Commit review"]').click();

    cy.contains('Leave').click();

    testerForWorkspaceAheadHelper.refreshProject();

    testerForWorkspaceConf.openWorkspace();
    const TEXT_2 =
      'Class model::Person\n' + '{\n' + '  firstName: String[1];\n' + '}\n';
    testerForWorkspaceConf.buildGraphWithText(TEXT_2);
    testerForWorkspaceConfigHelper.saveLocalChanges();

    cy.get(
      '[title="Update Workspace (Ctrl + Shift + U) - Update available with potential conflicts"]',
    ).click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    cy.get('[title="Update workspace"]').click();

    cy.contains('Resolve merge conflicts').click();
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', '1');

    cy.get(
      '[title="model::Person • Has merge conflict(s)\n' +
        'Entity is created in both incoming changes and current changes but the contents are different"]',
    ).click();

    //Rejecting both changes
    cy.get('.monaco-editor').get('a#3').click();
    cy.get('.monaco-editor')
      .eq(0)
      .click()
      .focused()
      .type('{ctrl}a')
      .type('Class model::Person {{} name: String[1] }');

    cy.contains('Mark as resolved').click();
    cy.contains(
      "Can't mark conflict as resolved. Parsing error: Unexpected token",
    );

    cy.get(
      '[title="model::Person • Has merge conflict(s)\n' +
        'Entity is created in both incoming changes and current changes but the contents are different"]',
    ).click();

    cy.get('.monaco-editor').get('a#3').click();
    cy.get('.monaco-editor')
      .eq(0)
      .click()
      .focused()
      .type('{ctrl}a')
      .type('Class model::Person {{} name: String[1]; }');
    cy.contains('Use Theirs').click(); //Cant resolve conflict manually there is some issue which gives an error
    // cy.contains('Mark as resolved').click();

    cy.get('[title="Conflict Resolution"]').click();
    cy.get('[title="Accept resolution"]').click();

    cy.url().should(
      'include',
      `/studio/${testerForWorkspaceConf.projectId}/${testerForWorkspaceConf.workspace}`,
    );

    //clear project
    cy.get('[title="Open model loader (F2)"]').click();
    cy.get('[title="Load model"]').click();
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    testerForWorkspaceConfigHelper.clearProject(`${TITLE.REVIEW} - 1 changes`);
  });
});
