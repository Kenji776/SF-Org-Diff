const configFileName = "config.json";
const dircompare = require('dir-compare');;
const path = require('path');
const fs = require('fs');
const sfIdRegEx = '[a-zA-Z0-9]{15}([A-Z0-5]{3})?';
const xml2js = require('xml2js');
const json2xml = require('json2xml');
const parseString = xml2js.parseString;
const styles = fs.readFileSync(`style.css`, 'utf8');
const scripts = fs.readFileSync(`diff.js`, 'utf8');
	
require('colors');
const Diff = require('diff');

//entries to write into the program log on completion
let logEntries = [];

//entries to write into the program  error log on completion
let errorLogEntries = [];

const options = { compareSize: true, 
				  compareContent: true, 
				  ignoreLineEnding: true,      // Ignore crlf/lf line ending differences
				  ignoreWhiteSpaces: true,     // Ignore white spaces at the beginning and end of a line (similar to 'diff -b')
				  ignoreAllWhiteSpaces: true,  // Ignore all white space differences (similar to 'diff -w')
				  ignoreEmptyLines: true       // Ignores differences caused by empty lines (similar to 'diff -B')
};
//default config options
let config = {
	path1: "source\\3M Prod\\force-app\\main\\default",
	path2: "source\\3MSpinCo\\force-app\\main\\default",
	path1Nickname: "Prod",
	path2Nickname: "SpinCo",
	outputPath: "diffs",
	stripSFIds: true,
};

var twirlTimer = (function() {
  var P = ["\\", "|", "/", "-"];
  var x = 0;
  return setInterval(function() {
    process.stdout.write("\r" + P[x++]);
    x &= 3;
  }, 250);
})();


/**
* @Description Entry point function. Loads configuration, checks it for validity and calls the menu to display to the user
*/
async function init() {
    console.log("                                    Salesforce Local Org Diff Utility\r\n");
    console.log("                                     Author: Daniel Llewellyn\r\n");

    let d = new Date();
    d.toLocaleString();

    log("Started process at " + d, false);

    let loadedConfig = loadConfig(configFileName);
    config = { ...config, ...loadedConfig };	
	
	log(`Comparing files in ${config.path1} to files in ${config.path2} and saving results to ${config.outputPath}`,true,'green');
	
	log(`Please Wait....`,true);
	await compareFolders(config.path1,config.path2);
	
	log(`Process complete! View your diff logs in ${config.outputPath}`,true,'green');
	
	finish();
	
}

async function compareFolders(path1,path2){
	
	try{
		let diffs = {};
		
		if (!fs.existsSync(path1)){
			throw(`Directory ${path1} does not exist. Check the path and try again`);
		}
		if (!fs.existsSync(path2)){
			throw (`Directory ${path2} does not exist. Check the path and try again`);
		}
		const res = dircompare.compareSync(path1, path2, options)

		for(let thisDiff of res.diffSet){

			try{
				if(thisDiff.state != 'equal' && thisDiff.path1 && thisDiff.name1 && thisDiff.path2 && thisDiff.name2){	

					//okay we've established these two files are not equal objectivly. Lets try removing any salesforce Ids and see if that gets them to be the same.
					let file1Text = fs.readFileSync(`${thisDiff.path1}\\${thisDiff.name1}`, 'utf8');
					let file2Text = fs.readFileSync(`${thisDiff.path2}\\${thisDiff.name2}`, 'utf8');
						
					//get the file XML
					let file1Data = await xmlToJson(file1Text);
					let file2Data = await xmlToJson(file2Text);		
					
					//calling this function with the strip id flag to true will modify it, removing all salesforce ids
					
					if(config.stripSFIds){
						extractSfIdsFromObject(file1Data,true);
						
						extractSfIdsFromObject(file2Data,true);
					}
					
					if(JSON.stringify(file1Data) != JSON.stringify(file2Data)){
						
						if(!file1Data) file1Data = {};
						if(!file2Data) file2Data = {};
						let htmlContent = generateDiffPage(JSON.stringify(file1Data,undefined,2), JSON.stringify(file2Data,undefined,2), thisDiff.name1);	
						
						//let htmlContent = generateDiffPage(json2xml(file1Data), json2xml(file2Data), thisDiff.name1);	

						//add to our log of diffs
						let typeDiffs = diffs.hasOwnProperty(thisDiff.path1) ? diffs[thisDiff.path1] : [];				
						typeDiffs.push(thisDiff.name1);
						diffs[thisDiff.path1] = typeDiffs;
						
						writeFile(`${config.outputPath}\\${thisDiff.path1}`,`${thisDiff.name1}.html`,htmlContent)					

					}
					
				}
			}catch(ex){
				handleError({error: ex, data: thisDiff, config: config, scopeData: this});
			}
		}
		
		writeFile(`${config.outputPath}`,`differences.json`,JSON.stringify(diffs,undefined,2))
		
		writeFile(`${config.outputPath}`,`differences.html`,generateIndexHtml(diffs))
		
	}
	catch(ex){
		handleError({error: ex, scopeData: this, config: config});
	}
}

