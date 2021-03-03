/**
 * Copyright 2020 Goldman Sachs
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

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  resolveFullTsConfig,
} = require('@finos/legend-studio-dev-utils/TypescriptConfigUtils');
const { resolvePackageConfig } = require('../loadPackageConfig');

const ROOT_DIR = path.resolve(__dirname, '../..');

console.log(`
===================================================================================
  NOTE: This script is meant to be run inside a CI build. If you run it manually,
  please make sure the script properly cleans up temporary content generated for
  publishing. Then, run \`git push --follow-tags\` to publish new tags on Github.
===================================================================================
`);

if (!process.env.NPM_TOKEN && !process.env.YARN_NPM_AUTH_TOKEN) {
  console.log('NPM authentication token is not specified`');
  process.exit(1);
}

if (execSync('git status --porcelain', { encoding: 'utf-8', cwd: ROOT_DIR })) {
  console.log(
    'This command must be executed on a clean repository. Found changes items:',
  );
  execSync('git status --porcelain', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  process.exit(1);
}

// identify packages to be published in topological order
console.log('Resolving packages to publish...');
let packages = [];
try {
  const workspaceDirsInOrder = execSync(
    'yarn workspaces foreach --topological-dev --no-private run info:dir',
    { encoding: 'utf-8', cwd: ROOT_DIR },
  )
    .split('\n')
    .filter(Boolean)
    .slice(0, -1)
    .map((str) => str.match(/[\S]+$/))
    .flat();
  const workspaces = execSync('yarn workspaces list --json', {
    encoding: 'utf-8',
    cwd: ROOT_DIR,
  })
    .split('\n')
    .filter(Boolean)
    .map((text) => JSON.parse(text))
    .map((ws) => ({
      name: ws.name,
      location: ws.location,
      path: path.resolve(ROOT_DIR, ws.location),
      version: require(path.resolve(ROOT_DIR, ws.location, 'package.json'))
        .version,
      hasLicenseFile: fs.existsSync(
        path.resolve(ROOT_DIR, ws.location, 'LICENSE'),
      ),
    }));
  packages = workspaceDirsInOrder.map((dir) => {
    const pkg = workspaces.find((ws) => ws.path === dir);
    if (!pkg) {
      throw new Error(`Can't find package with location '${dir}'`);
    }
    return pkg;
  });
} catch (e) {
  console.log(`Something went wrong: ${e.message}`);
  process.exit(1);
}

if (packages.length) {
  packages.forEach((pkg) => console.log(`${pkg.name}@${pkg.version}`));
} else {
  console.log('No packages found for publish.');
  process.exit(0);
}

console.log('\nPreparing content to publish...');
const backupTsConfig = new Map();
packages.forEach((pkg) => {
  const packageConfig = resolvePackageConfig(pkg.path);
  // If the package does not have a LICENSE file, copy the LICENSE file from root
  if (!pkg.hasLicenseFile) {
    fs.copyFileSync(
      path.resolve(ROOT_DIR, 'LICENSE'),
      path.resolve(pkg.path, 'LICENSE'),
    );
  }
  /**
   * For Typescript module, we need to fully resolve `tsconfig` file, i.e. we need to make sure the config does not
   * have `extends` field anymore. This is needed for source code navigation to work properly.
   *
   * e.g. we use module `libA` in another project, in the IDE, we navigate the source code of `libA` in node_modules
   * the IDE is smart enough to read source map and redirect our navigation to the actual source code of `libA` in
   * `libA/src` folder but due to a not fully-resolved `tsconfig.json` the IDE will show errors for Typescript files
   * shown in `libA/src`
   */
  const tsConfigProcessEntries = [
    // default to `./tsconfig.json` if `publish.typescript` is not specified
    {
      source: packageConfig?.publish?.typescript?.main ?? './tsconfig.json',
      target: './tsconfig.json',
    },
    ...(packageConfig?.publish?.typescript?.others ?? []).map((item) => ({
      source: item,
      target: item,
    })),
  ];
  tsConfigProcessEntries.forEach(({ source, target }) => {
    const resolvedSourcePath = path.resolve(pkg.path, source);
    const resolvedTargetPath = path.resolve(pkg.path, target);
    if (fs.existsSync(resolvedSourcePath)) {
      const newTsConfigContent = resolveFullTsConfig(resolvedSourcePath);
      // backup the current config so we can recover post-publish
      backupTsConfig.set(
        resolvedTargetPath,
        fs.readFileSync(resolvedTargetPath, { encoding: 'utf-8' }),
      );
      fs.writeFileSync(
        resolvedTargetPath,
        JSON.stringify(newTsConfigContent, null, 2),
        (err) => {
          console.log(
            `Can't write full Typescript config file '${resolvedSourcePath}' to path '${resolvedTargetPath}' for package '${pkg.name}'. Error: ${err.message}`,
          );
          process.exit(1);
        },
      );
    }
  });
});

