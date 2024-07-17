import { guaranteeType } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';

export class DataSpaceEditorState extends ElementEditorState {
  dataSpace!: DataSpace;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    this.dataSpace = guaranteeType(
      element,
      DataSpace,
      'Element inside DataSpaceEditorState must be a DataSpace',
    );

    makeObservable(this, {
      dataSpace: observable,
      title: computed,
      setTitle: action,
      setDescription: action,
    });
  }

  get title(): string {
    return this.dataSpace.title ?? '';
  }

  override get description(): string {
    return this.dataSpace.description ?? '';
  }

  setTitle(title: string): void {
    console.log(title);
    this.dataSpace.title = title;
  }

  setDescription(description: string): void {
    console.log(description);
    this.dataSpace.description = description;
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    newState.setTitle(this.title);
    newState.setDescription(this.description);
    return newState;
  }
}
