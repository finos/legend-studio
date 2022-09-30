# User Interface

It should be pretty obvious that our interface is heavily influenced by [Visual Studio Code](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette), but there are some fundamental factors that make Studio a unique design challenge.

1. Whenever we design a IDE, we have to consider what is the smallest unit of edition. In our case, it's not `file` like VSCode nor like IntelliJ, it's `element`, and the fact that each element demands its own tailored form-editor makes our design problem more complicated than text-editor based apps like VSCode.

2. Due to this complexity in building unique forms for each element type, we are forced to use modal components more often since the screen real estate is limited and forms can get complicated quickly. From this aspect, we can learn a lot from [IntelliJ](https://jetbrains.github.io/ui/).

Read more:

- [Visual Studio Code: User Interface](https://code.visualstudio.com/docs/getstarted/userinterface)
- [IntelliJ Platform UI Guidelines](https://jetbrains.github.io/ui/)
