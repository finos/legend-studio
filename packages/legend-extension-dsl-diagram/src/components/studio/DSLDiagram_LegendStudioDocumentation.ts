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

export enum DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-diagram__grammar-parser',
  GRAMMAR_DIAGRAM_ELEMENT = 'dsl-diagram__grammar-diagram-element',
}

export const DSL_DIAGRAM_DOCUMENTATION_ENTRIES = {
  [DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    url: 'http://www.example.org/',
    markdownText: {
      value:
        '[link](http://www.example.org) Lorem markdownum quae! Convivia possedit, fuit cruentae; clavam iners cycno\naequora *siccis*.\n\n> Spemque manu abdidit aliae et scopulum lata! Fusus natas sed collo nocti!\n> Multorum sedem, occasus aristas ambiguum dedit oculis glomerata, tuae mecum\n> tiliae coeperunt ignorat, modo gemina, quaerite.\n\nEssent litore suspicor [passis](http://www.nec.org/amissumammon.aspx) vultus!\nVestigia pariter submissaeque fugit certamen, di silvae, pro erroribus. Inde\nmuneris, querulas ab *fortiter*, lectus en erat legi. Septem armis amor, enim\nunco conceperat moriens stratis hoc, parat\n[Erysicthonis](http://www.tutela.org/sedagris.html) audaci. Accepere expulsi\nnudaque per postquam a pater miserum.',
    },
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DIAGRAM_ELEMENT]: {
    url: 'http://www.example.org/',
    markdownText: {
      value: '[link](http://www.example.org) Lorem markdownum quae!',
    },
  },
};
