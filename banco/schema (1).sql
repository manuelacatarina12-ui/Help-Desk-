-- =====================================================================
-- HelpDesk Escolar - banco de dados e regras de segurança (Supabase)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- As regras abaixo valem NO SERVIDOR: mesmo que alguém mexa no site pelo
-- navegador, o banco recusa o que o perfil não pode fazer.
-- =====================================================================

-- Função de criptografia (já vem no Supabase; garante que existe).
create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabelas ----------

create table if not exists public.profiles (
    id        uuid primary key references auth.users (id) on delete cascade,
    username  text not null unique,
    role      text not null default 'Aluno'
              check (role in ('Aluno', 'Professor', 'Direção')),
    created_at timestamptz not null default now()
);

create table if not exists public.chamados (
    id         bigint generated always as identity primary key,
    autor_id   uuid not null default auth.uid() references public.profiles (id),
    setor      text not null check (length(btrim(setor)) between 1 and 200),
    prioridade text not null check (prioridade in ('Baixa', 'Média', 'Alta')),
    descricao  text not null check (length(btrim(descricao)) between 1 and 2000),
    status     text not null default 'Aberto'
               check (status in ('Aberto', 'Em andamento', 'Resolvido')),
    created_at timestamptz not null default now()
);

-- Guarda (criptografado) o código exigido para criar conta da Direção.
-- Os usuários do site NÃO conseguem ler esta tabela.
create table if not exists public.config_seguranca (
    id          int primary key default 1 check (id = 1),
    codigo_hash text
);

create index if not exists chamados_autor_idx on public.chamados (autor_id);

-- ---------- Funções auxiliares ----------

-- A Direção é identificada pelo perfil guardado no banco, nunca por algo
-- que o navegador envie. "security definer" evita recursão nas regras.
create or replace function public.is_direcao()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'Direção'
    );
$$;

-- Ao criar uma conta, cria o perfil automaticamente.
--   Aluno e Professor: livres.
--   Direção: só se o código informado bater com o guardado em
--            config_seguranca; se estiver errado (ou ainda não definido),
--            a conta NÃO é criada.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    perfil        text := new.raw_user_meta_data ->> 'role';
    codigo_enviado text := new.raw_user_meta_data ->> 'codigo';
    hash_guardado text;
begin
    if perfil = 'Direção' then
        select codigo_hash into hash_guardado
        from public.config_seguranca where id = 1;

        if hash_guardado is null
           or codigo_enviado is null
           or crypt(codigo_enviado, hash_guardado) <> hash_guardado then
            raise exception 'Código da Direção incorreto.';
        end if;
    elsif perfil is distinct from 'Professor' then
        perfil := 'Aluno';
    end if;

    insert into public.profiles (id, username, role)
    values (new.id, lower(new.raw_user_meta_data ->> 'username'), perfil);

    -- Não deixa o código digitado guardado na conta.
    begin
        update auth.users
        set raw_user_meta_data = raw_user_meta_data - 'codigo'
        where id = new.id;
    exception when others then
        null;
    end;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Regras de quais CAMPOS cada perfil pode alterar num chamado.
create or replace function public.chamados_proteger_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Só o banco/administrador (sem usuário logado) escapa destas regras.
    if auth.uid() is null then
        return new;
    end if;

    -- Estes campos nunca mudam.
    if new.id <> old.id
       or new.autor_id <> old.autor_id
       or new.created_at <> old.created_at then
        raise exception 'Esses campos não podem ser alterados.';
    end if;

    -- Status: só a Direção.
    if new.status <> old.status and not public.is_direcao() then
        raise exception 'Somente a Direção pode mudar o status.';
    end if;

    -- Conteúdo: só o autor (a Direção não edita chamado de outra pessoa).
    if (new.setor <> old.setor
        or new.prioridade <> old.prioridade
        or new.descricao <> old.descricao)
       and old.autor_id <> auth.uid() then
        raise exception 'Você só pode editar os seus próprios chamados.';
    end if;

    return new;
end;
$$;

drop trigger if exists chamados_proteger_update on public.chamados;
create trigger chamados_proteger_update
    before update on public.chamados
    for each row execute function public.chamados_proteger_update();

-- ---------- Permissões de tabela ----------

revoke all on public.profiles from anon, authenticated;
revoke all on public.chamados from anon, authenticated;
revoke all on public.config_seguranca from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.chamados to authenticated;

-- ---------- Row Level Security (quem enxerga/mexe em cada linha) ----------

alter table public.profiles enable row level security;
alter table public.chamados enable row level security;
alter table public.config_seguranca enable row level security;  -- sem regras: ninguém lê pelo site

-- Perfis: cada um vê o próprio; a Direção vê todos. Ninguém altera pelo site.
drop policy if exists "perfis_select" on public.profiles;
create policy "perfis_select" on public.profiles
    for select to authenticated
    using (id = auth.uid() or public.is_direcao());

-- Chamados: Aluno/Professor veem só os seus; Direção vê todos.
drop policy if exists "chamados_select" on public.chamados;
create policy "chamados_select" on public.chamados
    for select to authenticated
    using (autor_id = auth.uid() or public.is_direcao());

-- Criar: só em nome de si mesmo e sempre começando como "Aberto".
drop policy if exists "chamados_insert" on public.chamados;
create policy "chamados_insert" on public.chamados
    for insert to authenticated
    with check (autor_id = auth.uid() and status = 'Aberto');

-- Alterar: o autor (conteúdo) ou a Direção (status). Os campos permitidos
-- para cada um são garantidos pelo gatilho acima.
drop policy if exists "chamados_update" on public.chamados;
create policy "chamados_update" on public.chamados
    for update to authenticated
    using (autor_id = auth.uid() or public.is_direcao())
    with check (autor_id = auth.uid() or public.is_direcao());

-- Excluir: só a Direção.
drop policy if exists "chamados_delete" on public.chamados;
create policy "chamados_delete" on public.chamados
    for delete to authenticated
    using (public.is_direcao());

-- =====================================================================
-- DEFINIR O CÓDIGO DA DIREÇÃO
-- Rode UMA vez o arquivo banco/definir-codigo-direcao.sql (veja o LEIA-ME).
-- Enquanto nenhum código for definido, ninguém consegue criar conta de Direção.
-- =====================================================================
