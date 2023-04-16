'use strict';

module.exports = async function (fastify, opts) {
    fastify.get('/cidades', async function (req) {
        const connection = await fastify.mysql.getConnection()
        const [cidades] = await connection.query("SELECT * FROM `cidade` where id_estado=?", req.query.estado || '1')
        connection.release()
        return cidades
    })
}