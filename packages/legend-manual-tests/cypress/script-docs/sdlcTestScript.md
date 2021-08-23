1. Go to home page
2. Choose "Studio End to End Test Project"
3. Create workspace
4. Next
5. Verify there's no change
6. Create a package "model"
7. Create a class "Person"
8. Verify there is 1 change
9. Go to change panel
10. Open the change, verify the grammar on the right panel

```
Class model::Person
{
}
```

<!-- Verify the type of the change (with the hint text) -->

11. Save it (using clicking the save icon on the status bar)
12. After saved, verify the 2 panels are identical (look at the hint text - "Entity contents are identical)
13. Check there are no changes
14. Check the review indicator (yellow icon) shows up
15. Add class "Firm"
16. Go to class "Person" and add a property "firstName"
17. Verify there are 2 changes + Verify the type of the change (with the hint text)
18. Save again (Ctrl + S)
19. Go to "Person" change "firstName" to "lastName"
20. Verify we have 1 change
21. Change back "lastName" to "firstName"
22. Verify we have 0 change

<!-- Hackermode check -->

23. Go to hackermode
24. Delete "Firm"
25. Hit F9
26. Verify we have 1 change, a deletion
27. Re-add "Firm"
28. Hit F9
29. Verify no change
30. Exit hackermode

<!-- Project Overview -->

31. Open Project Overview > Go to overview
32. Verify infos
33. Create a tag "testTag" and Update
34. Refresh
35. Go back to overview, verify the tag name, delete the tag and update.
36. Refresh
37. Go back and verify that there is no tags

<!-- Work on review and project review -->

38. Go to workspace update panel - assert the update button is disabled and there are no changes
39. Go to review panel and assert that there are 2 changes
40. Create a review "MyReview" -> Click + button
41. Close the review
42. Create a review "MyReview2" -> Hit Enter

<!-- Review screen -->

<!-- 43. Click the arrow button to go to the reviewer
44. Verify 2 changes
45. Close review
46. Re-open review -->
<!-- 47. Go back to the workspace using the URL -->

<!-- back to your own project -->

48. Click merge
49. Wait -> and choose "Leave"
50. Verify we're on home page
