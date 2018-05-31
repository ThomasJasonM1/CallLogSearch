// External Variables
const countLinesInFile = require('count-lines-in-file');
const CsvReadableStream = require('csv-reader');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
// var mysql = require('mysql');
// const dotenv = require('dotenv').load();

// Local Variables
const inputStream = fs.createReadStream('../Test Files/CallLogTestFile.csv', 'utf8');
const logList = ["Dialing", "NO_USER_RESPONSE", "detectAnswer", "handleLiveAnswer", "playBcAudio", "endCall", "handleTooManyMenuPlays", "handleCause"]
const targetFilePath = path.resolve(__dirname, '../Test Files/CallLogTestFile.csv');
const writeStream = fs.createWriteStream('../results.csv');

// Counts the number of rows in my file so I can loop through
function getData() {
	return new Promise(function(resolve, reject){
		countLinesInFile(targetFilePath, (Error, number) => {
			resolve(number);

		});
	});
}

// Each time this is called, it will exdcute a grep for incoming data
function runCommand(i) {
	return new Promise(function(resolve, reject) {
		var byteCounterStart=  i == 0 ? 0 : (i * 103); // Calculates what is the working row based on bytes
		var byteCounterEnd = byteCounterStart + 101; // Each row is 101 bytes
		var inputStream = 
			fs.createReadStream('../Test Files/CallLogTestFile.csv', {encoding: 'utf8', start: byteCounterStart, end: byteCounterEnd});

		inputStream
		    .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
		    .on('data', function (column) {
		    	exec('zgrep -i \'' + column[0] + '\' ../../../../Volumes/NASSHARE/SIPLogs/' + column[1] + '*', 
		    		(error, stdout, stderr) => {
						if (error) {
							console.error(`exec error: ${error}`);
							return;
						}
						resolve(stdout);
				});	
    	})
	})
}

function printToFile(data, i) {
	if (!i) {i = 0};
	if (i <= data) {
		runCommand(i).then( function (value){
			i++;
			var splittingValue = value.split("\n");
			for (x in splittingValue) {
				for (y in logList) {
					if (splittingValue[x].includes(logList[y])) {
						var result = splittingValue[x].split(" ");
						writeStream.write(`${result}\n`);
						writeStream.write("\n");
					}
				}
			}
			console.log(`Finished row ${i}`);
			if (i <= data) {
				printToFile(data, i);
			}
		}).catch(function (error){
			console.log(error);

		})
	}
	return;
}

getData()
	.then(printToFile);

