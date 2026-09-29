/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, test, expect } from '@jest/globals';
import { TabState } from '@finos/legend-lego/application';
import { EDITOR_TAB_KIND } from '../../../__lib__/LegendStudioTelemetryHelper.js';
import { getEditorTabTelemetryData } from '../EditorTabTelemetryHelper.js';
import { ArtifactGenerationViewerState } from '../editor-state/ArtifactGenerationViewerState.js';
import { EditorDiffViewerState } from '../editor-state/diff-viewer-state/EditorDiffViewerState.js';
import { ElementEditorState } from '../editor-state/element-editor-state/ElementEditorState.js';
import { EndToEndWorkflowEditorState } from '../editor-state/end-to-end-workflow-state/EndToEndWorkflowEditorState.js';
import { ModelImporterState } from '../editor-state/ModelImporterState.js';
import { ProjectConfigurationEditorState } from '../editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.js';
import type { EditorStore } from '../EditorStore.js';

/**
 * `getEditorTabTelemetryData` only needs `instanceof` checks plus a couple of
 * fields on the tab and a `getPackageableElementType` on the store. To keep
 * this test focused on classification (and free from the heavy constructors
 * of each editor state), we build prototype-only fakes rather than fully
 * constructed instances.
 */
const asPrototypeInstance = <T extends object>(
  ctor: abstract new (...args: never[]) => T,
  overrides: Partial<T>,
): T => {
  const instance = Object.create(ctor.prototype) as T;
  // Use defineProperty so we can shadow getter-only accessors declared on
  // the target prototype (e.g. `ElementEditorState.elementPath`).
  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(instance, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  return instance;
};

const buildFakeEditorStore = (elementKindLabel: string): EditorStore =>
  ({
    graphState: {
      getPackageableElementType: (): string => elementKindLabel,
    },
  }) as unknown as EditorStore;

describe('getEditorTabTelemetryData', () => {
  test('classifies an ElementEditorState as ELEMENT with resolved kind + path', () => {
    const fakeElement = { name: 'MyClass' };
    const tab = asPrototypeInstance(ElementEditorState, {
      element: fakeElement,
      elementPath: 'demo::MyClass',
    } as Partial<ElementEditorState>);

    const data = getEditorTabTelemetryData(tab, buildFakeEditorStore('CLASS'));

    expect(data).toEqual({
      tabKind: EDITOR_TAB_KIND.ELEMENT,
      elementKind: 'CLASS',
      elementPath: 'demo::MyClass',
    });
  });

  test('passes the tab element through to getPackageableElementType', () => {
    const fakeElement = { name: 'S' };
    const tab = asPrototypeInstance(ElementEditorState, {
      element: fakeElement,
      elementPath: 'demo::S',
    } as Partial<ElementEditorState>);
    let received: unknown;
    const editorStore = {
      graphState: {
        getPackageableElementType: (el: unknown): string => {
          received = el;
          return 'SERVICE';
        },
      },
    } as unknown as EditorStore;

    getEditorTabTelemetryData(tab, editorStore);

    expect(received).toBe(fakeElement);
  });

  test.each([
    [
      'EditorDiffViewerState',
      EditorDiffViewerState,
      EDITOR_TAB_KIND.ENTITY_DIFF,
    ],
    [
      'ArtifactGenerationViewerState',
      ArtifactGenerationViewerState,
      EDITOR_TAB_KIND.ARTIFACT_GENERATION,
    ],
    ['ModelImporterState', ModelImporterState, EDITOR_TAB_KIND.MODEL_IMPORTER],
    [
      'ProjectConfigurationEditorState',
      ProjectConfigurationEditorState,
      EDITOR_TAB_KIND.PROJECT_CONFIGURATION,
    ],
    [
      'EndToEndWorkflowEditorState',
      EndToEndWorkflowEditorState,
      EDITOR_TAB_KIND.END_TO_END_WORKFLOW,
    ],
  ])(
    'classifies %s to its dedicated bucket with no element fields',
    (_name, ctor, expectedKind) => {
      const tab = asPrototypeInstance(
        ctor as unknown as abstract new (...args: never[]) => TabState,
        {},
      );

      const data = getEditorTabTelemetryData(tab, buildFakeEditorStore('n/a'));

      expect(data).toEqual({ tabKind: expectedKind });
      expect(data.elementKind).toBeUndefined();
      expect(data.elementPath).toBeUndefined();
    },
  );

  test('falls back to OTHER for an unrecognised TabState subclass', () => {
    class UnknownTab extends TabState {
      get label(): string {
        return 'unknown';
      }
    }
    const tab = new UnknownTab();

    const data = getEditorTabTelemetryData(tab, buildFakeEditorStore('n/a'));

    expect(data).toEqual({ tabKind: EDITOR_TAB_KIND.OTHER });
  });
});