console.log('\nPublishing...');
// Try to publish all packages
for (const pkg of packages) {
  try {
    const npmInfo = JSON.parse(
      execSync(`yarn npm info --json ${pkg.name}`, {
        encoding: 'utf-8',
        cwd: ROOT_DIR,
      }),
    );
    if (npmInfo.versions?.includes(pkg.version)) {
      pkg.alreadyPublished = true;
      console.log(
        `Package '${pkg.name}' is not being published because version '${pkg.version}' is already published on NPM`,
      );
    } else {
      throw new Error(); // dummy error to proceed and publish as package is not found
    }
  } catch {
    try {
      // Check publish content
      execSync(`yarn workspace ${pkg.name} check:publish --bail`, {
        cwd: pkg.path,
        stdio: ['pipe', 'pipe', 'inherit'], // only print error
      });
      // Publish using Yarn NPM publish.
      execSync('yarn npm publish', {
        cwd: pkg.path,
        stdio: ['pipe', 'pipe', 'inherit'], // only print error
      });
      pkg.published = true;
    } catch (publishError) {
      console.log(
        `Something went wrong. Cannot publish package '${pkg.name}'. Error: ${publishError.message}`,
      );
    }
  }
}

// Remove all temporary publish content
console.log('\nRemoving generated content prepared for publish...');
// Remove added LICENSE files
packages.forEach((pkg) => {
  if (!pkg.hasLicenseFile) {
    fs.rmSync(path.resolve(pkg.path, 'LICENSE'));
  }
});
// Remove resolved Typescript config files
Array.from(backupTsConfig.entries()).forEach(([tsConfigPath, content]) => {
  fs.writeFileSync(tsConfigPath, content, (err) => {
    console.log(
      `Can't recover Typescript config file with path '${tsConfigPath}'. Make sure you manually revert this before committing.`,
    );
  });
});

const publishedPkgs = packages.filter((p) => p.published);
const unPublishedPkgs = packages.filter(
  (p) => !p.published && !p.alreadyPublished,
);

if (publishedPkgs.length > 0) {
  console.log(
    `Package(s) published successfully:\n${publishedPkgs
      .map((p) => `${p.name}@${p.version}`)
      .join('\n')}`,
  );
  publishedPkgs.forEach((pkg) => {
    // We create the tags after the push above so that we know that HEAD wont change and that pushing
    // wont suffer from a race condition if another merge happens in the mean time (pushing tags wont
    // fail if we are behind master).
    const tag = `${pkg.name}@${pkg.version}`;
    // NOTE: it's important we use the -m flag otherwise 'git push --follow-tags' wont actually push the tags
    // as the tag is not considered annotated
    // See https://git-scm.com/docs/git-push#Documentation/git-push.txt---follow-tags
    try {
      execSync(`git tag -a ${tag} -m ${tag}`, {
        cwd: ROOT_DIR,
        stdio: ['pipe', 'pipe', 'inherit'], // only print error
      });
      // NOTE: this log message is needed so that `changesets/action` can pick up the published version
      // and create Github release accordingly
      // See https://github.com/changesets/action/blob/master/src/run.ts
      console.log('New tag: ', tag);
    } catch (e) {
      console.log(
        `Failed to create tag: ${tag}. Please manually create this tag and push using \`git push --follow-tags\`. Error:\n${e.message}`,
      );
    }
  });
}

if (unPublishedPkgs.length > 0) {
  console.log(
    `Package(s) failed to publish:\n${unPublishedPkgs
      .map((p) => `${p.name}@${p.version}`)
      .join('\n')}`,
  );
  process.exit(1);
}
