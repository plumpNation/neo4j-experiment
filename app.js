var Q = require('q'),
    neo4j = require('neo4j'),
    db = new neo4j.GraphDatabase('http://localhost:7474'),

    divider = function () {
      console.log('-----------------------------');
    },

    onSuccessfulWrite = function (node) {
      console.log('Node saved to database with id:', node.id);
      divider();
    },

    errorHandler = function (err) {
      console.error('Error saving new node to database:', err);
      divider();
    };

// ------------------------------------------------------------------
divider();
console.log('Running neo4j experiment');
divider();
// ------------------------------------------------------------------


// Create our first node

// instantaneous response, but not the persisted data
var node = db.createNode({hello: 'world'});
console.log(node);

divider();
// ------------------------------------------------------------------

// https://github.com/kriskowal/q/wiki/API-Reference
// nbind will allow you to use q.js promise syntax instead of the nodejs
// callback pattern i.e. function (err, data) {}
// It is well known not to be as performant as a plain callback.
var saveNodeToDb = Q.nbind(node.save, node);
saveNodeToDb().done(onSuccessfulWrite, errorHandler);
