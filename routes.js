const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const crypto = require('crypto');
const fs = require('fs');
const ObjectId = require('mongodb').ObjectId; 

const app = express();
const routes = express.Router();

routes.route('/mongofinesse').get((req,res)=>{

	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("test");
		var obj = { 
			id: "STE001",
			date: "2020 4 21",
			entries:[{
				jobCode: "710560",
				activityCode: "71125",
				rate: 3,
				hrs: 4,
				premiums:{}
			},
			{
				jobCode: "710560",
				activityCode: "71125",
				rate: 4,
				hrs: 2,
				premiums:{
					"SHIFT PREMIUM": 3
				}
			}]
		};
		dbo.collection("timecards").insertOne(obj, function(err, res) {
	  		if (err) throw err;
	  		console.log("1 document inserted");
  		});
	});
	res.json();

});

routes.route('/').get((req,res)=>{
	res.send('hello world');
});

routes.route('/workerRegister').post((req,res)=>{
	var name = req['query']['name'];
	var id = req['query']['id'];
	var pass = req['query']['password'];
	var timecode = req['query']['timecode'];
	var employeeType = req['query']['employeeType'];
	var workUnit = req['query']['workUnit'];
	var department = req['query']['department'];

	const hash = crypto.createHash('sha256').update(pass).digest('base64');

	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
	  	if (err) throw err;
	  	var dbo = db.db("test");
	  	var myobj = { 
	  		name: name, 
	  		ID: id, 
	  		password: hash,
	  		timecode: timecode, 
	  		employeeType: employeeType, 
	  		workUnit: workUnit, 
	  		department: department,  
	  		schedule:[] 
	  	};
	  	dbo.collection("workerAccounts").insertOne(myobj, function(err, res) {
	  		if (err) throw err;
	  		console.log("1 document inserted");
  		});
	});
})

routes.route('/managerRegister').post((req,res)=>{
	var name = req['query']['name'];
	var id = req['query']['id'];
	var pass = req['query']['password'];

	const hash = crypto.createHash('sha256').update(pass).digest('base64');

	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
	  	if (err) throw err;
	  	var dbo = db.db("test");
	  	var myobj = { 
	  		name: name, 
	  		ID: id, 
	  		password: hash
	  	};
	  	dbo.collection("managerAccounts").insertOne(myobj, function(err, res) {
	  		if (err) throw err;
	  		console.log("1 document inserted");
  		});
	});
})

//if auth = true, authenticated
//if auth = false, failed
routes.route('/workerLogIn').get((req,res)=>{
	var id = req['query']['id'];
	var pass = req['query']['password'];
	const hash = crypto.createHash('sha256').update(pass).digest('base64');
	var auth = "false";
	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("test");
	  dbo.collection("workerAccounts").find({}).toArray(function(err, result) {
	    if (err){ 
	    	res.json({"status":"fail"});
	    	throw err;
	    	return;
	    }
	    for(var i = 0; i<result.length; i++){
	    	if(result[i]['ID']==id&&result[i]['password']==hash){
	    		auth = "true"
	    	}
	    }
	    db.close();
		res.json({auth:auth});
	  });
	});
})

routes.route('/managerLogIn').get((req,res)=>{
	var id = req['query']['id'];
	var pass = req['query']['password'];
	const hash = crypto.createHash('sha256').update(pass).digest('base64');
	var auth = "false";
	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("test");
	  dbo.collection("managerAccounts").find({}).toArray(function(err, result) {
	    if (err){ 
	    	res.json({"status":"fail"});
	    	throw err;
	    	return;
	    }
	    for(var i = 0; i<result.length; i++){
	    	if(result[i]['ID']==id&&result[i]['password']==hash){
	    		auth = "true"
	    	}
	    }
	    db.close();
		res.json({auth:auth});
	  });
	});
})

