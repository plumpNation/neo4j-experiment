var Q = require('q'),
    neo4j = require('node-neo4j'),
    db = new neo4j('http://192.168.33.10:7474'),
    data = require('./data.json'),
    mapping = {},
    nodePromises = [],
    relationships = [],
    relationshipPromises = [],
    entity,
    i, j,

    divider = function () {
        console.log('-----------------------------');
    },

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

    onSuccessfulRelationshipsWrite = function (rels) {
        rels = rels.map(function (r) {
            return r._type;
        });

        console.log('Relationships saved to database:', rels);
        divider();
    },

    errorHandler = function (err) {
        console.error('Error saving new node to database:', err);
        divider();
    },

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
    }

    saveRelationship = function (from, to, type) {
        var saveRelToDb = Q.nbind(db.insertRelationship, db);
        return saveRelToDb(from, to, type, {});
    };

// ------------------------------------------------------------------
divider();
console.log('Running neo4j experiment');
divider();
// ------------------------------------------------------------------

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
