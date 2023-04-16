'use strict';

module.exports = async function (fastify, opts) {
    fastify.get('/instrumentos', function (request, response) {
        response.send()
    })
}