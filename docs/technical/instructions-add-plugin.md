# Steps for adding a Plugin in Legend Studio:

- Add the plugin folder in packages.

  - Add src subfolder with all the coding components, along with an index file to export whatever needed.
  - Add style folder with all the styling files.
  - Add package.json with all the necessary dependencies.
  - You may take reference from any of the already existing folders and make sure, the dependencies are correctly listed.

- After adding the plugin, you would need to register it via a function in **@finos-legend-application-query-bootstrap**.

  - Run the following command in terminal:
    - `cd finos-legend-application-query-bootstrap`
    - `finos-legend-application-query-bootstrap:> yarn add @finos-<plugin_folder_name>`. This will add the plugin dependency in @finos-legend-application-query-bootstrap.
  - Now you will be able to import the plugin. Add the plugin in index.ts file in the folder @ finos-legend-application-query-bootstrap/src.(You may take the reference of the plugin imports already present in the file).

- Now, you would also need to add the plugin in the overall studio project.
  - Add the path in tsconfig.json.
  - Add the path in tsconfig.build.json.

### Testing:

For testing out the plugin, build the project again via:

- `yarn install`
- `yarn setup`
- For running run `yarn dev:query`. This should run the project and open http://localhost:9001/query/ in the web browser.

### Notes:

- Make sure you run `yarn fix:format` and `yarn lint` to check for the correct format of the code, before merging the code.
- Make sure you add changesets depicting the relevant message.
