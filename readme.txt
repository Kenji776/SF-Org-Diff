Salesforce Org Diff Finder


--What does this do? What problem does it solve?

This application makes it easy to find all differences between two folders (local Salesforce org data) while ignoring Salesforce Ids that should be different. This makes it easy to find any metadata that is different between orgs in ways you do not want/expect.

--Prerequisites

To use this script you must have the following.
- NodeJs installed
- Node Package Manager installed (npm)
- A local download of your org metadata (use the provided package.xml, you'll have to specify components that don't allow wildcard downloads)

--Installation
1) Open a command prompt within this application folder. Run 'npm install'

That's it. If you have node, and npm you are ready to go.

--How to use it?

1) Download all your org data for your two orgs you want to compare.
2) Copy the org data folders into the source folder (or wherever you have configured your paths to in the config.json file)
3) Run the script (either using the included OrgCompare.bat batch file if on windows or just use the console command 'node index.js' no quotes).
4) Wait for the script to finish running.
5) Investigate the results generated in the diffs (or specified output folder as specified in the config.json)