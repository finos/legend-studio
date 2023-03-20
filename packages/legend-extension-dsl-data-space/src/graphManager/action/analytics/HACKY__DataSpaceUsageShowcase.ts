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

import { Randomizer, uuid } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export abstract class HACKY__DataSpaceUsageShowcaseSampleOutput {}

export abstract class HACKY__DataSpaceUsageShowcaseOutputDescription {
  readonly sampleOutput!: HACKY__DataSpaceUsageShowcaseSampleOutput;

  constructor(sampleOutput: HACKY__DataSpaceUsageShowcaseSampleOutput) {
    this.sampleOutput = sampleOutput;
  }
}

type SampleData = boolean | string | number | undefined;

export class HACKY__DataSpaceUsageShowcaseTDSSampleOutput extends HACKY__DataSpaceUsageShowcaseSampleOutput {
  readonly headers: string[] = [];
  readonly rows: SampleData[][] = [];

  constructor(headers: string[], rows: SampleData[][]) {
    super();
    this.headers = headers;
    this.rows = rows;
  }
}

class HACKY__DataSpaceUsageShowcaseTDSColumnInfo {
  readonly uuid = uuid();
  readonly name!: string;
  readonly description?: string | undefined;
  readonly sampleValues: SampleData[] = [];

  constructor(
    name: string,
    description: string | undefined,
    sampleValues: SampleData[],
  ) {
    this.name = name;
    this.description = description;
    this.sampleValues = sampleValues;
  }
}

const generateTDSSampleOutput = (
  columns: HACKY__DataSpaceUsageShowcaseTDSColumnInfo[],
  rowCount = 10,
): SampleData[][] => {
  const randomizer = new Randomizer();
  const data: SampleData[][] = [];
  for (let i = 0; i < rowCount; ++i) {
    const rowData: SampleData[] = [];
    columns.forEach((column) => {
      if (column.sampleValues.length) {
        rowData.push(randomizer.getRandomItemInCollection(column.sampleValues));
      } else {
        rowData.push(undefined);
      }
    });
    data.push(rowData);
  }
  return data;
};

export class HACKY__DataSpaceUsageShowcaseTDSOutputDescription extends HACKY__DataSpaceUsageShowcaseOutputDescription {
  readonly columns: HACKY__DataSpaceUsageShowcaseTDSColumnInfo[] = [];

  constructor(columns: HACKY__DataSpaceUsageShowcaseTDSColumnInfo[]) {
    super(
      new HACKY__DataSpaceUsageShowcaseTDSSampleOutput(
        columns.map((col) => col.name),
        generateTDSSampleOutput(columns),
      ),
    );
    this.columns = columns;
  }
}

export class HACKY__DataSpaceUsageShowcase {
  readonly uuid = uuid();
  readonly title!: string;
  readonly description?: string | undefined;
  readonly query!: string;
  readonly outputDescription!: HACKY__DataSpaceUsageShowcaseOutputDescription;

  showQuery = false;
  showOutputDescription = true;
  showSampleOutput = false;

  constructor(
    title: string,
    description: string | undefined,
    query: string,
    outputDescription: HACKY__DataSpaceUsageShowcaseOutputDescription,
  ) {
    makeObservable(this, {
      showQuery: observable,
      showOutputDescription: observable,
      showSampleOutput: observable,
      setShowQuery: action,
      setShowOutputDescription: action,
      setShowSampleOutput: action,
    });

    this.title = title;
    this.description = description;
    this.query = query;
    this.outputDescription = outputDescription;
  }

  setShowQuery(val: boolean): void {
    this.showQuery = val;
  }

  setShowOutputDescription(val: boolean): void {
    this.showOutputDescription = val;
  }

  setShowSampleOutput(val: boolean): void {
    this.showSampleOutput = val;
  }
}

