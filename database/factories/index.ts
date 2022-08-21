import Group from 'App/Models/Group'
import User from 'App/Models/User'
import Factory from '@ioc:Adonis/Lucid/Factory'

export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    avatar: faker.internet.password(),
  }
}).build()

export const GroupFactory = Factory.define(Group, ({ faker }) => {
  return {
    name: faker.name.findName(),
    description: faker.lorem.paragraph(),
    schedule: faker.date.weekday(),
    location: faker.internet.url(),
    chronic: faker.internet.url(),
  }
}).build()
