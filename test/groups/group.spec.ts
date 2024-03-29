import Group from 'App/Models/Group'
import { GroupFactory, UserFactory } from 'Database/factories/index'
import Database from '@ioc:Adonis/Lucid/Database'
import test from 'japa'
import supertest from 'supertest'
import User from 'App/Models/User'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`
let apiToken = ''
let user = {} as User

test.group('Group', (group) => {
  test('it should create a group', async (assert) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)

    assert.exists(body.group, 'Group undefined')
    assert.equal(body.group.name, groupPayload.name)
    assert.equal(body.group.description, groupPayload.description)
    assert.equal(body.group.schedule, groupPayload.schedule)
    assert.equal(body.group.location, groupPayload.location)
    assert.equal(body.group.chronic, groupPayload.chronic)
    assert.equal(body.group.master, groupPayload.master)
    assert.exists(body.group.players, 'Players undefined')
    assert.equal(body.group.players.length, 1)
    assert.equal(body.group.players[0].id, groupPayload.master)
  })

  test('it should return 422 when required data is not provided', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})
      .expect(422)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('it should update a group', async (assert) => {
    const group = await GroupFactory.merge({ master: user.id }).create()
    const payload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
    }
    const { body } = await supertest(BASE_URL)
      .patch(`/groups/${group.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(payload)
      .expect(200)

    assert.exists(body.group, 'Group undefined')
    assert.equal(body.group.name, payload.name)
    assert.equal(body.group.description, payload.description)
    assert.equal(body.group.schedule, payload.schedule)
    assert.equal(body.group.location, payload.location)
    assert.equal(body.group.chronic, payload.chronic)
  })

  test('it should return 404 when providing an unexisting group for update', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    const payload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
    }
    const { body } = await supertest(BASE_URL)
      .patch(`/groups/`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(payload)
      .expect(404)
  })

  test('it should remove user from group', async (assert) => {
    const group = await GroupFactory.merge({ master: user.id }).create()

    const plainPassword = 'test'
    const newUser = await UserFactory.merge({ password: plainPassword }).create()
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email: newUser.email, password: plainPassword })

    const playerToken = await response.body.token.token

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})

    await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests/${body.groupRequest.id}/accept`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    await supertest(BASE_URL)
      .delete(`/groups/${group.id}/players/${newUser.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    await group.load('players')

    assert.isEmpty(group.players)
  })

  test('it should not remove the master of the group', async (assert) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)

    const group = body.group

    await supertest(BASE_URL)
      .delete(`/groups/${group.id}/players/${user.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(400)

    const groupModel = await Group.findOrFail(group.id)
    await groupModel.load('players')

    assert.isNotEmpty(groupModel.players)
  })

  test('it should remove the group', async (assert) => {
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)

    const group = body.group

    await supertest(BASE_URL)
      .delete(`/groups/${group.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})
      .expect(200)

    const emptyGroup = await Database.query().from('groups').where('id', group.id)

    assert.isEmpty(emptyGroup)
    const players = await Database.query().from('groups_users')

    assert.isEmpty(players)
  })
  test('it should return 404 when providing an unexisting group for deletion', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .delete('/groups/1')
      .set('Authorization', `Bearer ${apiToken}`)
      .send({})
      .expect(404)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 404)
  })

  test('it should return all groups when no query is provided to list groups', async (assert) => {
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groups, 'Groups undefined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)
    assert.exists(body.groups.data[0].masterUser, 'Master undefined')
    assert.equal(body.groups.data[0].masterUser.id, user.id)
    assert.equal(body.groups.data[0].masterUser.username, user.username)
    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, user.id)
    assert.equal(body.groups.data[0].players[0].email, user.email)
    assert.equal(body.groups.data[0].players[0].username, user.username)
  })

  test('it should return no groups by user id', async (assert) => {
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)

    const { body } = await supertest(BASE_URL)
      .get('/groups?user=123')
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groups, 'Groups undefined')
    assert.equal(body.groups.data.length, 0)
  })

  test('it should return all groups by userId', async (assert) => {
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    const response = await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${user.id}`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groups, 'Groups undefined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)
    assert.exists(body.groups.data[0].masterUser, 'Master undefined')
    assert.equal(body.groups.data[0].masterUser.id, user.id)
    assert.equal(body.groups.data[0].masterUser.username, user.username)
    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, user.id)
    assert.equal(body.groups.data[0].players[0].email, user.email)
    assert.equal(body.groups.data[0].players[0].username, user.username)
  })

  test('it should return all groups by userId and name', async (assert) => {
    const groupPayload = {
      name: 'teste',
      description: 'teste',
      schedule: 'teste',
      location: 'teste',
      chronic: 'teste',
      master: user.id,
    }
    const response = await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)
    await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ ...groupPayload, name: '123', description: '123' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${user.id}&text=es`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groups, 'Groups undefined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)
    assert.exists(body.groups.data[0].masterUser, 'Master undefined')
    assert.equal(body.groups.data[0].masterUser.id, user.id)
    assert.equal(body.groups.data[0].masterUser.username, user.username)
    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, user.id)
    assert.equal(body.groups.data[0].players[0].email, user.email)
    assert.equal(body.groups.data[0].players[0].username, user.username)
  })

  test('it should return all groups by userId and description', async (assert) => {
    const groupPayload = {
      name: '123',
      description: 'teste',
      schedule: 'fffdd',
      location: 'ddd',
      chronic: 'ddd',
      master: user.id,
    }
    const response = await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)
    await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ ...groupPayload, name: '123', description: '123' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${user.id}&text=es`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groups, 'Groups undefined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)
    assert.exists(body.groups.data[0].masterUser, 'Master undefined')
    assert.equal(body.groups.data[0].masterUser.id, user.id)
    assert.equal(body.groups.data[0].masterUser.username, user.username)
    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, user.id)
    assert.equal(body.groups.data[0].players[0].email, user.email)
    assert.equal(body.groups.data[0].players[0].username, user.username)
  })

  test('it should return all groups by name', async (assert) => {
    const groupPayload = {
      name: 'teste',
      description: '123',
      schedule: 'fffdd',
      location: 'ddd',
      chronic: 'ddd',
      master: user.id,
    }
    const response = await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)
    await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ ...groupPayload, name: '123', description: '123' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?text=es`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groups, 'Groups undefined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)
    assert.exists(body.groups.data[0].masterUser, 'Master undefined')
    assert.equal(body.groups.data[0].masterUser.id, user.id)
    assert.equal(body.groups.data[0].masterUser.username, user.username)
    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, user.id)
    assert.equal(body.groups.data[0].players[0].email, user.email)
    assert.equal(body.groups.data[0].players[0].username, user.username)
  })
  test('it should return all groups by name', async (assert) => {
    const groupPayload = {
      name: '123',
      description: 'teste',
      schedule: 'fffdd',
      location: 'ddd',
      chronic: 'ddd',
      master: user.id,
    }
    const response = await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(groupPayload)
      .expect(201)
    await supertest(BASE_URL)
      .post(`/groups`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send({ ...groupPayload, name: '123', description: '123' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?text=es`)
      .set('Authorization', `Bearer ${apiToken}`)
      .expect(200)

    assert.exists(body.groups, 'Groups undefined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)
    assert.exists(body.groups.data[0].masterUser, 'Master undefined')
    assert.equal(body.groups.data[0].masterUser.id, user.id)
    assert.equal(body.groups.data[0].masterUser.username, user.username)
    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, user.id)
    assert.equal(body.groups.data[0].players[0].email, user.email)
    assert.equal(body.groups.data[0].players[0].username, user.username)
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