routes.route('/managerGetTasks').get((req,res)=>{
	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("test");
	  dbo.collection("tasks").find({}).toArray(function(err, result) {
	    if (err){ 
	    	res.json({status: 'error'});
	    	throw err;
	    }
	    res.json(result);
	    db.close();
	  });
	});
	
});

routes.route('/assignTask').post((req,res)=>{
	var notes = req['query']['notes'];
	var manager = req['query']['managerID'];
	var worker = req['query']['workerID'];
	var taskID = new ObjectId(req['query']['id']);

	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("test");
		var myquery = {_id:taskID};
		var newvalues = { $set: {managerAssigned: manager, workerAssigned: worker, notes: notes } };
		dbo.collection("tasks").updateOne(myquery, newvalues, function(err, res) {
			if (err) throw err;
			db.close();
		});
	});
	res.json();
})

routes.route('/employeeGetTasks').get((req,res)=>{
	var worker = req['query']['workerID'];

	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("test");
	  var query = {workerAssigned: worker};
	  dbo.collection("tasks").find(query).toArray(function(err, result) {
	    if (err){ 
	    	res.json({status: 'error'});
	    	throw err;
	    }
	    return res.json(result);
	    db.close();
	  });
	});
});

routes.route('/getPossibleActivities').get((req,res)=>{
	var loc = req['query']['loc'];

	let rawdata = fs.readFileSync('locationActivityCode.json');
	let data = JSON.parse(rawdata);

	res.json(data[loc]);
});

routes.route('/completeTask').post((req,res)=>{
	//fill in a new entry
	var worker = req['query']['id'];
	var d = new Date();
	var date = d.getFullYear()+" "+(d.getMonth()+1)+" "+d.getDate();

	var jobCode = req['query']['jobCode'];
	var activityCode = req['query']['activityCode'];
	var rate = req['query']['rate'];
	var hrs = req['query']['hrs'];
	var overtime = req['query']['overtime'];
	var timeCode = req['query']['timeCode'];
	var premiums = req['query']['premiums'];
	var memo = req['query']['memo'];
	var equipement = req['query']['equipement'];

	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("test");
	  var query = { id: worker, date: date};
	  //see if one already exists
	  dbo.collection("timecards").find(query).toArray(function(err, result) {
	    if (err){ 
	    	res.json({"status":"fail"});
	    	throw err;
	    	return;
	    }
	    var entries;
	    if(result.length==0){
	      //doesnt exist, add timecard
	      var myobj = { id: worker, date: date, validated: "False", flagged: "False",entries:[] };
		  dbo.collection("timecards").insertOne(myobj, function(err, res) {
		    if (err) throw err;
		    console.log("1 document inserted");
	  	  	entries = [];
	  	  	//insert entry
		    insertEntry(memo, worker, date, db, entries, jobCode, activityCode, rate, hrs, overtime, timeCode, premiums);
	  	  });
	    }else{
	    	//exists, just insert entry
	    	entries = result[0]['entries'];
	    	insertEntry(memo, worker, date, db, entries, jobCode, activityCode, rate, hrs, overtime, timeCode, premiums);
	    	db.close();
	    }
	  });
	});
});

function insertEntry(memo, worker, date, db, entries, jobCode, activityCode, rate, hrs, overtime, timeCode, premiums){
	var dbo = db.db("test");
	var query = {id: worker, date: date};
    entries.push({
    	jobCode: jobCode,
    	activityCode: activityCode,
    	rate: rate,
    	hrs: hrs,
    	overtime: overtime,
    	timeCode: timeCode,
    	premiums: premiums,
    	memo: memo
    });
	var newvalues = { $set: {entries: entries } };
	dbo.collection("timecards").updateOne(query, newvalues, function(err, res) {
	  if (err) throw err;
	  db.close();
	});
}

routes.route('/validateTimecard').post((req,res)=>{
	var timecard = new ObjectId(req['query']['id']);
	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("test");
		var myquery = {_id:timecard};
		var newvalues = { $set: {validated: "True"} };
		dbo.collection("timecards").updateOne(myquery, newvalues, function(err, res) {
			if (err) throw err;
			db.close();
		});
	});
	res.json();
});

