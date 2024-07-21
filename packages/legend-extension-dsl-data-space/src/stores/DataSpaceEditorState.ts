import { guaranteeType } from '@finos/legend-shared';
import { action, computed, makeObservable } from 'mobx';
import {
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { DataSpace } from '../graph-manager/index.js';

export class DataSpaceEditorState extends ElementEditorState {
  dataSpace!: DataSpace;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      dataSpace: computed,
      dataSpaceInstance: computed,
      reprocess: action,
    });
  }

  setDataSpace(val: DataSpace) {
    return (this.dataSpace = val);
  }

  get title() {
    return guaranteeType(
      this.element,
      DataSpace,
      'title inside form element editor state must be a text element',
    );
  }

  // get description() {
  //   return guaranteeType(
  //     this.element,
  //     DataSpace,
  //     'Description inside form element editor state must be a text element',
  //   );
  // }

  get dataSpaceInstance() {
    return guaranteeType(
      this.element,
      DataSpace,
      'Elements inside form element editor state must be a text element',
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new DataSpaceEditorState(editorStore, newElement);
  }
}
