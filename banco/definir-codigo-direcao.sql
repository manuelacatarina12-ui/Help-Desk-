-- Define (ou troca) o código que a pessoa da Direção digita ao criar a conta.
-- 1) Troque TROQUE-POR-SEU-CODIGO por um código seu (use 12 ou mais caracteres,
--    misturando letras e números) e mantenha as aspas simples.
-- 2) Cole no SQL Editor do Supabase e clique em Run.
-- Para trocar o código depois, rode de novo com outro valor.
-- Contas da Direção que já existem continuam funcionando.

insert into public.config_seguranca (id, codigo_hash)
values (1, extensions.crypt('JoaoLopes2026', extensions.gen_salt('bf')))
on conflict (id) do update set codigo_hash = excluded.codigo_hash;
