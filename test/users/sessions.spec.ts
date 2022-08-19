import { DateTime, Duration } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import test from 'japa'
import supertest from 'supertest'
import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories/index'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
test.group('Password', (group) => {
  test('it should authenticate an user', async (assert) => {
    const plainPassword = 'test'
    const { id, email } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email, password: plainPassword })
      .expect(201)
    assert.isDefined(response.body.user, 'User undefined')
    assert.isDefined(response.body.user.id, String(id))
  })
  test('it should return an api token when session is created', async (assert) => {
    const plainPassword = 'test'
    const { id, email } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email, password: plainPassword })
      .expect(201)
    assert.isDefined(response.body.token, 'Token undefined')
    assert.isDefined(response.body.user.id, String(id))
  })

  test('it should return 400 when credentials are not provided', async (assert) => {
    const response = await supertest(BASE_URL).post('/sessions').send({}).expect(400)
    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 400)
  })
  test('it should return 400 when credentials are invalid', async (assert) => {
    const { email } = await UserFactory.create()
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .send({
        email,
        password: 'lalalalal',
      })
      .expect(400)
    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 400)
  })

  test('it should return 200 when user sings out', async () => {
    const plainPassword = 'test'
    const { email } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email, password: plainPassword })
      .expect(201)
    const apiToken = response.body.token
    await supertest(BASE_URL)
      .delete('/sessions')
      .set('Authorization', `Bearer ${apiToken.token}`)
      .expect(200)
  })
  test('it should revoke token when user sings out', async (assert) => {
    const plainPassword = 'test'
    const { email } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email, password: plainPassword })
      .expect(201)

    const apiToken = await response.body.token

    await supertest(BASE_URL)
      .delete('/sessions')
      .set('Authorization', `Bearer ${apiToken.token}`)
      .expect(200)

    const token = await Database.query().select('*').from('api_tokens')
  })

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
