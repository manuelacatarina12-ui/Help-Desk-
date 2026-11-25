# Configurar o banco de dados (Supabase) — passo a passo

O Supabase é gratuito para um projeto deste tamanho e guarda contas, senhas
(criptografadas) e chamados. O site continua no GitHub Pages.

1. Crie uma conta em https://supabase.com e clique em **New project**.
   Guarde a senha do banco que você definir (não é usada no site).
2. No menu **SQL Editor**, cole o conteúdo de `banco/schema.sql` e clique em **Run**.
3. Em **Authentication > Providers > Email**, **desligue "Confirm email"**
   (o site usa só nome de usuário; nenhum e-mail real é enviado).
4. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**
   e cole em `JS/config.js`. (Nunca use a chave `service_role`.)
5. Publique os arquivos no GitHub como de costume.
6. Defina o **código da Direção**: abra `banco/definir-codigo-direcao.sql`, troque
   `TROQUE-POR-SEU-CODIGO` por um código seu (12+ caracteres), cole no SQL Editor e
   clique em **Run**. Para trocar o código depois, rode de novo com outro valor.
7. Pronto: no site, em **Criar conta**, a pessoa escolhe **Direção (Administração)**
   e digita o código. O código é conferido pelo banco; se estiver errado, a conta
   não é criada. Passe o código só para quem for da Direção.

(Também continua possível promover alguém manualmente:
`update public.profiles set role = 'Direção' where username = 'usuario';`)

## O que o banco garante (mesmo se alguém mexer no site)
- Aluno/Professor só enxergam e editam os próprios chamados.
- Só a Direção vê todos, muda o status e exclui.
- A Direção não edita o texto de chamados de outras pessoas.
- Só cria conta de Direção quem souber o código (guardado criptografado, ilegível pelo site).
- Ninguém cria chamado em nome de outra pessoa nem altera o autor.

## Observações
- Chamados antigos que estavam só no navegador (LocalStorage) não são migrados.
- Se esquecerem a senha, redefina em **Authentication > Users** no Supabase
  (o e-mail de cada conta é `usuario@usuarios.helpdesk.app`).
