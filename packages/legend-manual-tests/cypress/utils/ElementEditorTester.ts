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
import { EDITOR_LANGUAGE } from '../../src/stores/EditorConfig';
import { getConfigUrls } from './E2ETestUtil';
import { editor as MonacoEditorAPI } from 'monaco-editor';
import { Clazz, guaranteeType } from '@finos/legend-shared';
import { EndToEndTester } from './EndToEndTester';
import { ElementHelperExtension } from './ElementHelperExtension';

export class ElementEditorTester extends EndToEndTester {
  // TODO make this an array
  helperExtension?: ElementHelperExtension;

  public static create(
    configFile = 'element-editor.json',
  ): ElementEditorTester {
    const elementEditorTest = new ElementEditorTester();
    cy.fixture(configFile).then((demoJSON) => {
      elementEditorTest._projectName = demoJSON.PROJECT_NAME;
      elementEditorTest._projectId = demoJSON.PROJECT_ID;
      elementEditorTest._workspace = demoJSON.WORKSPACE;
      getConfigUrls().then((response) => {
        elementEditorTest._sdlcServer = response[0];
        elementEditorTest._engineServer = response[1];
        cy.server();
        elementEditorTest.loadRoutes();
      });
    });
    return elementEditorTest;
  }

  withHelperExtension(
    helperExtension: ElementHelperExtension,
  ): ElementEditorTester {
    this.helperExtension = helperExtension;
    return this;
  }
  getHelperExtension<T extends ElementHelperExtension>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.helperExtension,
      clazz,
      `No helper extension found`,
    );
  }

  buildGraphWithText = (
    graphText: string,
    editorLanguage = EDITOR_LANGUAGE.PURE,
  ): void => {
    let editorModels: MonacoEditorAPI.IStandaloneCodeEditor[];
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get(`[title="${this._domTitles.TOGGLE_TEXT_MODE}"]`)
      .click()
      .get(`[data-mode-id="${editorLanguage}"]`)
      .window()
      .then((win) => {
        editorModels = (win as any).monaco.editor.getModels();
      })
      .then(() => {
        expect(editorModels.length).to.equal(1);
        editorModels[0].setValue(graphText);
      })
      .getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get(`[title="${this._domTitles.TOGGLE_TEXT_MODE}"]`)
      .click();
    cy.contains('Open or Search for an Element');
  };

  getMonacoText = (idx?: number): Cypress.Chainable<string> => {
    let editorModels: MonacoEditorAPI.IStandaloneCodeEditor[];
    return cy
      .window()
      .then((win) => {
        editorModels = (win as any).monaco.editor.getModels();
      })
      .then(() => {
        if (!idx) {
          expect(editorModels.length).to.equal(1);
          const model = editorModels[0];
          return model.getValue();
        }
        return editorModels[idx].getValue();
      });
  };

  addToGraphText = (appendText: string): void => {
    let editorModels: MonacoEditorAPI.IStandaloneCodeEditor[];
    cy.window()
      .then((win) => {
        editorModels = (win as any).monaco.editor.getModels();
      })
      .then(() => {
        expect(editorModels.length).to.equal(1);
        const model = editorModels[0];
        editorModels[0].setValue(model.getValue() + appendText);
      });
  };

  setTextToGraphText = (text: string, child: number = 0): void => {
    let editorModels: MonacoEditorAPI.IStandaloneCodeEditor[];
    cy.window()
      .then((win) => {
        editorModels = (win as any).monaco.editor.getModels();
      })
      .then(() => {
        editorModels[child].setValue(text);
      });
  };

  setDevTools = (): void => {
    cy.get(`[title="Settings..."]`).click();
    cy.contains('Show Developer Tool').click();
    cy.contains('Payload compression').parent().children().eq(1).click();
    cy.get('[title="Toggle auxiliary panel (Ctrl + `)"]').click();
  };

  compile = (): void => {
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Compile (F9)"]')
      .click();
    cy.wait('@compile').its('status').should('eq', 200);
    cy.contains('Compiled successfully');
  };

  createReview = (title: string): void => {
    cy.get('[placeholder="Title"]').focus().clear().type(title);
    cy.get('[title="Create review"]').click();
    cy.wait('@postReview').its('status').should('eq', 200);
  };

  toggleOnHackerMode = (): void => {
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Toggle text mode (F8)"]')
      .click();
    cy.wait('@postTransformJsonToGrammar');
  };

  toggleOffHackerMode = (): void => {
    cy.getByTestID(TEST_ID.EDITOR__STATUS_BAR__RIGHT)
      .get('[title="Toggle text mode (F8)"]')
      .click();
    cy.wait('@postTransformGrammarToJson');
  };

  setUpRoutes = (): void => {
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces`,
    }).as('getWorkspaces');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}/conflictResolution`,
    }).as('getConflictResolution');
    cy.route({
      method: 'POST',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}`,
    }).as('postWorkspace');
    //same as above but with different alias
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}/entities`,
    }).as('getEntities');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/schemaGeneration/avro`,
    }).as('avroGeneration');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/schemaGeneration/protobuf`,
    }).as('protobufGeneration');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/compilation/compile`,
    }).as('compile');
    cy.route({
      method: 'POST',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}/entityChanges`,
    }).as('syncChanges');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/execution/execute`,
    }).as('postExecute');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/execution/doMappingTest`,
    }).as('doMappinTest');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/execution/generatePlan`,
    }).as('postGeneratePlan');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/grammar/transformGrammarToJson`,
    }).as('transformGrammarToJson');
    cy.route({
      method: 'POST',
      url: `${this.sdlcServer}/projects/${this.projectId}/reviews`,
    }).as('postReview');
    cy.route({
      method: 'POST',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}/entityChanges`,
    }).as('postEntityChanges');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}/inConflictResolutionMode`,
    }).as('getInConflictResolutionMode');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/grammar/transformJsonToGrammar`,
    }).as('postTransformJsonToGrammar');
    cy.route({
      method: 'POST',
      url: `${this.engineServer}/api/pure/v1/grammar/transformGrammarToJson`,
    }).as('postTransformGrammarToJson');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}`,
    }).as('getProjectDetails');
    cy.route({
      method: 'GET',
      url: `${this.sdlcServer}/projects/${this.projectId}/workspaces/${this.workspace}`,
    }).as('getWorkspace');
  };
}
