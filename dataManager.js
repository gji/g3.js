var mongoServer = 'localhost';
var mongoPort = 27017;

DataManager = function(app) {
  var DataProvider = require('./dataProvider-mongodb').DataProvider;
  var dataProvider = new DataProvider(mongoServer, mongoPort);

  app.get('/data', function(req, res) {
    dataProvider.fetchAllData(function(error, data) {
      res.send(data);
    });
  });

  app.post('/data', function(req, res) {
    dataProvider.insertData(req.body, function(error, data) {
      if (error) {
        res.send(error, 500);
      } else {
        res.send(data);
      }
    });
  });

  app.get('/data/:id', function(req, res) {
    dataProvider.fetchDataById(req.params.id, function(error, data) {
      if (data == null) {
        res.send(error, 404);
      } else {
        res.send(data);
      }
    });
  });

  app.get('/data/time/after/:time', function(req, res) {
    console.log("got time request for: " + req.params.time);
    dataProvider.fetchDataAfterTime(req.params.time, function(error, data) {
      if (data == null) {
        res.send(error, 404);
      } else {
        res.send(data);
      }
    });
  });

  app.get('/data/last/:num', function(req, res) {
    console.log("got last request for: " + req.params.num);
    dataProvider.fetchDataLast(req.params.num, function(error, data) {
      if (data == null) {
        res.send(error, 404);
      } else {
        res.send(data);
      }
    });
  });

  app.post('/data/:id', function(req, res) {
    var _data = req.body;
    _data._id = req.params.id;

    dataProvider.updateData(_data, function(error, data) {
      if (error) {
        res.send(error, 404);
      } else {
        res.send('');
      }
    });
  });

  app.delete('/data/:id', function(req, res) {
    dataProvider.deleteData(req.params.id, function(error, data) {
      if (error) {
        res.send(error, 404);
      } else {
        res.send('');
      }
    });
  });
};

exports.DataManager = DataManager;
