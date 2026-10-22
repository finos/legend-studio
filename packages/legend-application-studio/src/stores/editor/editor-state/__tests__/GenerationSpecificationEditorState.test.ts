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

import { test, expect, beforeEach } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import type { Entity } from '@finos/legend-storage';
import {
  GenerationSpecification,
  type GenerationTreeNode,
  type PackageableElement,
} from '@finos/legend-graph';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../../EditorStore.js';
import { GenerationSpecificationEditorState } from '../GenerationSpecificationEditorState.js';
import { TEST_DATA__GenerationSpecificationStages } from './TEST_DATA__GenerationSpecificationStages.js';

const SPEC_PATH = 'test::tGenSpec';

/**
 * The nodes exactly as the specification was written, to compare an untouched node against.
 */
const TEST_DATA__writtenNodes = (
  guaranteeNonNullable(
    TEST_DATA__GenerationSpecificationStages.find(
      (entity) => entity.path === SPEC_PATH,
    ),
  ).content as unknown as {
    generationNodes: {
      id: string;
      generationElement?: string;
      generationElements?: string[];
    }[];
  }
).generationNodes;

let editorStore: EditorStore;
let specState: GenerationSpecificationEditorState;

const getElement = (path: string): PackageableElement =>
  editorStore.graphManagerState.graph.getElement(path);

const getStage = (index: number): GenerationTreeNode =>
  guaranteeNonNullable(specState.spec.generationNodes[index]);

const getSpecEntityContent = (): Record<PropertyKey, unknown> =>
  editorStore.graphManagerState.graphManager.elementToEntity(specState.spec)
    .content;

const getSerializedNodes = (): {
  id: string;
  generationElement?: string;
  generationElements?: string[];
}[] =>
  (
    getSpecEntityContent() as unknown as {
      generationNodes: {
        id: string;
        generationElement?: string;
        generationElements?: string[];
      }[];
    }
  ).generationNodes;

beforeEach(async () => {
  editorStore = TEST__getTestEditorStore();
  await TEST__buildGraphWithEntities(
    editorStore.graphManagerState,
    TEST_DATA__GenerationSpecificationStages as Entity[],
  );
  specState = new GenerationSpecificationEditorState(
    editorStore,
    editorStore.graphManagerState.graph.getElement(SPEC_PATH),
  );
  expect(specState.spec).toBeInstanceOf(GenerationSpecification);
});

test(unitTest('Stages are the generation nodes, in the declared order'), () => {
  expect(specState.stageCount).toBe(2);
  expect(
    specState.generationTreeNodeStates.map((nodeState) =>
      nodeState.node.generationElements.map(
        (elementRef) => elementRef.value.path,
      ),
    ),
  ).toEqual([['test::tMapping', 'test::tMapping2'], ['test::tMapping3']]);
  // lane identity survives a reorder, so the DOM is not rebuilt under the drag
  const nodeStates = specState.generationTreeNodeStates;
  expect(specState.generationTreeNodeStates[0]).toBe(nodeStates[0]);
});

test(
  unitTest('An untouched node written with the singular field keeps that form'),
  () => {
    // change something unrelated: a third element joins the stage that was already a group
    specState.addElementToStage(getStage(0), getElement('test::tMapping3'));

    const nodes = getSerializedNodes();
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toStrictEqual({
      generationElements: [
        'test::tMapping',
        'test::tMapping2',
        'test::tMapping3',
      ],
      id: 'theGroup',
    });
    // the node nothing was done to is serialized exactly as it was written
    expect(nodes[1]).toStrictEqual(TEST_DATA__writtenNodes[1]);
  },
);

test(
  unitTest('An untouched node written with the plural field keeps that form'),
  () => {
    // change something unrelated: the other stage, the one written as a single element
    specState.addElementToStage(getStage(1), getElement('test::tMapping'));

    expect(getSerializedNodes()[0]).toStrictEqual(TEST_DATA__writtenNodes[0]);
  },
);

test(
  unitTest('A node that takes a second element gives up the singular form'),
  () => {
    specState.addElementToStage(getStage(1), getElement('test::tMapping'));

    const node = guaranteeNonNullable(getSerializedNodes()[1]);
    // writing the singular field would have dropped the element that just joined
    expect(node.generationElement).toBeUndefined();
    expect(node.generationElements).toEqual([
      'test::tMapping3',
      'test::tMapping',
    ]);
  },
);

test(
  unitTest('A stage the editor creates is written in the plural form'),
  () => {
    specState.addElementAsNewStage(getElement('test::tMapping'));

    expect(specState.stageCount).toBe(3);
    const node = guaranteeNonNullable(getSerializedNodes()[2]);
    expect(node.generationElement).toBeUndefined();
    expect(node.generationElements).toEqual(['test::tMapping']);
    // the default id is the element's path, kept distinct from the ids already in the specification
    expect(node.id).toBe('test::tMapping');
  },
);