routes.route('/getPersonInfo').get((req,res)=>{
	var id = req['query']['id'];
	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("test");
		dbo.collection("workerAccounts").find({ID:id}).toArray(function(err, result) {
		    if (err){ 
		    	res.json({"status":"fail"});
		    	throw err;
		    	return;
		    }
		    if(result.length>0){
		    	result[0]['role']="employee";
		    	delete result[0]['password'];
		    	db.close();
		    	return res.json(result[0]);
		    }
		});
		dbo.collection("managerAccounts").find({ID:id}).toArray(function(err, result) {
		    if (err){ 
		    	res.json({"status":"fail"});
		    	throw err;
		    	return;
		    }
		    if(result.length>0){
		    	delete result[0]['password'];
		    	result[0]['role']="manager";
		    	db.close();
		    	return res.json(result[0]);
		    }
		});
	});
});

routes.route('/getTimecards').get((req,res)=>{
	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("test");
		dbo.collection("timecards").find({}).toArray(function(err, result) {
		    if (err){ 
		    	res.json({"status":"fail"});
		    	throw err;
		    	return;
		    }
		    return res.json(result);
		});
	});
});

routes.route('/getCSV').get((req,res)=>{
	var timesheetInfo = [];
	//employee name, id, type, date, hours, job code, 
	//activity code, time code, memo

	var d = new Date();
	var date = d.getFullYear()+" "+(d.getMonth()+1)+" "+d.getDate();

	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("test");
		dbo.collection("timecards").find({}).toArray(function(err, result) {
		    if (err){ 
		    	res.json({"status":"fail"});
		    	throw err;
		    	return;
		    }
		    dbo.collection("workerAccounts").find({}).toArray(function(err, ppl) {
		    	if (err){ 
			    	res.json({"status":"fail"});
			    	throw err;
			    	return;
			    }
			    for(var i = 0; i<result.length; i++){
			    	var timecard = result[i];
	    			var employee = ppl[getpersonindex(timecard['id'],ppl)];
			    	for(var u = 0; u<timecard['entries'].length; u++){
			    		var entry = timecard['entries'][u];
			    		var row = {
			    			EmployeeName: employee['name'],
		    				EmployeeID: employee['ID'],
		    				EmployeeType: employee['employeeType'],
		    				Date: timecard['date'],
		    				JobCode: entry['jobCode'],
		    				ActivityCode: entry['activityCode'],
		    				Hours: entry['hrs'],
		    				Timecode: employee['timecode'],
		    				Memo: entry['memo'] 
			    		};
			    		timesheetInfo.push(row);
			    		for(var prem in entry['premiums']){
			    			
			    			row = {
				    			EmployeeName: employee['name'],
			    				EmployeeID: employee['ID'],
			    				EmployeeType: employee['employeeType'],
			    				Date: timecard['date'],
			    				JobCode: entry['jobCode'],
			    				ActivityCode: entry['activityCode'],
			    				Hours: entry['premiums']['prem'],
			    				Timecode: premTimecode(employee['timecode'],prem),
			    				Memo: entry['memo'] 
				    		};
				    		timesheetInfo.push(row);
			    		}

			    	

			    	}
			    	
			    }

				res.json(timesheetInfo);

		    });
		});
	});
});

function getpersonindex(employeeid, ppl){
	for (var i = 0; i<ppl.length; i++){
		if (ppl[i]['ID']==employeeid){
			return i;
		}
	}
}

function premTimecode(employeecode, premtype){
	let rawdata = fs.readFileSync('premtimecodes.json');
	let data = JSON.parse(rawdata);
	return data[premtype][employeecode];
}

routes.route('/getAllEmployees').get((req,res)=>{
	MongoClient.connect(process.env.MONGO_URL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("test");
		dbo.collection("workerAccounts").find({}).toArray(function(err, result) {
			res.json(result);
			db.close();
		});
	});
});

module.exports = routes;

