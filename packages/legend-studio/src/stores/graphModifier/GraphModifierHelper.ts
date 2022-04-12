import type {
  BasicModel,
  PackageableElement,
  PureModel,
} from '@finos/legend-graph';
import type { GeneratorFn } from '@finos/legend-shared';
import { action, flow } from 'mobx';

export const graph_dispose = flow(function* (
  graph: BasicModel,
): GeneratorFn<void> {
  yield graph.dispose();
});

export const graph_deleteOwnElement = action(
  (graph: BasicModel, element: PackageableElement): void => {
    graph.deleteOwnElement(element);
  },
);

export const graph_addElement = action(
  (graph: PureModel, element: PackageableElement): void => {
    graph.addElement(element);
  },
);

export const graph_deleteElement = action(
  (graph: PureModel, element: PackageableElement): void => {
    graph.deleteElement(element);
  },
);

export const graph_renameElement = action(
  (graph: PureModel, element: PackageableElement, newPath: string): void => {
    graph.renameElement(element, newPath);
  },
);
