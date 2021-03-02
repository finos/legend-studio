### SetUp

1. create 'model' package
2. Create Person class with properties firstName(string), lastName(string), age (integer)
3. Create Firm class with property 'empoyees' of type Person multiplicity [*]
4. Add constraint to firm 'size fo employees > 2'
5. Create package 'other' in 'model' package
6. Create LegalEntity class with property id(string) and name (string)
7. Create Enumeration IncType in 'other' package with LLC and CORP
8. Add IncType to LegalEntity property as 'incType'
9. add LegalEntity to Firm's supertype
10. add 'MyProfile' Profile to 'model' package with tag 'doc'

### Avro

1. add 'MyAvro' as file generation choosing avro as a drop down
2. navigate the file directory. ensure you see Firm, Person and Legal Entity
3. open Firm
   check namespace is present in the avro
   uncheck namespace-> check namespace is not there
   check and ensure you see see LegalEntity properties incType,name,id
   uncheck includeSuperTypes
   check and ensure you no longer see LegalEntity properties incType,name,id

### Protobuf

1. addd 'myProtobuf'
2. navigate file directory and ensure you see all Classes
3. delete model from scopeElements
4. ensure you see 'no content' in directory and file
5. add package 'model::other' to scopeElements
6. ensure you only see LegalEntity generated

### Closing checks

1. refresh app and open check editor checking for the following

- 'MyAvro' -> ensure 'namespace' and includeSuperTypes and not checked off
- 'MyProtobuf' -> ensure 'model::other' in scopeElements
  'model::Firm' -> firm
  'model::Person' -> person
  'model::LegalEntity' legalEntity
  and the scopeElements

2. open generation specification -> assert under file generations you see all the file generations you created
3. generate (F10)
4. navigate through files generated ensure the following (NOTE: adjust this as it might differ as we removed some plugins)

- 4 files under root
- 6 files under model
- 6 files under model::other
- open one to ensure no crash