function generateIndexHtml(diffsObject){
	
	let tableContent = '';
	let diffArray = [];
	
	for (let [key, value] of Object.entries(diffsObject)) {
		tableContent += `<tr><th colspan="2">${key}</th></tr>`;
		
		for(let entry in diffsObject[key]){
			tableContent += `<tr><td style="width:20px">${entry}</td><td><a href="${key}\\${diffsObject[key][entry]}.html">${diffsObject[key][entry]}</a></td></tr>`;
		}
	}
	
	let htmlContent = `<!DOCTYPE html>
	<html>
	<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
		<title>Diff Index</title>
		<style>
			#index {
				width: 300px;
			}
			th {
				align:center;
			}
		</style>
	</head>
	<body>
		<div id="settings">
			<h1>Diff Index</h1>
		</div>
		<table id="index" border="1">
			<tbody >	
				${tableContent}
			</tbody>
		</table>
	</body>`;
	
	return htmlContent;
}
function extractSfIdsFromObject(searchObject = {}, stripIds = false, sfIds =[]){
	if (typeof searchObject === 'object') {
		const entries = Object.entries(searchObject);

		Object.keys(searchObject).forEach(function(key,index) {			
			if (typeof  searchObject[key] === 'object') {
				return extractSfIdsFromObject(searchObject[key], stripIds, sfIds);
			}
			
			else {
				if(isValidSfId(String(normaliseSforceID(searchObject[key])))) {
					sfIds.push(searchObject[key]);
					if(stripIds) searchObject[key] = '[Salesforce Id Stripped]';
					
				}
			}
		});
	}
	return sfIds;
}

