'use strict';

module.exports = async function (fastify, opts) {
    fastify.get('/', async function () {
        const connection = await fastify.mysql.getConnection()
        const [agenda] = await connection.query('select texto, setor.nome from agenda, setor where setor.id = agenda.setor_id order by agenda.setor_id')
        const [mensagem] = await connection.query('select * from `Mensagem`')
        connection.release()
        return { agenda, mensagem }
    })
}
module.exports.autoPrefix = '/agenda'