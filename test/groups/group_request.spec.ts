import GroupRequest from 'App/Models/GroupRequest'
import { UserFactory } from 'Database/factories/index'
import Database from '@ioc:Adonis/Lucid/Database'
import { GroupFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'
import User from 'App/Models/User'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
let apiToken = ''
let user = {} as User

test.group('Group Request', (group) => {
  test('it should create a group request', async (assert) => {
    const { id } = await UserFactory.create()
    const group = await GroupFactory.merge({ master: id }).create()
    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .set({})
      .send({})
      .expect(201)

    assert.exists(body.groupRequest, 'GroupRequest undefined')
    assert.equal(body.groupRequest.userId, user.id)
    assert.equal(body.groupRequest.groupId, group.id)
    assert.equal(body.groupRequest.status, 'PENDING')
  })

  test('it should return 409 when  group request already exists', async (assert) => {
    const { id } = await UserFactory.create()
    const group = await GroupFactory.merge({ master: id }).create()

    await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .set({})
      .send({})
      .expect(409)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 409)
  })
  test('it should return 422 when  group request already in the group', async (assert) => {
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    // Master is added to group
    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${response.body.group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})
      .expect(422)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should list group requests by master', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    const response = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})
    const groupRequest = response.body.groupRequest
    const { body } = await supertest(BASE_URL)
      .get(`/groups/${group.id}/requests?master=${master.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groupRequests, 'GroupRequests undefined')
    assert.equal(body.groupRequests.length, 1)
    assert.equal(body.groupRequests[0].id, groupRequest.id)
    assert.equal(body.groupRequests[0].userId, groupRequest.userId)
    assert.equal(body.groupRequests[0].groupId, groupRequest.groupId)
    assert.equal(body.groupRequests[0].status, groupRequest.status)
    assert.equal(body.groupRequests[0].group.name, group.name)
    assert.equal(body.groupRequests[0].user.username, user.username)
    assert.equal(body.groupRequests[0].group.master, master.id)
  })

  test('it should return an empty list when master has no group requests', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    const { body } = await supertest(BASE_URL)
      .get(`/groups/${group.id}/requests?master=${user.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groupRequests, 'GroupRequests undefined')
    assert.equal(body.groupRequests.length, 0)
  })
  test('it should return 422 when master is not provided', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const { body } = await supertest(BASE_URL)
      .get(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(422)

    assert.exists(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should accept a group request', async (assert) => {
    const group = await GroupFactory.merge({ master: user.id }).create()

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    const response = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests/${body.groupRequest.id}/accept`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(response.body.groupRequest, 'GroupRequest undefined')
    assert.equal(response.body.groupRequest.userId, user.id)
    assert.equal(response.body.groupRequest.groupId, group.id)
    assert.equal(response.body.groupRequest.status, 'ACCEPTED')
    await group.load('players')
    assert.isNotEmpty(group.players)
    assert.equal(group.players.length, 1)
    assert.equal(group.players[0].id, user.id)
  })

  test('it should return 404 when providing an not existing group', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    const response = await supertest(BASE_URL)
      .post(`/groups/123/requests/${body.groupRequest.id}/accept`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(404)

    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 404)
  })
  test('it should return 404 when providing an not existing group request', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    const response = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests/123/accept`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(404)

    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 404)
  })

  test('it should reject a group request', async (assert) => {
    const group = await GroupFactory.merge({ master: user.id }).create()

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    await supertest(BASE_URL)
      .delete(`/groups/${group.id}/requests/${body.groupRequest.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    const groupRequest = await GroupRequest.find(body.groupRequest.id)
    assert.isNull(groupRequest)
  })

  test('it should return 404 when providing an unexisting group for rejection', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    const response = await supertest(BASE_URL)
      .delete(`/groups/123/requests/${body.groupRequest.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(404)

    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 404)
  })

  test('it should return 404 when providing an unexisting group request for rejection', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})

    const response = await supertest(BASE_URL)
      .delete(`/groups/${group.id}/requests/123`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(404)

    assert.equal(response.body.code, 'BAD_REQUEST')
    assert.equal(response.body.status, 404)
  })

  group.before(async () => {
    const plainPassword = 'test'
    const newUser = await UserFactory.merge({ password: plainPassword }).create()
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ email: newUser.email, password: plainPassword })
      .expect(201)

    apiToken = await response.body.token.token
    user = newUser
  })
  group.after(async () => {
    await supertest(BASE_URL).delete('/sessions').set('Authorization', `Bearer ${apiToken}`)
  })
  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })
  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