export const HACKY__SHOWCASE1 = new HACKY__DataSpaceUsageShowcase(
  'Getting all COVID cases info',
  `## Illa figens scelerum operum tonitribus cumque ego

  Lorem markdownum meritis quoque narravere ea fallere caelumque enim magnoque! Et
  animam trabeati Iuppiter quos ossa erat coniuge tu secrevit glaebas viam vulgus,
  adsere eripitur saepe; eadem.

  ## Genualia quae

  Troezenius sceptri respondere curasque et quidem epulae oculos inornatos letique
  servaverat armi facta. Ille sentirent! Excipit Echecli [vos
  optatis](http://ante.io/quid.aspx): quo stipite dixit in supremis nec fatetur
  sentit; illa ultor. Multa abest terras facundis utque, omnique silvamque nam
  quamvis iners.

      real_basic = exbibyte - isoText / zebibyteLogicNorthbridge -
              ripcordingHeatCard;
      ppl(ppgaNosql(grayscaleFile(vpnBsod, file, balancing)), pop_cross_error(97 +
              cmos_mac), w);
      rich.fileClientTablet = impact.method_pharming(xml, w_external +
              softwareGpsDirect);
      search = -1;

  ## Trabes cepit mortalia`,
  `|domain::COVIDData.all()->project(
    [
      x|$x.cases,
      x|$x.caseType,
      x|$x.fips,
      x|$x.date
    ],
    [
      'Cases',
      'Case Type',
      'Fips',
      'Date'
    ]
  )`,
  new HACKY__DataSpaceUsageShowcaseTDSOutputDescription([
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Cases',
      'The number of cases',
      [123, 1416, 12453, 6234],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Case Type',
      'Type of the reported case: e.g. Active, Confirmed',
      ['Active', 'Confirmed'],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'FIPS',
      'The FIPS code',
      [1, 3, 5, 6, 7],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Date',
      'The date of case report',
      ['2020-10-10', '2023-10-15', '2022-03-03'],
    ),
  ]),
);

export const HACKY__SHOWCASE2 = new HACKY__DataSpaceUsageShowcase(
  'Getting COVID cases info for New York (FIPS: 20)',
  `## Citharam laudibus et mensas Numitorque eademque

  Lorem markdownum ferventia euntem adsensit tenetque fateri dirum intrasse
  [Naupliades](http://promisistis.net/): quod. Aequali somni vulnera frontem tamen
  circumdata quidem coniunctior rerum omnis reddite teneri Maiaque manebat
  corpora, Acmon caputque demptos.

  ## E tepidisque

  Fetus Sperchios, dumque bono spissus media ora desilit ingenti, lupo forsitan
  *se*. Extra et una **iuventus pronus** crinis nodum lucis casus quae pronus et.

  > **Latos fuit** bracchia contendere thalamos inmiti securibus Aeginam campus
  > maestaeque urbis, sic nobis quae colebat, manu. Nec fecit descendat dare
  > minus; a umbras iam inpetus **neci**. Quid talia, et pulsis, easdem, clamore,
  > putetis. AI inultam loqui **antiquo Liberfemineae** damna; nostra riget
  > liberat rogatus nisi recentibus. Putria turbineo terram virilem, est quoque
  > *esse Sabina* qui profatur rauca, hunc.
  `,
  `|domain::COVIDData.all()->filter(
    x|$x.demographics.fips == '20'
  )->project(
    [
      x|$x.cases,
      x|$x.caseType,
      x|$x.fips,
      x|$x.date,
      x|$x.demographics.state
    ],
    [
      'Cases',
      'Case Type',
      'Fips',
      'Date',
      'Demographics/State'
    ]
  )`,
  new HACKY__DataSpaceUsageShowcaseTDSOutputDescription([
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Cases',
      'The number of cases',
      [123, 1416, 12453, 6234],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Case Type',
      'Type of the reported case: e.g. Active, Confirmed',
      ['Active', 'Confirmed'],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'FIPS',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ante in nibh mauris cursus mattis. Placerat vestibulum lectus mauris ultrices eros. Dignissim diam quis enim lobortis scelerisque. Quam id leo in vitae turpis. Lobortis feugiat vivamus at augue eget arcu dictum varius duis. Tellus mauris a diam maecenas sed enim ut sem viverra. Nec feugiat nisl pretium fusce id. A iaculis at erat pellentesque adipiscing commodo. Turpis massa tincidunt dui ut ornare lectus sit. Nascetur ridiculus mus mauris vitae ultricies leo integer malesuada. Nisi lacus sed viverra tellus in hac habitasse platea dictumst. Commodo viverra maecenas accumsan lacus vel facilisis volutpat.',
      [1, 3, 5, 6, 7],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Date',
      'The date of case report',
      ['2020-10-10', '2023-10-15', '2022-03-03'],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'State',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Imperdiet proin fermentum leo vel orci porta. Et tortor consequat id porta nibh venenatis cras. Ut etiam sit amet nisl purus in mollis. Iaculis eu non diam phasellus vestibulum lorem sed risus. Nisl vel pretium lectus quam id leo in vitae. Tellus molestie nunc non blandit massa enim nec dui. Lorem donec massa sapien faucibus et molestie ac. Pharetra convallis posuere morbi leo urna molestie at. Hac habitasse platea dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non blandit massa enim nec dui nunc mattis. Scelerisque eleifend donec pretium vulputate sapien. In cursus turpis massa tincidunt dui ut ornare lectus sit. Turpis in eu mi bibendum neque. Congue mauris rhoncus aenean vel elit scelerisque mauris pellentesque pulvinar. Elit ullamcorper dignissim cras tincidunt lobortis feugiat. Pellentesque dignissim enim sit amet. Morbi tristique senectus et netus et malesuada fames ac. At tellus at urna condimentum mattis pellentesque id',
      ['New York', 'Minesota', 'New Jersey', 'California'],
    ),
  ]),
);

