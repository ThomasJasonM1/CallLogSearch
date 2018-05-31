// External Variables
const countLinesInFile = require('count-lines-in-file');
const CsvReadableStream = require('csv-reader');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const moment = require('moment');
// var mysql = require('mysql');
// const dotenv = require('dotenv').load();

// Local Variables
const inputStream = fs.createReadStream('../Test Files/CallLogTestFile.csv', 'utf8');
const isSessionRow = []
const logList = ["Starting outdial", "setUpCall", "Dialing", "detectAnswer", "NO_USER_RESPONSE", "detectAnswer", "handleLiveAnswer", "playBcAudio", "Beep Detected", "handleVoicemail", "endCall", 
	"handleTooManyMenuPlays", "playMenu", "RECV DTMF", "handleHangup", "processHangupEvent", "handleCause", "handleCallEnd"]
const targetFilePath = path.resolve(__dirname, '../Test Files/CallLogTestFile.csv');
const writeStream = fs.createWriteStream('../results.csv');

function rowObject (_date, _time, _event, _eventResult, _guid, _sessionId) {
	this.date = _date + _time;
	this.guid = _guid;
	this.event = _event;
	this.eventData = _eventResult;
	// this.sessionId = _sessionId;
}

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
						var r = splittingValue[x].split(" ");
						var checkDate = moment(r[0]);
						//console.log(splittingValue);
						if (checkDate.isValid()) {
							if (splittingValue[x].includes("Starting outdial")) {
								var callStartTime = moment(r[1], "HH:mm:ss a");
								// console.log(`StartingR1: ${r[1]}`);
							}

							// console.log(`callStartTime: ${callStartTime}`);

							var currentCallTime = moment(r[1], "HH:mm:ss a");
							// console.log(`R1: ${r[1]}`);
							// console.log(`currentCallTime: ${currentCallTime}`);

							var duration = moment.duration(currentCallTime.diff(callStartTime));
							var hours = parseInt(duration.asHours());
							var minutes = parseInt(duration.asMinutes())%60;
							var seconds = parseInt(duration.asSeconds())%60;

							// console.log(`${hours + ":" + minutes + ":" + seconds}`)

							var callDuration = hours + ":" + minutes + ":" + seconds;

							//console.log(duration);

							writeStream.write(`${callDuration}, ${r[0]} ${r[1]}, ${r[5]}, ${r[6]}, ${r[7] || ''} ${r[8] || ''} ${r[9] || ''} ${r[10] || ''} ${r[11] || ''} ${r[12] || ''} ${r[13] || ''}\n`); 
							//new rowObject(result[0], result[1], result[5], result[6], result[7]);
							//console.log(rowObject[x]);
						} else {
							var currentCallTime = moment(r[2], "HH:mm:ss a");
							var duration = moment.duration(currentCallTime.diff(callStartTime));
							var hours = parseInt(duration.asHours());
							var minutes = parseInt(duration.asMinutes())%60;
							var seconds = parseInt(duration.asSeconds())%60;

							var callDuration = hours + ":" + minutes + ":" + seconds;

							writeStream.write(`${callDuration}, ${r[1]} ${r[2]}, ${r[0]}, ${r[4]}, ${r[7] || ''} ${r[7] || ''} ${r[8] || ''} ${r[9] || ''} ${r[10] || ''} ${r[11] || ''} ${r[12] || ''}\n`);
							//console.log(`SessionID: ${result[0]}`)
						}
						// var result = splittingValue[x].split(" ");
						// writeStream.write(`${result}\n`);
						// writeStream.write("\n");
					}
				}
			}+ 
			console.log(`Finished row ${i}`);
			writeStream.write(`Call ${i + 1}\n`);
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

