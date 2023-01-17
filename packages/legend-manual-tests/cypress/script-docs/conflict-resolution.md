# Workspace update test script

## PREP (ONCE)

1. Make sure we are in a clean project
   e.g. studio-end-to-end-test-project-conflict-resolution

## Test 1: No conflict

// No conflict update

1. Create 2 branchs: `ahead` and `conf`
2. Go to `ahead` and create > save > merge

```
Class model::Person
{
  name: String[1];
}
```

3. Go to `conf`
4. Go to workspace-update tab, verify new change
5. Update > verify the blocking alert, verify we're back to the app with no latest change (up to date)

## Test 2: No conflict update as both branches make the same changes

6. Delete and recreate branch `conf` (we should check here, technically, we don't need to delete this branch, as of now this is a bit flaky)
7. Create branch `ahead` and change > save > merge

```
Class model::Person
{
  name: String[1];
}

Class model::Person2
{
  name: String[1];
}
```

8. Make the same change in `conf`
9. Save and update
10. Verify we're up-to-date

## Test3: Conflict

11. Do the same thing, this time change `ahead` content to the following and merge

```
Class model::Person
{
  fullName: String[1];
}
```

12. For `conf`, do the following

```
Class model::Person
{
  firstName: String[1];
}
```

13. Verify the conflict in the conflict panel

```
Class model::Person
{
  fullName: String[1];
}
```

14. Click update
15. Wait, when we enter conflict resolution mode, check the message
16. Click `Resolve merge conflict`
17. Verify the layout in conflict resolution, verify we have 1 conflict and the conflict resolution tab is selected by default
18. Go back to the explorer tab and verify the graph has not been built yet
19. Go back to conflict resolution and hit "Abort"

// Verify that there are no conflicts if aggregated changes

19. Wait a bit and now edit `conf` to the following

```
Class model::Person
{
  fullName: String[1];
}
```

20. Now save and verify there are no more conflict, hit Update
21. Verify we are up-to-date

## Test4: Discard changes

Reset master to have content

```
Class model::Person
{
  name: String[1];
}
```

Follow `Test3` to step (15) but then click `Discard changes`

## Test5: Conflict resolution

Reset master to have content

```
Class model::Person
{
  name: String[1];
}
```

Follow `Test3` up to step (16).
Go in and actually resolve the conflict
Replace text content with

```
Class model::Person
{
  name: String[1]
}
```

Click `Mark as resolved` and check we got parser error

Change the content to

```
Class model::Person
{
  name: String[1];
}
```

now click `Marked as Resolved`

Now do the normal flow and save (accept conflict resolution)
Verify that we're good and up-to-date
