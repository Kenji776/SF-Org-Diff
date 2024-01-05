Salesforce Org Diff Finder


--What does this do? What problem does it solve?

This application makes it easy to find all differences between two folders (local Salesforce org data) while ignoring Salesforce Ids that should be different. This makes it easy to find any metadata that is different between orgs in ways you do not want/expect. It just makes it easier to find differences locally without having to involve git or vs code or any of the extra complexities and it makes the results of the diffs easily sharable and viewable. Really I just wanted a simple way to find all the diffs across my two orgs without having to tediously check everything in github or compare files one by one. The resulting diff logs it creates shows you exactly what two things were compared and the differences between them in a way that's easy to see and share while not getting tripped on Salesforce Ids that should be different between orgs.

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
3) Ensure the paths and options in the config.json are set appropriatly.
4) Run the script (either using the included OrgCompare.bat batch file if on windows or just use the console command 'node index.js' no quotes).
5) Wait for the script to finish running.
6) Investigate the results generated in the diffs (or specified output folder as specified in the config.json)

--FAQ

What does "stripSFIds" do?

- This is the feature that makes this application actually slightly more useful than any other diff. While doing the diff comparisions the script can replace anything that looks like a Salesforce Id with a static placeholder value. That way the diff won't detect these differences that are expected and clog up your results. That said the detection of what a Salesforce Id is isn't 100% bulletproof (you'd have to check with the server to verify the id is legit for everything) but there are multiple checks that should prevent a large majority of false positives.

Does this script modify any of the files? Could I run this directly against my project folder?

- This script will not modify any of the source project files it reads from, so it is safe to run directly against your project folders instead of copying them locally. 

Whats with the diffs being in JSON when the source files are in XML?

- JSON is easier to parse and evaluate (for me at least) so I convert the XML into JSON when processing the diffs. Attempting to convert back into XML was causing some odd issues so for the moment it just logs them in the JSON that that uses internally. I know it's not ideal but it does at least allow you to spot differences which is the point.