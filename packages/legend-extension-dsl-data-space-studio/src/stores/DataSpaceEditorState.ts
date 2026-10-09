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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  type EditorStore,
  ElementEditorState,
  annotatedElement_addTaggedValue,
  annotatedElement_deleteTaggedValue,
  annotatedElement_addStereotype,
  annotatedElement_deleteStereotype,
  taggedValue_setValue,
} from '@finos/legend-application-studio';
import {
  type PackageableElement,
  type StereotypeReference,
  Package,
  Class,
  Enumeration,
  Association,
  Service,
  ConcreteFunctionDefinition,
  TaggedValue,
  TagExplicitReference,
  StereotypeExplicitReference,
  getTag,
  getStereotype,
} from '@finos/legend-graph';
import { Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import {
  DataSpace,
  DataSpacePackageableElementExecutable,
  type DataSpaceElement,
  type ResolvedDataSpaceEntityWithOrigin,
  extractDataSpaceInfoFromSummary,
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  PURE_DATA_SPACE_INFO_PROFILE_PATH,
  PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
  PURE_DATA_SPACE_INFO_PROFILE_IN_DEVELOPMENT_STEREOTYPE,
  PURE_DATA_SPACE_INFO_PROFILE_EXTERNAL_STEREOTYPE,
  PURE_DATA_SPACE_INFO_PROFILE_RELATED_DATA_SPACES_TAG,
  PURE_DATA_SPACE_INFO_PROFILE_DEPRECATION_NOTICE_TAG,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  encodeRelatedDataSpaceGAV,
  parseRelatedDataSpaceGAV,
  parseRelatedDataSpaceGAVs,
  splitRelatedDataSpaceEntries,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  DepotScope,
  LATEST_VERSION_ALIAS,
  type StoredSummaryEntity,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  type GeneratorFn,
} from '@finos/legend-shared';
import { DataSpaceExecutionContextState } from './DataSpaceExecutionContextState.js';
import { DataSpaceExecutableTemplateStateCache } from './DataSpaceExecutableTemplateState.js';
import { DataSpaceExecutableSampleValuesStateCache } from './DataSpaceExecutableSampleValuesState.js';

export enum DATA_SPACE_TAB {
  HOME = 'Home',
  EXECUTION_CONTEXTS = 'Execution Contexts',
  EXECUTABLES = 'Executables',
  INFO = 'Info',
}

export interface RelatedDataSpaceRow {
  id: string;
  label: string;
  taggedValue: TaggedValue;
  entryIndex: number;
  isMultiEntry: boolean;
}

export class DataSpaceEditorState extends ElementEditorState {
  executionContextState: DataSpaceExecutionContextState;
  readonly executableTemplateStates: DataSpaceExecutableTemplateStateCache;
  readonly executableSampleValuesStates: DataSpaceExecutableSampleValuesStateCache;
  readonly loadRelatedDataSpacesState = ActionState.create();
  selectedTab = DATA_SPACE_TAB.HOME;
  availableRelatedDataSpaces: ResolvedDataSpaceEntityWithOrigin[] = [];

  private static relatedDataSpacesCache:
    | Promise<ResolvedDataSpaceEntityWithOrigin[]>
    | undefined;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      executionContextState: observable,
      selectedTab: observable,
      availableRelatedDataSpaces: observable,
      dataSpace: computed,
      relatedDataSpaceTaggedValues: computed,
      isVerified: computed,
      isInDevelopment: computed,
      isExternal: computed,
      deprecationNotice: computed,
      reprocess: action,
      isValidDataSpaceElement: action,
      getDataSpaceElementOptions: action,
      getDiagramOptions: action,
      getDataSpaceExecutableOptions: action,
      getRelatedDataSpaceOptions: action,
      addRelatedDataSpace: action,
      removeRelatedDataSpace: action,
      removeRelatedDataSpaceRow: action,
      toggleVerified: action,
      toggleInDevelopment: action,
      toggleExternal: action,
      setDeprecationNotice: action,
      relatedDataSpaceRows: computed,
      setSelectedTab: action,
      loadRelatedDataSpaces: flow,
    });

    this.executionContextState = new DataSpaceExecutionContextState(this);
    this.executableTemplateStates = new DataSpaceExecutableTemplateStateCache(
      editorStore,
    );
    this.executableSampleValuesStates =
      new DataSpaceExecutableSampleValuesStateCache(editorStore);
  }

  setSelectedTab(tab: DATA_SPACE_TAB): void {
    this.selectedTab = tab;
  }

  isValidDataSpaceElement(
    element: PackageableElement,
  ): element is DataSpaceElement {
    return (
      element instanceof Package ||
      element instanceof Class ||
      element instanceof Enumeration ||
      element instanceof Association
    );
  }

  getDataSpaceElementOptions(): { label: string; value: DataSpaceElement }[] {
    const currentElements =
      this.dataSpace.elements?.map(
        (elementPointer) => elementPointer.element.value,
      ) ?? [];
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter((element) => this.isValidDataSpaceElement(element))
      .filter((element) => !currentElements.includes(element))
      .map((element) => ({
        label: element.path,
        value: element,
      }));
  }

  getDataSpaceExecutableOptions(): {
    label: string;
    value: PackageableElement;
  }[] {
    const currentExecutables =
      this.dataSpace.executables?.map((executablePointer) => {
        if (
          executablePointer instanceof DataSpacePackageableElementExecutable
        ) {
          return executablePointer.executable.value;
        }
        return undefined;
      }) ?? [];
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter(
        (element) =>
          element instanceof Service ||
          element instanceof ConcreteFunctionDefinition,
      )
      .filter((executable) => !currentExecutables.includes(executable))
      .map((executable) => ({
        label: executable.path,
        value: executable,
      }));
  }

  getDiagramOptions(): { label: string; value: Diagram }[] {
    const currentDiagrams =
      this.dataSpace.diagrams?.map(
        (diagramPointer) => diagramPointer.diagram.value,
      ) ?? [];
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter((element): element is Diagram => element instanceof Diagram)
      .filter((diagram) => !currentDiagrams.includes(diagram))
      .map((diagram) => ({
        label: diagram.path,
        value: diagram,
      }));
  }

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside DataSpace editor state must be a DataSpace element',
    );
  }

  private findInfoStereotype(
    stereotypeValue: string,
  ): StereotypeReference | undefined {
    return this.dataSpace.stereotypes.find(
      (stereotype) =>
        stereotype.ownerReference.value.path ===
          PURE_DATA_SPACE_INFO_PROFILE_PATH &&
        stereotype.value.value === stereotypeValue,
    );
  }

  private toggleInfoStereotype(stereotypeValue: string, value: boolean): void {
    const existing = this.findInfoStereotype(stereotypeValue);
    if (value) {
      if (!existing) {
        annotatedElement_addStereotype(
          this.dataSpace,
          StereotypeExplicitReference.create(
            getStereotype(
              this.editorStore.graphManagerState.graph.getProfile(
                PURE_DATA_SPACE_INFO_PROFILE_PATH,
              ),
              stereotypeValue,
            ),
          ),
        );
      }
    } else if (existing) {
      annotatedElement_deleteStereotype(this.dataSpace, existing);
    }
  }

  get isVerified(): boolean {
    return Boolean(
      this.findInfoStereotype(PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE),
    );
  }

  get isInDevelopment(): boolean {
    return Boolean(
      this.findInfoStereotype(
        PURE_DATA_SPACE_INFO_PROFILE_IN_DEVELOPMENT_STEREOTYPE,
      ),
    );
  }

  toggleVerified(value: boolean): void {
    this.toggleInfoStereotype(
      PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
      value,
    );
  }

  toggleInDevelopment(value: boolean): void {
    this.toggleInfoStereotype(
      PURE_DATA_SPACE_INFO_PROFILE_IN_DEVELOPMENT_STEREOTYPE,
      value,
    );
  }

  get isExternal(): boolean {
    return Boolean(
      this.findInfoStereotype(PURE_DATA_SPACE_INFO_PROFILE_EXTERNAL_STEREOTYPE),
    );
  }

  toggleExternal(value: boolean): void {
    this.toggleInfoStereotype(
      PURE_DATA_SPACE_INFO_PROFILE_EXTERNAL_STEREOTYPE,
      value,
    );
  }

  private findDeprecationNoticeTaggedValue(): TaggedValue | undefined {
    return this.dataSpace.taggedValues.find(
      (taggedValue) =>
        taggedValue.tag.ownerReference.value.path ===
          PURE_DATA_SPACE_INFO_PROFILE_PATH &&
        taggedValue.tag.value.value ===
          PURE_DATA_SPACE_INFO_PROFILE_DEPRECATION_NOTICE_TAG,
    );
  }

  get deprecationNotice(): string | undefined {
    return this.findDeprecationNoticeTaggedValue()?.value;
  }

  setDeprecationNotice(value: string | undefined): void {
    const existing = this.findDeprecationNoticeTaggedValue();
    if (value !== undefined && value !== '') {
      if (existing) {
        taggedValue_setValue(existing, value);
      } else {
        const tag = getTag(
          this.editorStore.graphManagerState.graph.getProfile(
            PURE_DATA_SPACE_INFO_PROFILE_PATH,
          ),
          PURE_DATA_SPACE_INFO_PROFILE_DEPRECATION_NOTICE_TAG,
        );
        annotatedElement_addTaggedValue(
          this.dataSpace,
          new TaggedValue(TagExplicitReference.create(tag), value),
        );
      }
    } else if (existing) {
      annotatedElement_deleteTaggedValue(this.dataSpace, existing);
    }
  }

  get relatedDataSpaceTaggedValues(): TaggedValue[] {
    return this.dataSpace.taggedValues.filter(
      (taggedValue) =>
        taggedValue.tag.ownerReference.value.path ===
          PURE_DATA_SPACE_INFO_PROFILE_PATH &&
        taggedValue.tag.value.value ===
          PURE_DATA_SPACE_INFO_PROFILE_RELATED_DATA_SPACES_TAG,
    );
  }

  get relatedDataSpaceRows(): RelatedDataSpaceRow[] {
    return this.relatedDataSpaceTaggedValues.flatMap((taggedValue) => {
      const segments = splitRelatedDataSpaceEntries(taggedValue.value);
      if (segments.length === 0) {
        return [
          {
            id: taggedValue._UUID,
            label: taggedValue.value,
            taggedValue,
            entryIndex: 0,
            isMultiEntry: false,
          },
        ];
      }
      const isMultiEntry = segments.length > 1;
      return segments.map((segment, index) => ({
        id: isMultiEntry ? `${taggedValue._UUID}-${index}` : taggedValue._UUID,
        label: parseRelatedDataSpaceGAV(segment)?.name ?? segment,
        taggedValue,
        entryIndex: index,
        isMultiEntry,
      }));
    });
  }

  getRelatedDataSpaceOptions(): {
    label: string;
    value: ResolvedDataSpaceEntityWithOrigin;
  }[] {
    const selfPath = this.dataSpace.path;
    const addedPaths = new Set(
      this.relatedDataSpaceTaggedValues.flatMap((taggedValue) =>
        parseRelatedDataSpaceGAVs(taggedValue.value).map((entry) => entry.path),
      ),
    );
    return this.availableRelatedDataSpaces
      .filter(
        (entity) =>
          entity.origin !== undefined &&
          entity.path !== selfPath &&
          !addedPaths.has(entity.path),
      )
      .map((entity) => ({
        label: entity.path,
        value: entity,
      }));
  }

  addRelatedDataSpace(entity: ResolvedDataSpaceEntityWithOrigin): void {
    try {
      const origin = guaranteeNonNullable(
        entity.origin,
        'Related Data Space must have GAV coordinates',
      );
      const encoded = encodeRelatedDataSpaceGAV({
        groupId: origin.groupId,
        artifactId: origin.artifactId,
        versionId: LATEST_VERSION_ALIAS,
        path: entity.path,
      });
      const tag = getTag(
        this.editorStore.graphManagerState.graph.getProfile(
          PURE_DATA_SPACE_INFO_PROFILE_PATH,
        ),
        PURE_DATA_SPACE_INFO_PROFILE_RELATED_DATA_SPACES_TAG,
      );
      annotatedElement_addTaggedValue(
        this.dataSpace,
        new TaggedValue(TagExplicitReference.create(tag), encoded),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyWarning(
        `Can't add related Data Space: ${error.message}`,
      );
    }
  }

  removeRelatedDataSpace(taggedValue: TaggedValue): void {
    annotatedElement_deleteTaggedValue(this.dataSpace, taggedValue);
  }

  removeRelatedDataSpaceRow(row: RelatedDataSpaceRow): void {
    if (!row.isMultiEntry) {
      this.removeRelatedDataSpace(row.taggedValue);
      return;
    }
    const remaining = splitRelatedDataSpaceEntries(
      row.taggedValue.value,
    ).filter((_, index) => index !== row.entryIndex);
    this.removeRelatedDataSpace(row.taggedValue);
    const tag = getTag(
      this.editorStore.graphManagerState.graph.getProfile(
        PURE_DATA_SPACE_INFO_PROFILE_PATH,
      ),
      PURE_DATA_SPACE_INFO_PROFILE_RELATED_DATA_SPACES_TAG,
    );
    remaining.forEach((segment) => {
      annotatedElement_addTaggedValue(
        this.dataSpace,
        new TaggedValue(TagExplicitReference.create(tag), segment),
      );
    });
  }

  *loadRelatedDataSpaces(): GeneratorFn<void> {
    this.loadRelatedDataSpacesState.inProgress();
    try {
      DataSpaceEditorState.relatedDataSpacesCache ??= (async () =>
        (
          (await this.editorStore.depotServerClient.getEntitiesSummaryByClassifier(
            DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
            {
              scope: DepotScope.RELEASES,
              summary: true,
              latest: true,
            },
          )) as unknown as StoredSummaryEntity[]
        ).map((storedEntity) =>
          extractDataSpaceInfoFromSummary(storedEntity),
        ))();
      this.availableRelatedDataSpaces =
        (yield DataSpaceEditorState.relatedDataSpacesCache) as ResolvedDataSpaceEntityWithOrigin[];
      this.loadRelatedDataSpacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      DataSpaceEditorState.relatedDataSpacesCache = undefined;
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.loadRelatedDataSpacesState.fail();
    }
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    return newState;
  }
}
