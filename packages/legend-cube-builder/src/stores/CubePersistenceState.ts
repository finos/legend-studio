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

import {
  CubeDocument,
  CubeSpecDecodeError,
  CURRENT_FORMAT_VERSION,
  encodeCubeSpec,
  isSchemasError,
  type NodeRegistry,
  parseCubeSpec,
  serializeCubeSpec,
} from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { READ_ONLY_CUBE_TITLE } from '../__lib__/LegendCubeLabels.js';
import {
  CUBE_PERSISTENCE_PENDING_LABEL,
  EMPTY_CUBE_SAVE_TITLE,
  getCubeNameError,
  getInvalidCubeSaveTitle,
  NO_CUBE_STORE_TITLE,
  NOT_OWNER_SAVE_TITLE,
  PENDING_SAVE_TITLE,
  UNSAVED_CHANGES_MESSAGE,
} from '../__lib__/LegendCubePersistenceLabels.js';
import { getCubeSourceRefs } from '../graph-manager/CubeSourceRefs.js';
import {
  CubeDraft,
  type CubeStore,
  type SavedCube,
  type SavedCubeSummary,
} from '../graph-manager/CubeStore.js';
import type { CubeEditorState } from './CubeEditorState.js';

/** How many cubes the Load dialog lists, the store's cap */
const LOAD_DIALOG_LIMIT = 100;
/** How long the Load dialog waits after a keystroke before it searches */
export const LOAD_SEARCH_DELAY_MS = 300;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The two halves of a cube's spec its modified state compares, as JSON
 * (spec §17.10): the query (its name, model, nodes and unknown top-level
 * keys) and the presentation (`meta`)
 */
export interface CubeSpecHalves {
  readonly query: string;
  readonly presentation: string;
}

export const getCubeSpecHalves = (
  document: CubeDocument,
  registry: NodeRegistry,
): CubeSpecHalves => {
  const { meta, ...rest } = encodeCubeSpec(document, registry);
  return {
    query: JSON.stringify(rest),
    presentation: JSON.stringify(meta ?? null),
  };
};

/** What the page last loaded or saved of a cube: the store's summary, and the spec halves it held */
class CubeSavedBaseline {
  readonly cube: SavedCubeSummary;
  readonly halves: CubeSpecHalves;

  constructor(cube: SavedCubeSummary, halves: CubeSpecHalves) {
    this.cube = cube;
    this.halves = halves;
  }
}

/** A question asked before something that can't be undone or loses unsaved changes */
export interface CubeConfirmation {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly action: () => void;
}

/** The Save dialog: a name, for a new cube or a copy (Save as); a failed save says why there */
export class CubeSaveDialogState {
  readonly persistence: CubePersistenceState;

  isOpen = false;
  /** A new cube, whatever is shown: Save as, or the first save */
  name = '';
  /** Why the last save failed: a conflict or a refusal offers Save as here */
  error: string | undefined;

  constructor(persistence: CubePersistenceState) {
    makeObservable(this, {
      isOpen: observable,
      name: observable,
      error: observable,
      nameError: computed,
      open: action,
      close: action,
      setName: action,
    });
    this.persistence = persistence;
  }

  get nameError(): string | undefined {
    return getCubeNameError(this.name);
  }

  open(error?: string): void {
    const { document } = this.persistence.editorState;
    this.name = document.name ?? this.persistence.savedCube?.name ?? '';
    this.error = error;
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
    this.error = undefined;
  }

  setName(name: string): void {
    this.name = name;
  }

  /** Saves a new cube under the name; stays open, saying why, when the store refuses */
  async confirm(): Promise<void> {
    if (this.nameError || this.persistence.isPending) {
      return;
    }
    await flowResult(this.persistence.createCube(this.name.trim()));
  }
}

/** The Load dialog: the store's search over id, name and owners (spec §14.4), and Delete on each cube the viewer owns */
export class CubeLoadDialogState {
  readonly persistence: CubePersistenceState;

