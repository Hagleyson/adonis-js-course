import User from 'App/Models/User'
import Mail from '@ioc:Adonis/Addons/Mail'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class PasswordsController {
  public async forgotPassword({ request, response }: HttpContextContract) {
    const { email, resetPasswordUrl } = request.only(['email', 'resetPasswordUrl'])
    const user = await User.findByOrFail('email', email)

    await Mail.send((message) => {
      message
        .from('hagleyson')
        .to(email)
        .subject('Roleplay: Recuperação de Senha.')
        .htmlView('email/forgotpassword', {
          productName: 'Roleplay',
          name: user.username,
          resetPasswordUrl: resetPasswordUrl,
        })
    })

    return response.noContent()
  }
}
