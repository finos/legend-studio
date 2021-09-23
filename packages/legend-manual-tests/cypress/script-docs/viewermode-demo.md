# ViewerMode test script

// NOTE: we need to choose a PROD project as it allows version so we can properly test version
e.g. studio-end-to-end-test-project-prod

## PREP (only ONCE)

1. Create a blank PROD project, add a class "model::Person"
2. Commit and merge that
3. Do a release for it
4. Get the revision ID and version ID

## Test 1: Open element

1. Create a new workspace
2. Right click on `model::Person` and click `View in Project`
3. Verify that `model::Person` being opened, note that for the URL, the element path is cleaned
   // cleanup
4. Delete the workspace

## Test 2: Open not-found element

1. Create a new workspace
2. Create a new element `model::Firm`
3. Right click on `model::Firm` and click `View in Project`
4. Verify that no element editor is opened and an error notification pops up to say the element is not found
   // cleanup
5. Delete the workspace

## Test 3: Open project

1. Create a new workspace
2. Click on the share link button, click on Copy link
3. Verify the notification
4. Go to the link and verify there's `model::Person`
   // cleanup
5. Delete the workspace

## Test 4: Open project from a version

1. Create a new workspace
2. Click on the share link button, wait and choose a version (there should only be 1), click on Copy link
3. Verify the notification
4. Go to the link and verify the content and the URL
   // cleanup
5. Delete the workspace

## Test 5: Open project from the revision ID

1. Make sure we check the content and the URL
   // no cleanup is needed
