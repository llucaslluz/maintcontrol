📑 Documento de Requisitos / Especificação Funcional

Projeto: Maint Control Voith
Versão: 2.0

1. Visão Geral (PRD/SRS)
1.1 Objetivo

O Maint Control Voith é um sistema web para gestão de chamados de manutenção industrial, com foco em reduzir o tempo de parada das máquinas, organizar atendimentos, registrar histórico e fornecer dashboards gerenciais em tempo real.

1.2 Escopo

Abertura e acompanhamento de chamados (usuários logados e visitantes).

Gestão de atendimentos técnicos (início, pausa, retorno, conclusão).

Controle de pendências.

Registro de anexos (fotos, vídeos, laudos).

Relatórios gerenciais (produtividade, falhas recorrentes, ranking de máquinas).

Dashboards segmentados por perfil.

Tela interativa de Mapa da Planta.

1.3 Perfis de Usuário

Operador – abre chamados, acompanha os seus.

Técnico – atende chamados, gera relatórios de manutenção.

Supervisor / ADM – gestão completa de usuários, máquinas, relatórios, auditoria.

Visitante – abre chamado sem login.

Dashboards (Operação / Manutenção) – visão compartilhada para terminais de fábrica.

2. Especificação Funcional (Telas)
2.1 Acesso e Abertura

Login (com chapa e senha) + opção para visitante.

Abertura de chamado visitante: formulário simples.

Abertura de chamado logado: dados do usuário preenchidos automaticamente.

2.2 Dashboards

Operador: só os próprios chamados.

Técnico: todos os chamados, com filtros e ações rápidas.

Supervisor/ADM: visão completa + botões de gestão e relatórios.

Operacional: visão restrita ao setor (chão de fábrica).

Manutenção: visão para técnicos em terminais.

2.3 Gestão (restrita a Supervisor/ADM)

Usuários, Locais, Máquinas/Dispositivos, Tipos de Manutenção, Permissões.

2.4 Relatórios e Auditoria

Relatórios estatísticos (tempo médio, ranking de falhas, técnicos mais ativos).

Histórico de auditoria (quem fez o quê, quando).

2.5 Perfil do Usuário

Atualização de dados básicos (telefone, email, senha, foto).

Dados fixos (nome, chapa, cargo, categoria).

2.6 Mapa da Planta

Máquinas Fixas: visão gráfica da planta.

Pontes/Pórticos: posições fixas.

Caldeiraria: blocos de equipamentos móveis.

Fábrica Elétrica: máquinas distribuídas no layout elétrico.

Filtros: status, local, tipo de equipamento.

Ações rápidas: ver detalhes, abrir chamado, histórico.

3. Regras de Negócio

Chamados

Visitante ou usuário pode abrir.

Status inicial: Aberto.

Status da máquina deve ser informado.

Atendimentos

Vários técnicos podem atender um chamado.

Registro de início, pausa, retorno, fim.

Fechamento

Técnico/Supervisor fecha com solução aplicada.

Pode gerar pendência.

Pendências

Ligadas ao chamado.

Criadas no fechamento ou durante atendimento.

Anexos

Visitante: só na abertura.

Técnico/Supervisor: a qualquer momento.

Operador: apenas visualiza.

Status da Máquina

Alterado na abertura ou no atendimento.

Histórico completo de alterações (quem/como/quando).

4. Modelo de Dados (MER Simplificado)

Usuário (id, nome, chapa, cpf, senha, cargo, categoria, ativo).

Categoria_Usuario (id, nome, descrição).

Local (id, nome, descrição).

Máquina/Dispositivo (id, nome, modelo, série, local, categoria).

Categoria_Máquina (fixa, ponte, caldeiraria, elétrica).

Chamado (id, descrição, prioridade, status_chamado, status_maquina, solicitante).

Atendimento (id, chamado, técnico, início, pausa, fim, andamento).

Pendência (id, chamado, descrição, status, criador, resolutor).

Anexo (id, chamado, arquivo, usuário_upload).

Histórico_Ação (id, chamado, usuário, tipo_ação, data).

Permissão / Categoria_Permissão (RBAC).

Status_Máquina (id, máquina, status, data, chamado, usuário).

5. Fluxos de Processo

Abertura de Chamado

Usuário/visitante → preenche dados → chamado criado → histórico atualizado.

Atendimento Técnico

Técnico assume → registra andamento → pausa/retorno → conclusão.

Fechamento

Solução registrada → chamado fechado → pendência opcional → histórico atualizado.

Relatórios

Supervisor/ADM gera relatórios filtrando por status, máquina, técnico, período.

Status de Máquina

Atualizado na abertura/atendimento → registrado no histórico de status.

6. RBAC / RLS

Operador: abre e consulta só seus chamados.

Técnico: atende todos os chamados, cria pendências, gera relatórios básicos.

Supervisor/ADM: gestão total (usuários, máquinas, auditoria, relatórios).

Visitante: apenas abre chamado externo.

Dashboards: visão compartilhada por setor.

RLS no banco (Supabase/Postgres):

Operador → só enxerga seus chamados.

Técnico → enxerga todos, mas só edita os seus atendimentos.

Supervisor/ADM → acesso total.

Visitante → apenas inserção.

7. Roadmap / Futuro

Notificações automáticas (e-mail/SMS).

Chat interno entre técnico e solicitante.

IA de suporte (soluções baseadas em histórico).

Integração IoT para manutenção preditiva.

Modo offline para áreas sem internet.

Reconhecimento de voz para abertura de chamados.
