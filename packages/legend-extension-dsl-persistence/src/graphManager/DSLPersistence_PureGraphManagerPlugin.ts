import packageJson from '../../package.json';
import { Persistence } from '../models/metamodels/pure/model/packageableElements/persistence/Persistence';
import {
  PureGraphManagerPlugin,
  type PackageableElement,
  type PureGrammarElementLabeler,
} from '@finos/legend-graph';

const PURE_GRAMMAR_PERSISTENCE_PARSER_NAME = 'Persistence';
const PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL = 'Persistence';

export class DSLPersistence_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_PERSISTENCE_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL];
  }

  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Persistence) {
          return PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }
}
