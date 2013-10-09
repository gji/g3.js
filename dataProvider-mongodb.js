// Retrieve
var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    BSON = require('mongodb').BSONPure,
    Code = require('mongodb').Code,
    mongo = require('mongodb');

DataProvider = function(host, port) {
    dataTable = 'dataTable';
    db = null;
    that = this;

    // Connect to the db
    MongoClient.connect("mongodb://localhost:27017/data", function(err, db) {
	if(!err) {
	    console.log("We are connected");
	    db.createCollection(dataTable, function(err, collection) {
	    });
	    that.db = db;
	}
    });


    this.fetchAllData = function(cb) {
	this.db.collection(dataTable, function(error, data) {
	    if (error) {
		cb(error, null);
	    } else {
		data.find().toArray(function(error, results) {
		    cb(error, results);
		});
	    }
	});
    };

    this.fetchDataById = function(id, cb) {
	this.db.collection(dataTable, function(error, data) {
	    if (error) {
		cb(error, null);
	    } else {
		data.findOne({
		    _id:new BSON.ObjectID(id)
		}, function(error, result) {
		    cb(error, result);
		});
	    }
	});
    };

    this.fetchDataLast = function(last, cb) {
	this.db.collection(dataTable, function(error, data) {
	    if (error) {
		cb(error, null);
	    } else {
		console.log(last);
		data.find().sort({time: -1}).limit(parseInt(last)).toArray(function(error, result) {
		    cb(error, result.reverse());
		});
	    }
	});
    }
    this.fetchDataAfterTime = function(last, cb) {
	this.db.collection(dataTable, function(error, data) {
	    if (error) {
		cb(error, null);
	    } else {
		data.find({time: {$gt:new mongo.Double(last)}}).toArray(function(error, result) {
		    cb(error, result);
		});
	    }
	});
    }

    this.insertData = function(dataEl, cb) {
	dataEl._id = new BSON.ObjectID();
	console.log('Inserting:' + JSON.stringify(dataEl));
	this.db.collection(dataTable, function(error, data) {
	    if (error) {
		cb(error, null);
	    } else {
		data.insert([dataEl], function() {
		    cb(null, dataEl);
		});
	    }
	});
    };

    this.updateData = function(dataEl, cb) {
	console.log('Updating:' + JSON.stringify(dataEl));
	this.db.collection(dataTable, function(error, data) {
	    if (error) {
		cb(error, null);
	    } else {
		data.update({_id:new BSON.ObjectID(dataEl._id)}, 
		    {time:dataEl.time, data:dataEl.data}, 
		    function(error, result) {
			cb(error, result);
		    });
	    }
	});
    };

    this.deleteData = function(id, cb) {
	console.log('Deleting id of:' + id);
	this.db.collection(dataTable, function(error, data) {
	    if (error) {
		cb(error, null);
	    } else {
		data.remove({_id:new BSON.ObjectID(id)}, 
		    function(error, result) {
			cb(error, result);
		    });
	    }
	});
    };
};

exports.DataProvider = DataProvider;
