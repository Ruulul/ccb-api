'use strict';

module.exports = async function (fastify, opts) {
    fastify.get('/', function (request, response) {
        response.send()
    })
}
module.exports.autoPrefix = '/setores'