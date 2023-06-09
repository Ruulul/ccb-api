'use strict';

const select_all_musicos = `
select 
    pessoa.nome as nome_pessoa, pessoa.ID as id_pessoa,
    cidade.nome as nome_cidade, cidade.id as id_cidade,
    estado.nome as nome_estado, estado.id as id_estado,
    setor.nome as nome_setor, setor.id as id_setor,
    pessoa.Status as status, 
    familia.nome as nome_familia, familia.id as id_familia,
    instrumento.nome as nome_instrumento, instrumento.id as id_instrumento
from 
    pessoa, cidade, estado, familia, instrumento, regiao, setor 
where 
    pessoa.id_instrumento = instrumento.id 
and pessoa.id_setor = setor.id 
and setor.id_cidade = cidade.id 
and instrumento.id_familia = familia.id 
and cidade.id_estado = estado.id
`
const select_musicos = `
select 
    pessoa.id as id, 
    pessoa.nome as nome_pessoa, 
    instrumento.nome as nome_instrumento, 
    setor.nome as setor, 
    pessoa.telefone as telefone, 
    pessoa.email as email, 
    pessoa.status as status
from pessoa, instrumento, setor,cidade 
where 
    pessoa.id_setor = setor.id 
and setor.id_cidade = cidade.id
and pessoa.id_instrumento = instrumento.id
`
const count_musicos = `
SELECT
  SUM(CASE WHEN familia.id = 1 THEN 1 ELSE 0 END) as cordas,
  SUM(CASE WHEN familia.id = 2 THEN 1 ELSE 0 END) as madeira,
  SUM(CASE WHEN familia.id = 3 THEN 1 ELSE 0 END) as metais,
  SUM(CASE WHEN pessoa.id_instrumento = 25 THEN 1 ELSE 0 END) as organistas,
  COUNT(DISTINCT pessoa.id) as musicos
FROM pessoa
JOIN setor ON pessoa.id_setor = setor.id
JOIN cidade ON setor.id_cidade = cidade.id
JOIN instrumento ON pessoa.id_instrumento = instrumento.id
JOIN familia ON instrumento.id_familia = familia.id
`
const count_musicos_setor = `
SELECT 
  COUNT(CASE WHEN instrumento.id_familia = 1 THEN pessoa.id END) AS cordas,
  COUNT(CASE WHEN instrumento.id_familia = 3 THEN pessoa.id END) AS metais,
  COUNT(pessoa.id) AS musicos,
  COUNT(CASE WHEN instrumento.id_familia = 2 THEN pessoa.id END) AS madeira,
  COUNT(CASE WHEN instrumento.id = 25 THEN pessoa.id END) AS organistas
FROM pessoa
JOIN instrumento ON pessoa.id_instrumento = instrumento.id
JOIN setor ON pessoa.id_setor = setor.id AND setor.id = ?
`
const no_alunos = ' pessoa.Status != 0 '
const filtra = Object.freeze(
    {
        cidade: ' cidade.id = ? ',
        setor: ' setor.id = ? ',
        regiao: ' regiao.id = ? ',
    }
)
module.exports = async function (fastify, opts) {
    fastify.get('/', {
        schema: {
            query: {
                type: 'object',
                properties: {
                    filtro: {
                        type: 'string',
                        enum: ['cidade', 'setor', 'regiao'],
                    },
                    param: { type: 'number' }
                }
            }
        }
    }, async function (request, reply) {
        const { query } = request
        const include_alunos = 'alunos' in query
        const filtro = query.filtro
        const param = query.param

        const connection = await fastify.mysql.getConnection()

        if (!filtro && !param) {
            const [musicos] = await connection.query(select_all_musicos + (!include_alunos ? 'and' + no_alunos : ''))
            connection.release()
            return musicos
        }
        else if (filtro && param) {
            const is_setor = filtro === 'setor'
            const built_count_query =
                (is_setor
                    ? count_musicos_setor
                    + (!include_alunos ? 'where' + no_alunos : '')
                    : count_musicos
                    + 'where' + filtra[filtro]
                    + (!include_alunos ? 'and' + no_alunos : '')
                )
            const built_musicos_query =
                select_musicos
                + 'and' + filtra[filtro]
                + (!include_alunos ? 'and' + no_alunos : '')
            const [[[count]], [musicos]] = await Promise.all(
                [
                    connection.query(built_count_query, [param]),
                    connection.query(built_musicos_query, [param]),
                ]
            )
            connection.release()
            return { count, musicos }
        }
        else {
            reply.code(400)
            return reply.send()
        }
    })
    fastify.get('/:id', async function (req, reply) {
        let musico_id
        try {
            musico_id = parseInt(req.params.id)
        } catch {
            reply.code(400)
            return
        }
        const connection = await fastify.mysql.getConnection()
        const [musico] = await connection.query(`
            SELECT 
                p.id, 
                p.Nome, 
                p.Status, 
                p.id_instrumento, 
                p.id_setor, 
                p.telefone,
                i.nome AS instrumento_nome,
                s.nome AS setor_nome
            FROM pessoa p
            INNER JOIN instrumento i ON p.id_instrumento = i.id
            INNER JOIN setor s ON p.id_setor = s.id
            WHERE p.id = ?;`, [musico_id])
        connection.release()
        return musico
    })
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['nome', 'email', 'telefone', 'status', 'instrumento', 'setor'],
                properties: {
                    nome: { type: 'string' },
                    email: { type: 'string' },
                    telefone: { type: 'string' },
                    status: { type: 'number' },
                    instrumento: { type: 'number' },
                    setor: { type: 'number' },
                }
            }
        }
    }, async function (req, reply) {
        const { body: { nome, email, telefone, status, instrumento, setor } } = req
        const connection = await fastify.mysql.getConnection()
        await connection.query(
            'insert into pessoa(nome, status, id_instrumento, id_setor, email, telefone) values (?, ?, ?, ?, ?, ?);',
            [nome, status, instrumento, setor, email, telefone],
        )
        connection.release()
        return [{ Message: "Músico registrado com sucesso" }]
    })
    fastify.put('/', {
        schema: {
            body: {
                type: 'object',
                required: ['nome', 'email', 'telefone', 'status', 'instrumento', 'setor', 'id'],
                properties: {
                    nome: { type: 'string' },
                    email: { type: 'string' },
                    telefone: { type: 'string' },
                    status: { type: 'number' },
                    instrumento: { type: 'number' },
                    setor: { type: 'number' },
                    id: { type: 'number' },
                }
            }
        }
    }, async function (req, reply) {
        const { body: { nome, status, instrumento, setor, email, telefone, id } } = req
        const connection = fastify.mysql.getConnection()
        await connection.query(
            'update pessoa set nome=?, status=?, id_instrumento=?, id_setor=?, email=?, telefone=? where id=?;',
            [nome, status, instrumento, setor, email, telefone, id]
        )
        connection.release()
        return [{ Message: "Músico atualizado com sucesso" }]
    })
    fastify.delete('/', {
        schema: {
            body: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: {
                        type: 'number'
                    }
                }
            }
        }
    }, async function (req, reply) {
        const { body: { id } } = req
        const connection = fastify.mysql.getConnection()
        await connection.query('delete from pessoa where id=?;', [id])
        connection.release()
        return [{ Message: 'Músico deletado com sucesso' }]
    })
}
module.exports.autoPrefix = '/musicos'