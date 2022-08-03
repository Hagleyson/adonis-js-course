import { DateTime, Duration } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import test from 'japa'
import supertest from 'supertest'
import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories/index'
// import Mail from '@ioc:Adonis/Addons/Mail'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
test.group('Password', (group) => {
  test('it should send and email with forgot password instructions', async (assert) => {
    const user = await UserFactory.create()
    // Mail.trap((message) => {
    //   assert.deepEqual(message.from, { address: 'hagleyson' })
    //   assert.deepEqual(message.to, [{ address: user.email }])
    //   assert.equal(message.subject, 'Roleplay: Recuperação de Senha.')
    //   assert.include(message.html!, user.username)
    // })
    await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: user.email,
        resetPasswordUrl: 'url',
      })
      .expect(204)
    // Mail.restore()
  })

  test('it should create a reset password token', async (assert) => {
    const user = await UserFactory.create()

    await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: user.email,
        resetPasswordUrl: 'url',
      })
      .expect(204)
    const tokens = await user.related('tokens').query()
    console.log('tokens: ', tokens)
    assert.isNotEmpty(tokens)
  })

  test('it should return 422 when required data is not provided or data is invalid', async (assert) => {
    const user = await UserFactory.create()

    const { body } = await supertest(BASE_URL).post('/forgot-password').send({}).expect(422)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should be to reset password', async (assert) => {
    const user = await UserFactory.create()
    await user.related('tokens').create({ token: 'token' })
    await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token: 'token', password: '123456' })
      .expect(204)
    await user.refresh()

    const checkPassword = await Hash.verify(user.password, '123456')
    assert.isTrue(checkPassword)
  })
  test('it should return 422 when required data is not provided or data is invalid', async (assert) => {
    const user = await UserFactory.create()

    const { body } = await supertest(BASE_URL).post('/reset-password').send({}).expect(422)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should return 404 when using the same token twice', async (assert) => {
    const user = await UserFactory.create()
    await user.related('tokens').create({ token: 'token' })

    await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token: 'token', password: '123456' })
      .expect(204)

    const { body } = await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token: 'token', password: '123456' })
      .expect(404)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 404)
  })

  test.only('it cannot reset password when token is expired after 2 hours', async (assert) => {
    const user = await UserFactory.create()
    const date = DateTime.now().minus(Duration.fromISOTime('02:01'))
    await user.related('tokens').create({ token: 'token', createdAt: date })
    const { body } = await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token: 'token', password: '123456' })
      .expect(410)
    assert.equal(body.code, 'TOKEN_EXPIRED')
    assert.equal(body.status, 410)
  })

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
