import Mail from '@ioc:Adonis/Addons/Mail'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class PasswordsController {
  public async forgotPassword({ request, response }: HttpContextContract) {
    const { email } = request.only(['email'])
    const teste = await Mail.send((message) => {
      message.from('hagleyson').to(email).subject('Roleplay: Recuperação de Senha.').text('okok')
    })
    console.log(teste)
    return response.noContent()
  }
}