function generateDiffPage(text1,text2,filename){

					
	let htmlContent = `<!DOCTYPE html>
	<!-- saved from url=(0033)http://incaseofstairs.com/jsdiff/ -->
	<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
		
		<title>Diff Chars</title>
		<link rel="stylesheet" href="http://incaseofstairs.com/jsdiff/style.css">
		<style>${styles}</style>
	</head>
	<body>

	<div id="settings">
		<h1>Diff</h1>
		<label><input type="radio" name="diff_type" value="diffChars" checked=""> Chars</label>
		<label><input type="radio" name="diff_type" value="diffWords"> Words</label>
		<label><input type="radio" name="diff_type" value="diffLines"> Lines</label>
	</div>

	<table>
		<tbody>
		<tr>
			<th>${config.path1Nickname}</th>
			<th>${config.path2Nickname}</th>
			<th>Difference</th>
		</tr>
		<tr>
			<td contenteditable="true" id="a">${text1}</td>
			<td contenteditable="true" id="b">${text2}</td>
			<td><pre id="result"></pre></td>
		</tr>
	</tbody></table>
	</body>
	<script src="http://incaseofstairs.com/jsdiff/diff.js"></script>
	<script>${scripts}</script>
	</script>
	<script defer="">
	var a = document.getElementById('a');
	var b = document.getElementById('b');
	var result = document.getElementById('result');

	function changed() {
		var diff = Diff[window.diffType](a.textContent, b.textContent);
		var fragment = document.createDocumentFragment();
		for (var i=0; i < diff.length; i++) {

			if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
				var swap = diff[i];
				diff[i] = diff[i + 1];
				diff[i + 1] = swap;
			}

			var node;
			if (diff[i].removed) {
				node = document.createElement('del');
				node.appendChild(document.createTextNode(diff[i].value));
			} else if (diff[i].added) {
				node = document.createElement('ins');
				node.appendChild(document.createTextNode(diff[i].value));
			} else {
				node = document.createTextNode(diff[i].value);
			}
			fragment.appendChild(node);
		}

		result.textContent = '';
		result.appendChild(fragment);
	}

	window.onload = function() {
		onDiffTypeChange(document.querySelector('#settings [name="diff_type"]:checked'));
		changed();
	};

	a.onpaste = a.onchange =
	b.onpaste = b.onchange = changed;

	if ('oninput' in a) {
		a.oninput = b.oninput = changed;
	} else {
		a.onkeyup = b.onkeyup = changed;
	}

	function onDiffTypeChange(radio) {
		window.diffType = radio.value;
		document.title = "Diff " + radio.value.slice(4);
	}

	var radio = document.getElementsByName('diff_type');
	for (var i = 0; i < radio.length; i++) {
		radio[i].onchange = function(e) {
			onDiffTypeChange(e.target);
			changed();
		}
	}
	</script>`;
	
	return htmlContent;
}
function isValidSfId(str) {
    // https://stackoverflow.com/a/29299786/1333724
    if (typeof str !== 'string' || (str.length !== 18 && str.length !== 15)) {
        return false;
    }

	if(str.substring(5,6) != 0 || str.substring(6,7) != 0){
		return false;
	}
    let upperCaseToBit = (char) => char.match(/[A-Z]/) ? '1' : '0';
    let binaryToSymbol = (digit) => digit <= 25 ? String.fromCharCode(digit + 65) : String.fromCharCode(digit - 26 + 48);

    let parts = [
        str.slice(0,5).split("").reverse().map(upperCaseToBit).join(""),
        str.slice(5,10).split("").reverse().map(upperCaseToBit).join(""),
        str.slice(10,15).split("").reverse().map(upperCaseToBit).join(""),
    ];

    let check = parts.map(str => binaryToSymbol(parseInt(str, 2))).join("");

    return check === str.slice(-3);
}

