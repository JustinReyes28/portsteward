# LinkedIn announcement

## Post
I've made PortSteward public: a Windows terminal tool for understanding which local development project may own a busy port.

The main design decision is how to represent ownership. A saved profile that expects port 3000 is useful context, but the running process may belong to something else. PortSteward shows both, with an explicit label for the available evidence.

You can save project folders and launch commands, inspect listeners, and preview a process before confirming a stop. Restart is limited to servers the tool launched and uses the original run's command.

The Windows stop adapter validates identity and terminates through the same retained process handle. A real two-server test checks that restarting one managed app leaves the other responding.

This is an early alpha, MIT licensed, with no third-party npm dependencies. It runs from source on the tested Node.js 25.2.1 / PowerShell 5.1 setup. Stop is forceful and direct-process only; child-process wrappers remain a limitation.

The repository includes examples, 27 automated tests, the real Windows workflow test and passing CI:
https://github.com/JustinReyes28/portsteward

fkill-cli inspired the initial direction. I'd welcome feedback on the setup and whether the ownership labels make the next action clear.

## Attachment
assets/portsteward-wide.png or assets/portsteward-square.png

Alt text: PortSteward: know what owns your development ports. An illustrated port 3000 example distinguishes two expected project profiles from an observed listener whose owner is unverified. Windows alpha, MIT license and no npm dependencies. The card is labelled illustrated sample data.

## Optional first comment
The quickest place to start is the README's two sample projects:
https://github.com/JustinReyes28/portsteward#try-two-sample-projects

Bug reports and confusing ownership matches are welcome in Issues. Please use sample or redacted paths when sharing output.
