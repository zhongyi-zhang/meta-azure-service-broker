var submatrix = ['storage', 'servicebus', 'docdb', 'sqldb', 'mysqldb', 'rediscache'];

var testMatrix = [];

submatrix.forEach(function(name) {
    testMatrix = testMatrix.concat(require('./submatrix/' + name));
});

module.exports = testMatrix;
