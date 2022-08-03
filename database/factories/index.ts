import User from 'App/Models/User'
import Factory from '@ioc:Adonis/Lucid/Factory'

export const UserFactory = Factory.define(User, () => ({
  username: 'Hagleyson',
  email: 'hag@gmail.com',
  password: '123456',
  avatar: 'http://www.google.com.br',
})).build()
