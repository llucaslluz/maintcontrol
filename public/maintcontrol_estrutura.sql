
-- MaintControl - Estrutura de Banco de Dados (PostgreSQL + Supabase)
-- Todas as tabelas usam UUID como chave primária

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE categoria_usuario (
    id_categoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_categoria VARCHAR(100) NOT NULL,
    descricao_categoria TEXT
);

CREATE TABLE permissao (
    id_permissao UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_permissao VARCHAR(100) UNIQUE NOT NULL,
    descricao_permissao TEXT
);

CREATE TABLE categoria_permissao (
    id_categoria UUID REFERENCES categoria_usuario(id_categoria) ON DELETE CASCADE,
    id_permissao UUID REFERENCES permissao(id_permissao) ON DELETE CASCADE,
    PRIMARY KEY (id_categoria, id_permissao)
);

CREATE TABLE usuario (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapa VARCHAR(50) UNIQUE,
    cpf VARCHAR(14) UNIQUE,
    email VARCHAR(255) UNIQUE,
    id_categoria UUID REFERENCES categoria_usuario(id_categoria),
    nome VARCHAR(255),
    senha VARCHAR(255),
    cargo VARCHAR(100),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMPTZ DEFAULT now(),
    ultimo_acesso TIMESTAMPTZ
);

CREATE TABLE local (
    id_local UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_local VARCHAR(100),
    descricao_local TEXT
);

CREATE TABLE categoria_maquina (
    id_categoria_maquina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_categoria VARCHAR(100),
    descricao_categoria TEXT
);

CREATE TABLE maquina_dispositivo (
    id_maquina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_serie VARCHAR(100) UNIQUE,
    id_local UUID REFERENCES local(id_local),
    nome_maquina VARCHAR(255),
    descricao_maquina TEXT,
    modelo VARCHAR(100),
    status VARCHAR(50),
    id_categoria_maquina UUID REFERENCES categoria_maquina(id_categoria_maquina)
);

CREATE TABLE tipo_manutencao (
    id_tipo_manutencao UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_tipo VARCHAR(100),
    descricao_tipo TEXT
);

CREATE TABLE chamado (
    id_chamado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_solicitante UUID REFERENCES usuario(id_usuario),
    id_local UUID REFERENCES local(id_local),
    id_maquina UUID REFERENCES maquina_dispositivo(id_maquina),
    id_tipo_manutencao UUID REFERENCES tipo_manutencao(id_tipo_manutencao),
    data_hora_abertura TIMESTAMPTZ DEFAULT now(),
    descricao_problema TEXT,
    prioridade VARCHAR(20),
    status_chamado VARCHAR(50) DEFAULT 'Aberto',
    data_hora_fechamento TIMESTAMPTZ,
    solucao_aplicada TEXT,
    nome_solicitante_externo VARCHAR(255),
    chapa_solicitante_externo VARCHAR(50),
    categoria_solicitante_externo VARCHAR(100),
    observacao_fechamento TEXT,
    status_maquina VARCHAR(50),
    emergencia BOOLEAN DEFAULT FALSE
);

CREATE TABLE status_maquina (
    id_status UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_maquina UUID REFERENCES maquina_dispositivo(id_maquina),
    id_chamado UUID REFERENCES chamado(id_chamado),
    id_usuario UUID REFERENCES usuario(id_usuario),
    status VARCHAR(50),
    data_status TIMESTAMPTZ
);

CREATE TABLE atendimento_chamado (
    id_atendimento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_chamado UUID REFERENCES chamado(id_chamado),
    id_tecnico UUID REFERENCES usuario(id_usuario),
    hora_inicio_atendimento TIMESTAMPTZ,
    hora_fim_atendimento TIMESTAMPTZ,
    hora_pausa TIMESTAMPTZ,
    hora_retorno TIMESTAMPTZ,
    descricao_andamento TEXT
);

CREATE TABLE pendencia (
    id_pendencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao_pendencia TEXT,
    data_criacao TIMESTAMPTZ DEFAULT now(),
    status_pendencia VARCHAR(20) DEFAULT 'Aberta',
    data_resolucao TIMESTAMPTZ,
    id_chamado UUID REFERENCES chamado(id_chamado),
    id_usuario_criador UUID REFERENCES usuario(id_usuario),
    id_usuario_resolutor UUID REFERENCES usuario(id_usuario)
);

CREATE TABLE anexo (
    id_anexo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario_upload UUID REFERENCES usuario(id_usuario),
    id_chamado UUID REFERENCES chamado(id_chamado),
    nome_arquivo VARCHAR(255),
    tipo_arquivo VARCHAR(100),
    caminho_armazenamento TEXT,
    data_hora_upload TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE historico_acao (
    id_historico UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_acao VARCHAR(100),
    descricao_acao TEXT,
    data_hora_acao TIMESTAMPTZ DEFAULT now(),
    id_usuario UUID REFERENCES usuario(id_usuario),
    id_chamado UUID REFERENCES chamado(id_chamado)
);
