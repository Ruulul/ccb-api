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
        setor: ' ',
        regiao: ' regiao.id = ? ',
    }
)
const filtros_validos = Object.freeze(['cidade', 'setor', 'regiao'])
module.exports = async function (fastify, opts) {
    fastify.get('/musicos', async function (request, reply) {
        const { query } = request
        const include_alunos = 'alunos' in query
        const filtro = query.filtro
        const param = query.param
        
        if (filtro && !filtros_validos.includes(filtro)) {
            reply.code(400)
            return
        }
        
        const connection = await fastify.mysql.getConnection()

        if (include_alunos && !filtro && ! param) {
            const [musicos] = await connection.query(select_all_musicos)
            connection.release()
            return musicos
        }
        else if (filtro && param) {
            const built_query = 
                (filtro === 'setor' 
                    ? count_musicos_setor 
                    : count_musicos
                ) + 
                'where' + 
                filtra[filtro] + 
                (!include_alunos ? 'and' + no_alunos : '')
            const [musicos] = await connection.query(built_query, parseInt(param))
            connection.release()
            return musicos
        }
        else {
            reply.code(400)
            return
        }
    })
    fastify.get('/musicos/:id', async function (req, reply) {
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
            WHERE p.id = ?`, musico_id)
        return musico
    })
    fastify.post('/musicos', function (request, response) {
        response.send()
    })
}