export const HACKY__SHOWCASE3 = new HACKY__DataSpaceUsageShowcase(
  'Getting COVID cases for today',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  `|domain::COVIDData.all()->filter(
    x|$x.date ==
      meta::pure::functions::date::today()
  )->project(
    [
      x|$x.cases,
      x|$x.caseType,
      x|$x.date,
      x|$x.demographics.state
    ],
    [
      'Cases',
      'Case Type',
      'Date',
      'Fips',
      'Demographics/State'
    ]
  )`,
  new HACKY__DataSpaceUsageShowcaseTDSOutputDescription([
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Cases',
      'The number of cases',
      [123, 1416, 12453, 6234],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Case Type',
      'Type of the reported case: e.g. Active, Confirmed',
      ['Active', 'Confirmed'],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'Date',
      'The date of case report',
      ['2020-10-10', '2023-10-15', '2022-03-03'],
    ),
    new HACKY__DataSpaceUsageShowcaseTDSColumnInfo(
      'State',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Imperdiet proin fermentum leo vel orci porta. Et tortor consequat id porta nibh venenatis cras. Ut etiam sit amet nisl purus in mollis. Iaculis eu non diam phasellus vestibulum lorem sed risus. Nisl vel pretium lectus quam id leo in vitae. Tellus molestie nunc non blandit massa enim nec dui. Lorem donec massa sapien faucibus et molestie ac. Pharetra convallis posuere morbi leo urna molestie at. Hac habitasse platea dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non blandit massa enim nec dui nunc mattis. Scelerisque eleifend donec pretium vulputate sapien. In cursus turpis massa tincidunt dui ut ornare lectus sit. Turpis in eu mi bibendum neque. Congue mauris rhoncus aenean vel elit scelerisque mauris pellentesque pulvinar. Elit ullamcorper dignissim cras tincidunt lobortis feugiat. Pellentesque dignissim enim sit amet. Morbi tristique senectus et netus et malesuada fames ac. At tellus at urna condimentum mattis pellentesque id',
      ['New York', 'Minesota', 'New Jersey', 'California'],
    ),
  ]),
);
