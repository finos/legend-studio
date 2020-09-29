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

import 'PassThruWorker';
import { RenderResult, getByText } from '@testing-library/react';
import completeGraphEntities from 'Stores/__tests__/buildGraph/CompleteGraphEntitiesTestData.json';

import { integration } from 'Utilities/TestUtil';
import { openAndAssertPathWithElement, getMockedEditorStore, setUpEditor } from 'Components/__tests__/ComponentTestUtil';
import { testProject, testWorkspace, testProjectConfig, availableCodeGenerations, availableSchemaGenerations, testLatestProjectStructureVersion, currentTestRevision, availableCodeImports, availableSchemaImports } from 'Components/__tests__/SdlcTestData';
import { Entity } from 'SDLC/entity/Entity';
import { Project } from 'SDLC/project/Project';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { Workspace } from 'SDLC/workspace/Workspace';
import { ImportConfigurationDescription } from 'EXEC/modelImport/ImportConfigurationDescription';
import { GenerationConfigurationDescription } from 'EXEC/fileGeneration/GenerationConfigurationDescription';
import { ProjectStructureVersion } from 'SDLC/configuration/ProjectStructureVersion';
import { Revision } from 'SDLC/revision/Revision';
import { EditorStore } from 'Stores/EditorStore';
import { guaranteeNonNullable } from 'Utilities/GeneralUtil';

const packageRootChildren = [
  'apps',
  'contracts',
  'datamarts',
  'model',
  'model_candidate',
  'model_legacy',
  'ui'
];

let renderResult: RenderResult;
let mockedEditorStore: EditorStore;

beforeEach(async () => {
  mockedEditorStore = getMockedEditorStore();
  renderResult = await setUpEditor(mockedEditorStore, {
    project: testProject as unknown as Project,
    workspace: testWorkspace as Workspace,
    curentRevision: currentTestRevision as unknown as Revision,
    projectVersions: [],
    entities: completeGraphEntities as Entity[],
    projectConfiguration: testProjectConfig as unknown as ProjectConfiguration,
    availableCodeGenerationDescriptions: availableCodeGenerations as unknown as GenerationConfigurationDescription[],
    availableSchemaGenerationDescriptions: availableSchemaGenerations as unknown as GenerationConfigurationDescription[],
    latestProjectStructureVersion: testLatestProjectStructureVersion as ProjectStructureVersion,
    availableSchemaImportDescriptions: availableSchemaImports as unknown as ImportConfigurationDescription[],
    availableCodeImportDescriptions: availableCodeImports as unknown as ImportConfigurationDescription[]
  });
});

test(integration('Package Explorer'), async () => {
  const explorerTitleLabel = renderResult.getByText('workspace');
  const explorerTitle = explorerTitleLabel.parentElement as HTMLElement;
  getByText(explorerTitle, guaranteeNonNullable(mockedEditorStore.sdlcState.currentWorkspace).workspaceId);
  packageRootChildren.forEach(p => expect(renderResult.queryByText(p)).not.toBeNull());
  await openAndAssertPathWithElement('apps::ep::bi::tableauGovernance::governanceRule', renderResult);
  await openAndAssertPathWithElement('ui::mapping::editor::domain::ProfileTest', renderResult);
  await openAndAssertPathWithElement('model::domain::referenceData::entity::pwm::Privacy', renderResult);
  await openAndAssertPathWithElement('model_candidate::domain::referenceData::entity::pwm::Privacy', renderResult);
  await openAndAssertPathWithElement('model_legacy::domain::trade::contract::fpml', renderResult);
  // TODO test generation package when added to model;
});