test(
  unitTest(
    'A new stage holding an element another stage holds gets its own id',
  ),
  () => {
    specState.addElementAsNewStage(getElement('test::tMapping'));
    specState.addElementAsNewStage(getElement('test::tMapping'));

    expect(getSerializedNodes().map((node) => node.id)).toEqual([
      'theGroup',
      'theSingleElement',
      'test::tMapping',
      'test::tMapping (2)',
    ]);
  },
);

test(unitTest('An element cannot join a stage that already holds it'), () => {
  specState.addElementToStage(getStage(0), getElement('test::tMapping'));

  expect(getStage(0).generationElements).toHaveLength(2);
});

test(unitTest('The same element may run in more than one stage'), () => {
  specState.addElementAsNewStage(getElement('test::tMapping'));

  expect(specState.elementUsageIndex.get('test::tMapping')).toBe(2);
  expect(specState.elementUsageIndex.get('test::tMapping3')).toBe(1);
});

test(unitTest('The last element leaving a stage dissolves the stage'), () => {
  const stage = getStage(1);
  specState.deleteElement(
    stage,
    guaranteeNonNullable(stage.generationElements[0]),
  );

  expect(specState.stageCount).toBe(1);
  expect(getSerializedNodes().map((node) => node.id)).toEqual(['theGroup']);
});

test(
  unitTest('Moving the last element of a stage into another merges the two'),
  () => {
    const source = getStage(1);
    specState.moveElementToStage(
      source,
      guaranteeNonNullable(source.generationElements[0]),
      getStage(0),
    );

    expect(specState.stageCount).toBe(1);
    const node = guaranteeNonNullable(getSerializedNodes()[0]);
    expect(node.generationElements).toEqual([
      'test::tMapping',
      'test::tMapping2',
      'test::tMapping3',
    ]);
  },
);

test(
  unitTest('An element moved out of a stage lands in a stage right after it'),
  () => {
    const stage = getStage(0);
    specState.moveElementToNewStage(
      stage,
      guaranteeNonNullable(stage.generationElements[1]),
    );

    expect(specState.stageCount).toBe(3);
    expect(
      specState.spec.generationNodes.map((node) =>
        node.generationElements.map((elementRef) => elementRef.value.path),
      ),
    ).toEqual([['test::tMapping'], ['test::tMapping2'], ['test::tMapping3']]);
  },
);

test(
  unitTest('An element dropped on the new-stage strip becomes the last stage'),
  () => {
    const stage = getStage(0);
    specState.moveElementToNewStage(
      stage,
      guaranteeNonNullable(stage.generationElements[0]),
      specState.stageCount,
    );

    expect(
      specState.spec.generationNodes.map((node) =>
        node.generationElements.map((elementRef) => elementRef.value.path),
      ),
    ).toEqual([['test::tMapping2'], ['test::tMapping3'], ['test::tMapping']]);
  },
);

test(unitTest('Reordering a stage reorders the saved specification'), () => {
  specState.moveStage(1, 0);

  expect(getSerializedNodes().map((node) => node.id)).toEqual([
    'theSingleElement',
    'theGroup',
  ]);
  expect(
    specState.generationTreeNodeStates.map((nodeState) => nodeState.node.id),
  ).toEqual(['theSingleElement', 'theGroup']);
});

test(
  unitTest('An unnamed stage id follows the elements the stage holds'),
  () => {
    specState.addElementAsNewStage(getElement('test::tMapping'));
    const newStage = getStage(2);
    expect(newStage.id).toBe(newStage.defaultId);

    specState.addElementToStage(newStage, getElement('test::tMapping2'));
    expect(newStage.id).toBe('test::tMapping,test::tMapping2');

    // an id its author chose is left alone
    const namedStage = getStage(0);
    specState.addElementToStage(namedStage, getElement('test::tMapping3'));
    expect(namedStage.id).toBe('theGroup');
  },
);

test(
  unitTest('A failure is recorded against the element that caused it'),
  () => {
    const generationState = editorStore.graphState.graphGenerationState;
    const stage = getStage(0);
    const elementRef = guaranteeNonNullable(stage.generationElements[0]);
    generationState.modelGenerationFailures.push({
      node: stage,
      elementRef,
      message: 'boom',
    });

    expect(
      generationState.getModelGenerationFailure(stage, elementRef)?.message,
    ).toBe('boom');
    // ... and is dropped as soon as that element is moved out of the stage it failed in
    specState.moveElementToNewStage(stage, elementRef);
    expect(
      generationState.getModelGenerationFailure(stage, elementRef),
    ).toBeUndefined();
  },
);