function normaliseSforceID(id) { // fluff up a 15 char id to return an 18 char id
    if (id == null) return id;
    id = id.replace(/\"/g, ''); // scrub quotes from this id
    if (id.length != 15) {
        //print('well, id is not 15, bye' + id + ' ' + id.length);
        return null;
    }
    var suffix = "";
    for (var i = 0; i < 3; i++) {
        var flags = 0;
        for (var j = 0; j < 5; j++) {
            var c = id.charAt(i * 5 + j);
            if (c >= 'A' && c <= 'Z') {
                flags += 1 << j;
            }
        }
        if (flags <= 25) {
            suffix += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(flags);
        } else {
            suffix += "012345".charAt(flags-26);
        }
    }
    return id + suffix;
}

function getFilesRecursively(dir) {
	if (!fs.existsSync(filePath)){
		throw new(`Directory ${dir} does not exist. Check the path and try again`);
	}
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((file) => file.isDirectory() ? getFilesRecursively(path.join(dir, file.name)) : path.join(dir, file.name))
}

async function xmlToJson(xml){
	var parser = new xml2js.Parser(/* options */);
	return parser.parseStringPromise(xml);
}

/**
 * @Description Reads and parses JSON from a given file.
 * @Param fileName the name of the file to read, parse, and return.
 * @Return a JSON object.
 */
function readJSONFromFile(fileName) {
    let fileJSON = fs.readFileSync(fileName, 'utf-8', function (err) {
        log("File not found or unreadable. Skipping import" + err.message, true, "red");
        return null;
    });

	//strip any comments from our JSON sting
	fileJSON = fileJSON.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    const parsedJSON = JSON.parse(fileJSON);
    return parsedJSON;
}

function loadConfig(configFileName) {
    return readJSONFromFile(configFileName);
}

function writeFile(filePath,fileName,fileContent){
	try{
		if (filePath && filePath.length > 0 && !fs.existsSync(filePath)){
			fs.mkdirSync(filePath, { recursive: true });
		}

		if(filePath && filePath.length > 0) {
			filePath += '\\';
		}
		fs.writeFileSync(`${filePath}${fileName}`, fileContent, function (err) {
			if (ex) {	
				handleError({error: ex, scopeData: this, config: config, arguments: arguments});

				return false;
			}
		});
	}catch(ex){
		handleError({error: ex, scopeData: this, config: config, arguments: arguments});
	}
	return true;
}

/**
* @Description clears the terminal screen.
*/
function clearScreen(){
	console.log('\033[2J');
	process.stdout.write('\033c');
}

/**
 * @Description Creates a log entry in the log file, and optionally displays log entry to the terminal window with requested color.
 * @Param logItem a string of data to log
 * @Param printToScreen boolean flag indicating if this entry should be printed to the screen (true) or only to the log file (false)
 * @Param a string {'red','green','yellow'} that indicates what color the logItem should be printed in on the screen..
 */
function log(logItem, printToScreen, color) {
    printToScreen = printToScreen != null ? printToScreen : true;
    var colorCode = "";
    switch (color) {
        case "red":
            colorCode = "\x1b[31m";
            break;
        case "green":
            colorCode = "\x1b[32m";
            break;
        case "yellow":
            colorCode = "\x1b[33m";
    }

    if (printToScreen) console.log(colorCode + "" + logItem + "\x1b[0m");

	logEntries.push(logItem);
	
	if(color === 'red') errorLogEntries.push(logItem);
}
function handleError(errorData = {}){
	
	let prunedScope = {};
	if(errorData.hasOwnProperty('scopeData')){
		for (name in this) {
			if(errorData.scopeData.hasOwnProperty(name) && name != 'global' && name != 'window' && name != 'document'){
				prunedScope[name] = errorData.scopeData[name];
			}
		}
		delete errorData.scopeData;
		errorData.scopeData = prunedScope;
	}
	
	log('\n\n\n----------------- ERROR! -----------------',true,'red');
	log(JSON.stringify(errorData,undefined,2),true);
	
	if(errorData.hasOwnProperty('error') && typeof errorData.error === 'object'){
		try{
			console.trace(errorData.error);
		}catch(ex){
			log('Unable to run trace on error propety of error object');
		}
	}
	errorLogEntries.push(JSON.stringify(errorData,undefined,2));
}
/**
* @Description Method that executes at the end of a script run. Writes to the log file. Exits the program.
*/
function finish() {
    log("Process completed. Writting " + logEntries.length + " log entries", true, "yellow");
	
;
	
    log("\r\n\r\n------------------------------------------------ ", false);
	
	writeFile('','log.txt',logEntries.join("\r\n"));
	writeFile('','errors.txt',errorLogEntries.join("\r\n"));
	
	let d = new Date();
    d.toLocaleString();

    log("Finished process at " + d, true)
	process.exit(1);
}

/**
 * @Description Method that executes on an uncaught error.
*/
process.on("uncaughtException", (err) => {
    log(err, true, "red");
	console.trace(err);
	finish();
});

init();