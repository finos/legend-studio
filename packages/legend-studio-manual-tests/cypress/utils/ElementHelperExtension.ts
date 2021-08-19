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

import { TEST_ID } from '../../src/const';

export abstract class ElementHelperExtension {
  name!: string;

  openElement = (packageName: string, name: string): void => {
    cy.contains(packageName).click();
    cy.contains(name).click();
  };

  createClass = (packageName: string, className: string): void => {
    cy.contains(packageName).rightclick();
    cy.contains('New Class...').click();
    cy.get('[name="Element name"]').type(className);
    // TODO: use test-library query
    cy.get('.btn--primary').click();
  };

  addProperty = (
    className: string,
    property: string,
    childNo: number = 0,
  ): void => {
    cy.contains(className).click();
    cy.contains('Properties').click();
    cy.getByTestID(TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER)
      .get('[title="Add property"]')
      .click();
    cy.get('input[name="Property name"]').eq(childNo).type(property);
  };

  createPackage = (packageName: string): void => {
    // TODO: use test-library query
    cy.get('[title="New Element... (Ctrl + Shift + N)"]').click();
    cy.contains('New Package...').click();
    cy.get('[name="Element name"]').type(packageName);
    // TODO: use test-library query
    cy.get('.btn--primary').click();
  };

  saveLocalChanges = (): void => {
    cy.getByTestID(TEST_ID.STATUS_BAR)
      .get('[title="Sync with workspace (Ctrl + S)"]')
      .should('not.be.disabled');
    cy.getByTestID(TEST_ID.STATUS_BAR)
      .get('[title="Sync with workspace (Ctrl + S)"]')
      .last()
      .click();
    cy.wait('@postEntityChanges').its('status').should('eq', 200);
    cy.wait('@getInConflictResolutionMode').its('status').should('eq', 200);

    cy.getByTestID(TEST_ID.STATUS_BAR).contains('synced with workspace');
    cy.getByTestID(TEST_ID.STATUS_BAR)
      .get('[title="Sync with workspace (Ctrl + S)"]')
      .should('be.disabled');
  };

  verifyLocalChanges = (id: string, changesCount: string): void => {
    cy.get(id).click();
    cy.getByTestID(TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR)
      .first()
      .should('have.text', changesCount === '0' ? '' : changesCount);
    cy.getByTestID(TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT)
      .first()
      .should('have.text', changesCount);
  };
}
export class CoreElementHelper extends ElementHelperExtension {}

export class FileGenerationHelperExtension extends ElementHelperExtension {
  showAndVerifyGenerationView = (
    generationType: string,
    apiAlias: string,
  ): void => {
    cy.getByTestID(TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS)
      .contains(generationType)
      .click();
    cy.wait(apiAlias).its('status').should('eq', 200);
    cy.getByTestID(TEST_ID.TREE_VIEW__NODE__BLOCK).should('not.be.empty');
    cy.getByTestID(TEST_ID.EDIT_PANEL).contains(generationType).click();
  };
}

export class MappingHelperExtension extends ElementHelperExtension {
  createClassMapping = (
    targetClassPath: string,
    sourceClassName: string,
    setImplId?: string,
  ): void => {
    cy.getByTestID(TEST_ID.MAPPING_EXPLORER)
      .get('[title="Create new mapping element"]')
      .click();
    cy.get('.selector-input__control')
      .last()
      .click()
      .type(`${targetClassPath}{enter}`);
    if (setImplId) {
      cy.get('input[placeholder="Mapping element ID"]').clear().type(setImplId);
    }
    cy.get('.btn').contains('Create').click();
    cy.getByTestID(TEST_ID.SOURCE_PANEL).contains('Choose a source...').click();
    cy.get('.selector-input__control')
      .last()
      .click()
      .type(`${sourceClassName}{enter}`);
  };

  deleteMappingElement = (id: string): void => {
    cy.contains(`[${id}]`).rightclick();
    cy.contains('Delete').click();
  };

  toggleClassMappingRoot = (): void => {
    cy.get('[title="Set/Unset root class mapping"]').click();
  };

  loadMappingRoutes = (eningeServer: string): void => {
    cy.route({
      method: 'POST',
      url: `${eningeServer}/api/pure/v1/execution/execute`,
    }).as('execute');
  };
}

export class ServiceHelperExtension extends MappingHelperExtension {
  loadServiceRoutes = (eningeServer: string): void => {
    this.loadMappingRoutes(eningeServer);
    cy.route({
      method: 'POST',
      url: `${eningeServer}/api/pure/v1/execution/testDataGeneration/generateTestData_WithDefaultSeed`,
    }).as('generateServiceData');
  };
}

export class ConflictResolutionHelperExtension extends ElementHelperExtension {
  refreshProject = (): void => {
    cy.reload();
    cy.wait('@getWorkspace').its('status').should('eq', 200);
  };

  clearProject = (title: string): void => {
    cy.get(`[title="${title}"]`).click();
    //Creating review
    cy.get('[placeholder="Title"]').focus().clear().type('Clear Project');
    cy.get('[title="Create review"]').click();
    cy.wait('@postReview').its('status').should('eq', 200);
    //Commit changes
    cy.get('[title="Commit review"]').click();
    cy.contains('Leave').click();
  };
}

export class SDLCHelperExtension extends ElementHelperExtension {
  updateProperty = (
    className: string,
    propertyName: string,
    child = 0,
  ): void => {
    cy.contains(className).click();
    cy.get('input[name="Property name"]').eq(child).focus().clear();
    cy.get('input[name="Property name"]').eq(child).type(propertyName);
  };

  verifyEnitiy = (id: string, entity: string): void => {
    cy.get(id).click();
    cy.getByTestID(TEST_ID.EDIT_PANEL_CONTENT)
      .get('.entity-diff-view__header__info__comparison-summary')
      .should('have.text', entity);
  };

  refresh = (): void => {
    cy.reload();
    cy.wait('@getProjectDetails').its('status').should('eq', 200);
    cy.wait('@getWorkspace').its('status').should('eq', 200);
  };
}
