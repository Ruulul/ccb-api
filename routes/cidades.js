'use strict';

module.exports = async function (fastify, opts) {
    fastify.get('/cidades', function (request, response) {
        response.send()
    })
}