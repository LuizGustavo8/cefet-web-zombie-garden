import express from 'express'
import db from'../db.js'
const router = express.Router()


/* GET lista de pessoas. */
router.get('/', async (req, res, next) => {

  try {
    const [people] = await db.execute({
      sql: 'SELECT * FROM person LEFT OUTER JOIN zombie ON eatenBy = zombie.id',
  
      // nestTables resolve conflitos de haver campos com mesmo nome nas tabelas
      // nas quais fizemos JOIN (neste caso, `person` e `zombie`).
      // descrição: https://github.com/felixge/node-mysql#joins-with-overlapping-column-names
      nestTables: true
    })


    // Exercício 3: negociação de conteúdo para esta resposta
    //
    // Assim como em `routes/zombies.js`, usamos `res.format(...)` para
    // responder de acordo com o cabeçalho "Accept" da requisição:
    // - em HTML: renderiza a view de listagem de pessoas, passando como
    //   contexto de dados:
    //     - people: array de `person`s do banco de dados
    //     - success: mensagem de sucesso, caso exista (ex.: após excluir
    //       ou cadastrar uma pessoa)
    //     - error: idem para mensagem de erro
    // - em JSON: devolve apenas o array de pessoas

    // lemos as mensagens flash uma única vez (o .flash lê E limpa a mensagem)
    const success = req.flash('success')
    const error = req.flash('error')

    res.format({
      html: () => res.render('list-people', { people, success, error }),
      json: () => res.json({ people })
    })

  } catch (error) {
    console.error(error)
    error.friendlyMessage = 'Problema ao recuperar pessoas'
    next(error)
  }
})


/* PUT altera pessoa para morta por um certo zumbi */
router.put('/eaten/', async (req, res, next) => {
  const zombieId = req.body.zombie
  const personId = req.body.person

  if (!zombieId || !personId) {
    req.flash('error', 'Nenhum id de pessoa ou zumbi foi passado!')
    res.redirect('/')
    return;
  }

  try {
    const [result] = await db.execute(`UPDATE person 
                                       SET alive=false, eatenBy=?
                                       WHERE id=?`,
                                      [zombieId, personId])
    if (result.affectedRows !== 1) {
      req.flash('error', 'Não há pessoa para ser comida.')
    } else {
      req.flash('success', 'A pessoa foi inteiramente (não apenas cérebro) engolida.')
    }
    
  } catch (error) {
    req.flash('error', `Erro desconhecido. Descrição: ${error}`)

  } finally {
    res.redirect('/')
  }

})


/* GET formulario de registro de nova pessoa */
router.get('/new/', (req, res) => {
  res.render('new-person', {
    success: req.flash('success'),
    error: req.flash('error')
  })
})


/* POST registra uma nova pessoa */
// Exercício 1: IMPLEMENTADO AQUI
// O formulário em `views/new-person.hbs` faz POST para "/people/" e envia
// o campo `name`. Como este roteador é montado no prefixo "/people"
// (veja `app.js`), a rota para "/people/" é definida aqui como "/".
//
// Recuperamos o nome com req.body.name (POST -> req.body, e NÃO req.params),
// fazemos o INSERT e redirecionamos para a listagem de pessoas.
router.post('/', async (req, res, next) => {
  const name = req.body.name

  // validação simples: não cadastra ninguém sem nome
  if (!name || name.trim() === '') {
    req.flash('error', 'É preciso informar um nome para cadastrar a pessoa.')
    res.redirect('/people')
    return;
  }

  try {
    // `alive` tem DEFAULT 1 e `eatenBy` é NULL por padrão (veja a migration),
    // então basta inserir o nome.
    const [result] = await db.execute(
      'INSERT INTO person (name) VALUES (?)',
      [name.trim()]
    )

    if (!result || result.affectedRows < 1) {
      req.flash('error', 'Não foi possível cadastrar a pessoa.')
    } else {
      req.flash('success', `Bem-vindo(a) ao jardim, ${name.trim()}! (por enquanto, vivo)`)
    }

  } catch (error) {
    console.error(error)
    req.flash('error', `Erro ao cadastrar a pessoa. Descrição: ${error.message}`)

  } finally {
    res.redirect('/people')
  }
})


/* DELETE uma pessoa */
// Exercício 2: IMPLEMENTADO AQUI
// O link em `views/list-people.hbs` aponta para
// "/people/:id?_method=DELETE". O middleware method-override (veja `app.js`)
// transforma esse GET em uma requisição DELETE para "/people/:id".
//
// O id vem da rota, então usamos req.params.id, fazemos o DELETE e
// redirecionamos para a listagem de pessoas.
router.delete('/:id', async (req, res, next) => {
  const personId = req.params.id

  try {
    const [result] = await db.execute(
      'DELETE FROM person WHERE id=?',
      [personId]
    )

    if (!result || result.affectedRows < 1) {
      req.flash('error', `Não há pessoa com id ${personId} para excluir.`)
    } else {
      req.flash('success', 'Pessoa excluída do jardim com sucesso.')
    }

  } catch (error) {
    console.error(error)
    req.flash('error', `Erro ao excluir a pessoa. Descrição: ${error.message}`)

  } finally {
    res.redirect('/people')
  }
})


export default router