  isOpen = false;
  searchText = '';
  onlyMine = false;
  results: readonly SavedCubeSummary[] | undefined;
  isSearching = false;
  /** Why the search, an opening or a deletion failed */
  error: string | undefined;
  /** Counts searches, so an answer that arrives after a newer search starts is dropped */
  private searchRequest = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(persistence: CubePersistenceState) {
    makeObservable<CubeLoadDialogState, 'searchRequest'>(this, {
      isOpen: observable,
      searchText: observable,
      onlyMine: observable,
      results: observable.ref,
      isSearching: observable,
      error: observable,
      searchRequest: observable,
      open: action,
      close: action,
      setSearchText: action,
      setOnlyMine: action,
      setError: action,
      removeResult: action,
      search: flow,
    });
    this.persistence = persistence;
  }

  open(): void {
    this.isOpen = true;
    this.error = undefined;
    this.results = undefined;
    this.searchSoon(0);
  }

  close(): void {
    this.isOpen = false;
    this.searchRequest++;
    this.isSearching = false;
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  setSearchText(text: string): void {
    this.searchText = text;
    this.searchSoon(LOAD_SEARCH_DELAY_MS);
  }

  setOnlyMine(onlyMine: boolean): void {
    this.onlyMine = onlyMine;
    this.searchSoon(0);
  }

  setError(error: string | undefined): void {
    this.error = error;
  }

  removeResult(id: string): void {
    this.results = this.results?.filter((cube) => cube.id !== id);
  }

  private searchSoon(delay: number): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = undefined;
      flowResult(this.search()).catch(
        this.persistence.editorState.host.applicationStore.alertUnhandledError,
      );
    }, delay);
  }

  *search(): GeneratorFn<void> {
    const { store, currentUser } = this.persistence;
    if (!store || !this.isOpen) {
      return;
    }
    const request = ++this.searchRequest;
    this.isSearching = true;
    this.error = undefined;
    try {
      const results = (yield store.searchCubes({
        searchTerm: this.searchText.trim() || undefined,
        owner: this.onlyMine ? currentUser : undefined,
        limit: LOAD_DIALOG_LIMIT,
      })) as readonly SavedCubeSummary[];
      if (request === this.searchRequest) {
        this.results = results;
      }
    } catch (error) {
      if (request === this.searchRequest) {
        this.results = [];
        this.error = errorMessage(error);
      }
    } finally {
      if (request === this.searchRequest) {
        this.isSearching = false;
      }
    }
  }
}

/**
 * Saving and loading cubes (PLAN §11.13): the saved cube the page shows, its
 * modified state (spec §17.10), Save, Save as, Load, Delete, New, Copy and
 * Paste, and the confirmation before unsaved changes are lost (spec §17.14).
 *
 * The saved cube follows the document: opening another cube (New, Load,
 * Paste, Import, an example) stays one undo step, as Import is (PLAN §7.8),
 * and undoing it shows the saved cube it replaced again, at the latest
 * version the page knows of it.
 */
export class CubePersistenceState {
  readonly editorState: CubeEditorState;
  readonly saveDialog: CubeSaveDialogState;
  readonly loadDialog: CubeLoadDialogState;

