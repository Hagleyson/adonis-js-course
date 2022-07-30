import test from 'japa'
import supertest from 'supertest'
import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories/index'
import Mail from '@ioc:Adonis/Addons/Mail'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
test.group('Password', (group) => {
  test.only('it should send and email with forgot password instructions', async (assert) => {
    const user = await UserFactory.create()
    Mail.trap((message) => {
      assert.equal(message.subject, 'Roleplay: Recuperação de Senha.')
    })
    await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: user.email,
        resetPasswordUrl: '',
      })
      .expect(204)
    Mail.restore()
  })

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
