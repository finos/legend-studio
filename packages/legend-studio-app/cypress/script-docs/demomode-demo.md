# Demo mode test script

## PREP (only ONCE)

1. Make sure we enable `demo-mode` using the config, we can potentially spy on the network traffic and mock the response body (in Cypress)

## Test 1: Explorer tree and limited feature set

1. Make sure we can see "legal" in the tree
2. Make sure we don't see "config"
<!-- 3. Can't test generation just yet  -->
3. Click on the + and see the list of supported elements, we should have:
   - Package
   - Class
   - Enumeration
   - Profile
   - Mapping
   - Diagram
   - Text
