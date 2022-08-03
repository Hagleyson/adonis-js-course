import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import User from 'App/Models/User'
import CreateUserValidator from 'App/Validators/CreateUserValidator'
import UpdateUserValidator from 'App/Validators/UpdateUserValidator'

export default class UsersController {
  public async store({ request, response }: HttpContextContract) {
    const userPayload = await request.validate(CreateUserValidator)

    //findBy => 1 name property, 2 value
    const userName = await User.findBy('username', userPayload.username)
    if (userName) {
      throw new BadRequest('username already in use', 409)
    }

    const userByEmail = await User.findBy('email', userPayload.email)

    if (userByEmail) {
      throw new BadRequest('email already in use', 409)
    }

    const user = await User.create(userPayload)
    return response.created({ user })
  }

  public async update({ request, response }: HttpContextContract) {
    const { email, password, avatar } = await request.validate(UpdateUserValidator)
    const id = request.param('id')
    const user = await User.findOrFail(id)

    user.email = email
    if (avatar) user.avatar = avatar
    user.password = password

    await user.save()
    return response.ok({ user })
  }
}
