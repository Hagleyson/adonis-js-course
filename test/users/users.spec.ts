import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
test.group('Users', (): void => {
  test.only('it should create an user', async (assert) => {
    const userPayload = {
      email: 'teste123@teste.com',
      username: 'testando',
      password: 'dev123',
      avatar: 'teste123456789',
    }
    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(201)
    assert.exists(body.user, 'User Undefined')
    assert.exists(body.user.id, 'User Undefined')
    assert.equal(body.user.email, userPayload.email)
    assert.equal(body.user.username, userPayload.username)
    assert.equal(body.user.password, userPayload.password)
    assert.equal(body.user.avatar, userPayload.avatar)
  })
})
