var Q = require('q'),
    neo4j = require('node-neo4j'), // the "normal" neo4j package didn't support labels
    program = require('commander'),
    db = new neo4j('http://192.168.33.10:7474'),
    testData = require('./data.json'),
    mapping = {},
    nodePromises = [],
    relationships = [],
    relationshipPromises = [],
    entity,
    i, j,

    /**
     * Print out a nice divider.
     */
    divider = function () {
        console.log('-----------------------------');
    },

    /**
     * Delete all data from the db.
     *
     * @return {object} Promise
     */
    deleteAllData = function () {
        var defer = Q.nbind(db.cypherQuery, db);

        return defer('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r')
            .then(function (results) {
                console.log('Deleted all data');
                divider();
            });
    },

    /**
     * Generic error handler for promises.
     *
     * @param {object} err Error
     */
    errorHandler = function (err) {
        console.error('Error saving new node to database:', err);
        divider();
    },

    /**
     * Callback for when all the nodes were saved.
     *
     * @param {array} nodes Saved node data
     */
    onSuccessfulNodesWrite = function (nodes) {
        nodes = nodes.map(function (n) {
            return n._id;
        });

        console.log('Nodes saved to database:', nodes);
        divider();

        for (i = 0; i < relationships.length; i++) {
            switch (relationships[i].type) {
                case 'MEMBER':
                    relationshipPromises.push(saveRelationship(
                        mapping['User'][relationships[i].from],
                        mapping['Group'][relationships[i].to],
                        relationships[i].type
                    ));
                    break;

                case 'STUDENT':
                case 'TEACHER':
                    relationshipPromises.push(saveRelationship(
                        mapping['User'][relationships[i].from],
                        mapping['School'][relationships[i].to],
                        relationships[i].type
                    ));
                    break;
            }
        }

        Q.all(relationshipPromises).done(onSuccessfulRelationshipsWrite, errorHandler);
    },

    /**
     * Callback for when the relationships were saved.
     *
     * @param {array} rels Saved relationship data
     */
    onSuccessfulRelationshipsWrite = function (rels) {
        rels = rels.map(function (r) {
            return r._type;
        });

        console.log('Relationships saved to database:', rels);
        divider();
    },

    /**
     * Helper method to save a node.
     *
     * @param {object} node Data to save
     * @param {string} type Type (label) of the node
     * @return {object} Promise
     */
    saveNode = function (node, type) {
        var saveNodeToDb = Q.nbind(db.insertNode, db);
        return saveNodeToDb(node, [type])
            .then(function (node) {
                if (!mapping[type]) {
                    mapping[type] = {};
                }

                mapping[type][node.id] = node._id;
                return Q(node);
            });
    },

    /**
     * Helper method to save a relationship.
     *
     * @param {string} from ID of the node the edge goes from
     * @param {string} from ID of the node the edge goes to
     * @param {string} type Type of the relationship
     * @return {object} Promise
     */
    saveRelationship = function (from, to, type) {
        var saveRelToDb = Q.nbind(db.insertRelationship, db);
        return saveRelToDb(from, to, type, {});
    }

    /**
     * Write test data to the db.
     *
     * @param {object} data Data to write
     */
    writeTestData = function (data) {
        for (type in data) {
            for (i = 0; i < data[type].length; i++) {
                entity = data[type][i];

                switch (type) {
                    case 'Group':
                        nodePromises.push(saveNode({
                            id: entity.id,
                            name: entity.name
                        }, type));

                        for (j = 0; j < entity.users.length; j++) {
                            relationships.push({
                                type: 'MEMBER',
                                from: entity.users[j],
                                to: entity.id
                            });
                        }

                        break;

                    case 'School':
                        nodePromises.push(saveNode({
                            id: entity.id,
                            name: entity.name
                        }, type));
                        break;

                    case 'User':
                        nodePromises.push(saveNode({
                            id: entity.id,
                            username: entity.username
                        }, type));

                        relationships.push({
                            type: entity.role === 'teacher' ? 'TEACHER' : 'STUDENT',
                            from: entity.id,
                            to: entity.schoolId
                        });

                        break;
                }
            }
        }

        Q.all(nodePromises).done(onSuccessfulNodesWrite, errorHandler);
    };

// Parse the CLI arguments
program
    .option('-d, --delete', 'Delete all data before inserting test data')
    .parse(process.argv);

// ------------------------------------------------------------------
divider();
console.log('Running neo4j experiment');
divider();
// ------------------------------------------------------------------

if (program.delete) {
    deleteAllData()
        .done(function () {
            writeTestData(testData);
        }, errorHandler);
} else {
    writeTestData(testData);
}
