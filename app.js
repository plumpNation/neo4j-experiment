'use strict';

var Q = require('q'),
    neo4j = require('node-neo4j'), // the "normal" neo4j package didn't support labels
    program = require('commander'),
    uuid = require('uuid'),
    db = new neo4j('http://192.168.33.10:7474'),
    mapping = {},
    testData,

    createRandomData = function () {
        var userCount = randomInt(100, 200),
            teacherCount = Math.ceil(userCount / randomInt(15, 20)),
            groupCount = randomInt(2, 3),
            studentsPerGroup = Math.floor(userCount / (teacherCount * groupCount)) - randomInt(0, 2),
            data = {},
            school = {
                id: uuid.v4(),
                name: 'Test School'
            },
            temp,
            temp2,
            groupNum,
            i, j, k;

        data.School = [school];
        data.User = [];
        data.Group = [];

        for (i = 0; i < userCount; i++) {
            temp = {
                id: uuid.v4(),
                username: 'Student ' + i,
                schoolId: school.id,
                role: 'student'
            };
            data.User.push(temp);
        }

        for (i = 0; i < teacherCount; i++) {
            temp = {
                id: uuid.v4(),
                username: 'Teacher ' + i,
                schoolId: school.id,
                role: 'teacher'
            };
            data.User.push(temp);

            for (j = 0; j < groupCount; j++) {
                groupNum = (i * groupCount) + j;
                temp2 = {
                    id: uuid.v4(),
                    name: 'Group ' + groupNum,
                    users: [
                        temp.id
                    ]
                };

                for (k = 0; k < studentsPerGroup; k++) {
                    temp2.users.push(data.User[k + (studentsPerGroup * groupNum)].id);
                }

                data.Group.push(temp2);
            }
        }

        console.log('Created randomized data for: ' +
            userCount + ' users, ' +
            teacherCount + ' teachers, and ' +
            (teacherCount * groupCount) + ' groups');
        divider();

        return data;
    },

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

        if (program.index) {
            createIndex(program.index);
        }
    },

    /**
     * Get a random integer between two values (inclusive).
     *
     * @param {number} min Minimum value (inclusive)
     * @param {number} max Maximum value (inclusive)
     * @return {number}
     */
    randomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
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
    },

    /**
     * Write the relationships to the db.
     *
     * @param {array} relationships Relationships to write
     * @return {function}
     */
    writeRelationships = function (relationships) {
        var promises = [],
            i;

        return function () {
            for (i = 0; i < relationships.length; i++) {
                switch (relationships[i].type) {
                    case 'MEMBER':
                        promises.push(saveRelationship(
                            mapping['User'][relationships[i].from],
                            mapping['Group'][relationships[i].to],
                            relationships[i].type
                        ));
                        break;

                    case 'STUDENT':
                    case 'TEACHER':
                        promises.push(saveRelationship(
                            mapping['User'][relationships[i].from],
                            mapping['School'][relationships[i].to],
                            relationships[i].type
                        ));
                        break;
                }
            }

            return Q.all(promises).then(onSuccessfulRelationshipsWrite);
        }
    },

    /**
     * Write test data to the db.
     *
     * @param {object} data Data to write
     * @return {object} Promise
     */
    writeTestData = function (data) {
        var promises = [],
            relationships = [],
            type,
            entity,
            i,
            j;

        for (type in data) {
            for (i = 0; i < data[type].length; i++) {
                entity = data[type][i];

                switch (type) {
                    case 'Group':
                        promises.push(saveNode({
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
                        promises.push(saveNode({
                            id: entity.id,
                            name: entity.name
                        }, type));
                        break;

                    case 'User':
                        promises.push(saveNode({
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

        return Q.all(promises)
            .then(onSuccessfulNodesWrite)
            .then(writeRelationships(relationships));
    };

// Parse the CLI arguments
program
    .option('-d, --delete', 'Delete all data before inserting test data')
    .option('-r, --randomize', 'Use randomly generated data')
    .parse(process.argv);

// ------------------------------------------------------------------
divider();
console.log('Running neo4j experiment');
divider();
// ------------------------------------------------------------------

if (program.randomize) {
    testData = createRandomData();
} else {
    testData = require('./data.json');
}

if (program.delete) {
    deleteAllData().done(function () {
        writeTestData(testData);
    }, errorHandler);
} else {
    writeTestData(testData).done(function () {}, errorHandler);
}
