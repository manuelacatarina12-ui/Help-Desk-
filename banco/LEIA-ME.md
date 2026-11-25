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
6. Crie sua conta no site e, no **SQL Editor**, torne-a Direção:

   ```sql
   update public.profiles set role = 'Direção' where username = 'seu_usuario';
   ```

   Repita para cada pessoa da Direção. Pelo site, ninguém consegue se
   cadastrar como Direção nem mudar o próprio perfil.

## O que o banco garante (mesmo se alguém mexer no site)
- Aluno/Professor só enxergam e editam os próprios chamados.
- Só a Direção vê todos, muda o status e exclui.
- A Direção não edita o texto de chamados de outras pessoas.
- Ninguém cria chamado em nome de outra pessoa nem altera o autor.

## Observações
- Chamados antigos que estavam só no navegador (LocalStorage) não são migrados.
- Se esquecerem a senha, redefina em **Authentication > Users** no Supabase
  (o e-mail de cada conta é `usuario@usuarios.helpdesk.app`).