  /** The saved cube shown, by id; none for a cube never saved */
  currentId: string | undefined;
  /** What the page last loaded or saved of each cube it showed */
  private known: ReadonlyMap<string, CubeSavedBaseline> = new Map();
  /** The saved cube each replaced document showed, so undoing back to it shows it again */
  private readonly replacedIdentities = new WeakMap<
    CubeDocument,
    string | undefined
  >();
  pending: CUBE_PERSISTENCE_PENDING_LABEL | undefined;
  /** Why the cube the page's address names couldn't be opened, shown in the graph area (QUESTIONS.md U9 (b)) */
  loadError: string | undefined;
  confirmation: CubeConfirmation | undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubePersistenceState, 'known' | 'remember'>(this, {
      currentId: observable,
      known: observable.ref,
      pending: observable,
      loadError: observable,
      confirmation: observable.ref,
      saved: computed,
      savedCube: computed,
      halves: computed,
      isQueryModified: computed,
      isPresentationModified: computed,
      isModified: computed,
      isOwner: computed,
      isPending: computed,
      saveAsDisabledReason: computed,
      saveDisabledReason: computed,
      loadDisabledReason: computed,
      deleteDisabledReason: computed,
      isDialogOpen: computed,
      remember: action,
      handleCubeReplaced: action,
      handleCubeRestored: action,
      confirmDiscard: action,
      confirm: action,
      cancelConfirmation: action,
      newCube: action,
      save: action,
      saveAs: action,
      openLoadDialog: action,
      loadCube: action,
      deleteCube: action,
      clearLoadError: action,
      saveCube: flow,
      createCube: flow,
      openCube: flow,
      removeCube: flow,
      pasteFromClipboard: flow,
    });
    this.editorState = editorState;
    this.saveDialog = new CubeSaveDialogState(this);
    this.loadDialog = new CubeLoadDialogState(this);
  }

  get store(): CubeStore | undefined {
    return this.editorState.host.store;
  }

  /** The viewer, as the host knows them; undefined leaves ownership to the store */
  get currentUser(): string | undefined {
    return (
      this.editorState.host.applicationStore.identityService.currentUser ||
      undefined
    );
  }

  get saved(): CubeSavedBaseline | undefined {
    return this.currentId === undefined
      ? undefined
      : this.known.get(this.currentId);
  }

  /** The saved cube shown, at the latest version the page knows */
  get savedCube(): SavedCubeSummary | undefined {
    return this.saved?.cube;
  }

  /** The halves of the spec Save would write; undefined if the cube can't be written */
  get halves(): CubeSpecHalves | undefined {
    try {
      return getCubeSpecHalves(
        this.editorState.document,
        this.editorState.registry,
      );
    } catch {
      return undefined;
    }
  }

  /** Save would write another query than the one loaded or saved last; a new cube once it has a node */
  get isQueryModified(): boolean {
    const { saved, halves } = this;
    return saved
      ? halves?.query !== saved.halves.query
      : this.editorState.document.query.nodes.length > 0;
  }

  /** Save would write another presentation (widths, formats, the drill-down, the graph's visibility) */
  get isPresentationModified(): boolean {
    const { saved, halves } = this;
    return saved ? halves?.presentation !== saved.halves.presentation : false;
  }

  /** Either half changed: the name shows an asterisk, and leaving asks first */
  get isModified(): boolean {
    return this.isQueryModified || this.isPresentationModified;
  }

  /** The viewer may change the saved cube shown; true when the host doesn't know the viewer */
  get isOwner(): boolean {
    const cube = this.savedCube;
    const user = this.currentUser;
    return Boolean(cube) && (!user || Boolean(cube?.owners.includes(user)));
  }

  get isPending(): boolean {
    return this.pending !== undefined;
  }

  /** The first problem of a step, named by its step, as Execute names one */
  private get firstProblem(): string | undefined {
    const { query } = this.editorState.document;
    const { validity } = this.editorState.analysis;
    for (const node of query.nodes) {
      const problem = (validity.get(node.id) ?? []).find(
        (message) => !isSchemasError(message),
      );
      if (problem !== undefined) {
        return `${node.describe()}: ${problem}`;
      }
    }
    return undefined;
  }

  /** Why Save as can't be used, if it can't (spec §14.4: not while the cube is invalid) */
  get saveAsDisabledReason(): string | undefined {
    if (!this.store) {
      return NO_CUBE_STORE_TITLE;
    }
    if (this.editorState.readOnly) {
      return READ_ONLY_CUBE_TITLE;
    }
    if (this.isPending) {
      return PENDING_SAVE_TITLE;
    }
    if (!this.editorState.document.query.nodes.length) {
      return EMPTY_CUBE_SAVE_TITLE;
    }
    const problem = this.firstProblem;
    return problem === undefined ? undefined : getInvalidCubeSaveTitle(problem);
  }

  /** Why Save can't be used: as Save as, and a saved cube must be the viewer's */
  get saveDisabledReason(): string | undefined {
    return (
      this.saveAsDisabledReason ??
      (this.savedCube && !this.isOwner ? NOT_OWNER_SAVE_TITLE : undefined)
    );
  }

  get loadDisabledReason(): string | undefined {
    return !this.store
      ? NO_CUBE_STORE_TITLE
      : this.isPending
        ? PENDING_SAVE_TITLE
        : undefined;
  }

  /** Why the saved cube shown can't be deleted */
  get deleteDisabledReason(): string | undefined {
    if (!this.store) {
      return NO_CUBE_STORE_TITLE;
    }
    if (!this.savedCube) {
      return 'This cube has not been saved.';
    }
    if (!this.isOwner) {
      return "Only this cube's owners can delete it.";
    }
    return this.isPending ? PENDING_SAVE_TITLE : undefined;
  }

  get isDialogOpen(): boolean {
    return (
      this.saveDialog.isOpen ||
      this.loadDialog.isOpen ||
      this.confirmation !== undefined
    );
  }

  private remember(cube: SavedCubeSummary, document: CubeDocument): void {
    this.known = new Map(this.known).set(
      cube.id,
      new CubeSavedBaseline(
        cube,
        getCubeSpecHalves(document, this.editorState.registry),
      ),
    );
  }

  private forget(id: string): void {
    const known = new Map(this.known);
    known.delete(id);
    this.known = known;
  }

  /** Another cube replaces the document shown: it shows no saved cube until one is opened */
  handleCubeReplaced(replaced: CubeDocument): void {
    this.replacedIdentities.set(replaced, this.currentId);
    this.currentId = undefined;
    this.loadError = undefined;
  }

  /** Undo brought back a document another cube replaced: it shows its saved cube again, if the page still knows it */
  handleCubeRestored(restored: CubeDocument): void {
    const id = this.replacedIdentities.get(restored);
    this.currentId = id !== undefined && this.known.has(id) ? id : undefined;
  }

  clearLoadError(): void {
    this.loadError = undefined;
  }

  /** Runs the action now, or once the viewer agrees to lose the unsaved changes (spec §17.14) */
  confirmDiscard(run: () => void): void {
    if (!this.isModified) {
      run();
      return;
    }
    this.confirmation = {
      title: 'Unsaved changes',
      message: UNSAVED_CHANGES_MESSAGE,
      confirmLabel: 'Continue',
      action: run,
    };
  }

  confirm(): void {
    const confirmation = this.confirmation;
    this.confirmation = undefined;
    confirmation?.action();
  }

  cancelConfirmation(): void {
    this.confirmation = undefined;
  }

  /** New (Alt+N): an empty cube, never saved */
  newCube(): void {
    if (this.isPending) {
      return;
    }
    this.confirmDiscard(() =>
      this.editorState.importDocument(new CubeDocument(), false),
    );
  }

  /** Save (Alt+S): a saved cube is saved at once; a new one is named first */
  save(): void {
    if (this.saveDisabledReason !== undefined) {
      return;
    }
    if (this.savedCube) {
      flowResult(this.saveCube()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    } else {
      this.saveDialog.open();
    }
  }

  /** Save as: a new cube, the viewer its owner */
  saveAs(): void {
    if (this.saveAsDisabledReason === undefined) {
      this.saveDialog.open();
    }
  }

  /** What a save writes; the spec's size cap is checked here */
  private buildDraft(document: CubeDocument, name: string): CubeDraft {
    return new CubeDraft(
      name,
      CURRENT_FORMAT_VERSION,
      serializeCubeSpec(document, this.editorState.registry),
      getCubeSourceRefs(document),
    );
  }

  /**
   * Saves the saved cube shown over the version the page knows; a version
   * saved since, or a cube the viewer doesn't own, opens the Save dialog
   * saying why, to save a copy instead. Edits made meanwhile stay modified.
   */
  *saveCube(): GeneratorFn<void> {
    const store = this.store;
    const saved = this.saved;
    if (!store || !saved || this.saveDisabledReason !== undefined) {
      return;
    }
    let document = this.editorState.document;
    if (document.name === undefined) {
      // a spec saved without a name, e.g. by another client, takes the store's
      this.editorState.applyDocument(document.withName(saved.cube.name));
      document = this.editorState.document;
    }
    this.pending = CUBE_PERSISTENCE_PENDING_LABEL.SAVING;
    try {
      const cube = (yield store.saveCube(
        saved.cube.id,
        saved.cube.version,
        this.buildDraft(document, document.name ?? saved.cube.name),
      )) as SavedCube;
      this.remember(cube, document);
      this.editorState.host.applicationStore.notificationService.notifySuccess(
        `Saved ${cube.name}`,
      );
    } catch (error) {
      this.saveDialog.open(errorMessage(error));
    } finally {
      this.pending = undefined;
    }
  }

  /** Saves the cube as a new one under the name, which the cube takes; answers whether it was saved */
  *createCube(name: string): GeneratorFn<boolean> {
    const store = this.store;
    if (!store || this.saveAsDisabledReason !== undefined) {
      return false;
    }
    if (this.editorState.document.name !== name) {
      this.editorState.applyDocument(this.editorState.document.withName(name));
    }
    const document = this.editorState.document;
    this.pending = CUBE_PERSISTENCE_PENDING_LABEL.SAVING;
    this.saveDialog.error = undefined;
    try {
      const cube = (yield store.createCube(
        this.buildDraft(document, name),
      )) as SavedCube;
      this.remember(cube, document);
      this.currentId = cube.id;
      this.saveDialog.close();
      this.editorState.host.applicationStore.notificationService.notifySuccess(
        `Saved ${cube.name}`,
      );
      return true;
    } catch (error) {
      this.saveDialog.error = errorMessage(error);
      return false;
    } finally {
      this.pending = undefined;
    }
  }

  /** Load (Alt+L) */
  openLoadDialog(): void {
    if (this.loadDisabledReason === undefined) {
      this.loadDialog.open();
    }
  }

  /** Opens a cube from the Load dialog, once the viewer agrees to lose unsaved changes */
  loadCube(id: string): void {
    if (this.isPending) {
      return;
    }
    this.confirmDiscard(() => {
      flowResult(this.openCube(id)).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    });
  }

  /**
   * Opens a saved cube in place of the one shown, as one undo step, and never
   * runs it or opens an editor (U9 (a)). The store's name wins over the
   * spec's, which a rename elsewhere may have left behind. When the cube
   * comes from the page's address, a failure shows in the graph area (U9
   * (b)); otherwise in the Load dialog.
   */
  *openCube(id: string, fromAddress = false): GeneratorFn<boolean> {
    const store = this.store;
    if (!store) {
      if (fromAddress) {
        this.loadError = NO_CUBE_STORE_TITLE;
      }
      return false;
    }
    this.pending = CUBE_PERSISTENCE_PENDING_LABEL.LOADING;
    this.loadError = undefined;
    try {
      const cube = (yield store.getCube(id)) as SavedCube;
      let decoded: ReturnType<typeof parseCubeSpec>;
      try {
        decoded = parseCubeSpec(cube.content, {
          registry: this.editorState.registry,
        });
      } catch (error) {
        throw new Error(
          error instanceof CubeSpecDecodeError && error.path
            ? `Can't read the saved cube: ${error.path} ${error.detail}`
            : `Can't read the saved cube: ${errorMessage(error)}`,
        );
      }
      const document =
        decoded.document.name === cube.name
          ? decoded.document
          : decoded.document.withName(cube.name);
      this.editorState.importDocument(document, decoded.readOnly);
      this.remember(cube, document);
      this.currentId = cube.id;
      this.loadDialog.close();
      return true;
    } catch (error) {
      const message = errorMessage(error);
      if (fromAddress) {
        this.loadError = message;
      } else {
        this.loadDialog.setError(message);
      }
      return false;
    } finally {
      this.pending = undefined;
    }
  }

  /** Delete, after a confirmation: the saved cube shown, or one the Load dialog lists */
  deleteCube(cube: SavedCubeSummary | undefined = this.savedCube): void {
    if (!cube || this.isPending) {
      return;
    }
    // the version the page knows best: the shown cube's, saved since the search maybe
    const latest = this.known.get(cube.id)?.cube ?? cube;
    this.confirmation = {
      title: 'Delete cube',
      message: `Delete "${latest.name}"? It will no longer be found or opened.`,
      confirmLabel: 'Delete',
      action: () => {
        flowResult(this.removeCube(latest)).catch(
          this.editorState.host.applicationStore.alertUnhandledError,
        );
      },
    };
  }

  /** Deletes a cube softly; the cube shown keeps its content, now never saved */
  *removeCube(cube: SavedCubeSummary): GeneratorFn<void> {
    const store = this.store;
    if (!store) {
      return;
    }
    this.pending = CUBE_PERSISTENCE_PENDING_LABEL.DELETING;
    try {
      yield store.deleteCube(cube.id, cube.version);
      this.forget(cube.id);
      if (this.currentId === cube.id) {
        this.currentId = undefined;
      }
      this.loadDialog.removeResult(cube.id);
      this.editorState.host.applicationStore.notificationService.notifySuccess(
        `Deleted ${cube.name}`,
      );
    } catch (error) {
      if (this.loadDialog.isOpen) {
        this.loadDialog.setError(errorMessage(error));
      } else {
        this.editorState.host.applicationStore.notificationService.notifyError(
          errorMessage(error),
        );
      }
    } finally {
      this.pending = undefined;
    }
  }

  /** Copy (Alt+C): the whole spec on the clipboard, as Export writes it (spec §14.4), invalid cubes included */
  async copy(): Promise<void> {
    const { document, registry, readOnly, host } = this.editorState;
    if (readOnly) {
      return;
    }
    let text: string;
    try {
      text = serializeCubeSpec(document, registry);
    } catch (error) {
      host.applicationStore.notificationService.notifyError(
        errorMessage(error),
      );
      return;
    }
    await host.applicationStore.clipboardService.copyTextToClipboard(text, {
      notifySuccessMessage: 'Cube spec copied to the clipboard',
    });
  }

  /** Paste (Alt+V): opens the clipboard's spec as Import does, once the viewer agrees to lose unsaved changes */
  paste(): void {
    if (this.isPending) {
      return;
    }
    this.confirmDiscard(() => {
      flowResult(this.pasteFromClipboard()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    });
  }

  /**
   * Reads the clipboard into the Import dialog's text and opens it; a spec
   * that can't be read stays there, saying why. When the browser won't read
   * the clipboard, the dialog opens empty to paste into.
   */
  *pasteFromClipboard(): GeneratorFn<void> {
    const { specTransfer } = this.editorState;
    let text: string | undefined;
    try {
      text = (yield navigator.clipboard.readText()) as string;
    } catch {
      text = undefined;
    }
    specTransfer.openImport();
    if (text !== undefined) {
      specTransfer.setImportText(text);
      specTransfer.importSpec();
    }
  }
}
