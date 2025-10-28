# 📑 Maint Control Voith  
**Versão:** 2.0  

- Site: https://www.maintcontrol.com.br/
- Login para navegar: "8016913"
- Senha: "01234567890"

---

## 1. Visão Geral

### 🎯 Objetivo  
O **Maint Control Voith** é um sistema web para **gestão de chamados de manutenção industrial**, com foco em reduzir o tempo de parada das máquinas, organizar atendimentos, registrar histórico e fornecer dashboards gerenciais em tempo real.

### 📌 Escopo  
- Abertura e acompanhamento de chamados (usuários logados e visitantes).  
- Gestão de atendimentos técnicos (início, pausa, retorno, conclusão).  
- Controle de pendências.  
- Registro de anexos (fotos, vídeos, laudos).  
- Relatórios gerenciais (produtividade, falhas recorrentes, ranking de máquinas).  
- Dashboards segmentados por perfil.  
- Tela interativa de **Mapa da Planta**.  

### 👥 Perfis de Usuário  
- **Operador** – abre chamados, acompanha os seus.  
- **Técnico** – atende chamados, gera relatórios de manutenção.  
- **Supervisor / ADM** – gestão completa de usuários, máquinas, relatórios, auditoria.  
- **Visitante** – abre chamado sem login.  
- **Dashboards (Operação / Manutenção)** – visão compartilhada para terminais de fábrica.  

---

## 2. Especificação Funcional

### 🔑 Acesso e Abertura  
- Login (chapa e senha) + opção para visitante.  
- Abertura de chamado visitante: formulário simples.  
- Abertura de chamado logado: dados do usuário preenchidos automaticamente.  

### 📊 Dashboards  
- **Operador**: apenas seus chamados.  
- **Técnico**: todos os chamados com filtros e ações rápidas.  
- **Supervisor/ADM**: visão completa + botões de gestão e relatórios.  
- **Operacional**: visão restrita ao setor (chão de fábrica).  
- **Manutenção**: visão para técnicos em terminais.  

### ⚙️ Gestão (Supervisor/ADM)  
- Usuários, Locais, Máquinas/Dispositivos, Tipos de Manutenção, Permissões.  

### 📈 Relatórios e Auditoria  
- Relatórios estatísticos (tempo médio, ranking de falhas, técnicos mais ativos).  
- Histórico de auditoria (quem fez o quê, quando).  

### 👤 Perfil do Usuário  
- Atualização de dados básicos (telefone, email, senha, foto).  
- Campos fixos: nome, chapa, cargo, categoria.  

### 🗺️ Mapa da Planta  
- **Máquinas Fixas**: visão gráfica da planta.  
- **Pontes/Pórticos**: posições fixas.  
- **Caldeiraria**: blocos de equipamentos móveis.  
- **Fábrica Elétrica**: máquinas distribuídas no layout elétrico.  
- **Filtros**: status, local, tipo de equipamento.  
- **Ações rápidas**: ver detalhes, abrir chamado, histórico.  

---

## 2.1 📋 Tabela de Telas

| Tela                         | Objetivo                                                           | Perfis com Acesso                          |
|------------------------------|-------------------------------------------------------------------|-------------------------------------------|
| **Login**                   | Autenticação via chapa/senha e acesso visitante                   | Todos (Operador, Técnico, Supervisor, ADM, Visitante) |
| **Abertura de Chamado (Visitante)** | Permite abrir chamado sem login completo                          | Visitante, Dashboard Operacional          |
| **Abertura de Chamado (Usuário Logado)** | Formulário completo com dados preenchidos automaticamente          | Operador, Técnico, Supervisor, ADM        |
| **Dashboard Operador**      | Visão dos chamados próprios                                       | Operador                                  |
| **Dashboard Técnico**       | Visão de todos os chamados + ações rápidas                       | Técnico                                   |
| **Dashboard Supervisor/ADM**| Visão completa de chamados + acessos à gestão e relatórios        | Supervisor, ADM                           |
| **Dashboard Operacional**   | Visão restrita para chão de fábrica                              | Terminal de Operação / Operadores locais  |
| **Dashboard Manutenção**    | Visão detalhada para técnicos em terminais compartilhados         | Técnicos, Supervisores                    |
| **Listagem de Chamados**    | Consulta de chamados com filtros avançados                       | Operador (seus), Técnico, Supervisor, ADM |
| **Detalhe do Chamado**      | Exibe todas as informações do chamado e histórico                 | Operador (visualiza), Técnico, Supervisor, ADM |
| **Gestão de Usuários**      | Cadastro/edição de usuários e permissões                         | Supervisor, ADM                           |
| **Gestão de Locais**        | Cadastro/edição de setores/locais                                | Supervisor, ADM                           |
| **Gestão de Máquinas/Dispositivos** | Cadastro/edição de máquinas e dispositivos                      | Supervisor, ADM                           |
| **Gestão de Tipos de Manutenção**   | Cadastro/edição de tipos de manutenção                          | Supervisor, ADM                           |
| **Gestão de Permissões**    | Gerenciamento de permissões (RBAC)                               | ADM (ou Supervisor se definido)           |
| **Relatórios Gerenciais**   | Geração de relatórios estatísticos e métricas                    | Técnico (básicos), Supervisor, ADM        |
| **Histórico de Auditoria**  | Registro completo de todas as ações no sistema                   | Supervisor, ADM                           |
| **Meu Perfil**              | Atualização de dados pessoais                                    | Todos os usuários logados                 |
| **Mapa da Planta**          | Visão gráfica interativa de máquinas, pontes/pórticos e setores  | Operador, Técnico, Supervisor, ADM        |

---

## 3. Regras de Negócio

1. **Chamados**  
   - Visitante ou usuário pode abrir.  
   - Status inicial: **Aberto**.  
   - Status da máquina é obrigatório.  

2. **Atendimentos**  
   - Vários técnicos podem atender o mesmo chamado.  
   - Registro de início, pausa, retorno e fim.  

3. **Fechamento**  
   - Técnico/Supervisor fecha com solução aplicada.  
   - Pode gerar **pendência**.  

4. **Pendências**  
   - Sempre ligadas ao chamado.  
   - Criadas no fechamento ou durante o atendimento.  

5. **Anexos**  
   - Visitante: apenas na abertura.  
   - Técnico/Supervisor: em qualquer momento.  
   - Operador: apenas consulta.  

6. **Status da Máquina**  
   - Alterado na abertura ou no atendimento.  
   - Mantém histórico de alterações (quem/como/quando).  

---

## 4. Modelo de Dados (MER Simplificado)

- **Usuário**: id, nome, chapa, cpf, senha, cargo, categoria, ativo.  
- **Categoria_Usuario**: id, nome, descrição.  
- **Local**: id, nome, descrição.  
- **Máquina/Dispositivo**: id, nome, modelo, série, local, categoria.  
- **Categoria_Máquina**: fixa, ponte, caldeiraria, elétrica.  
- **Chamado**: id, descrição, prioridade, status_chamado, status_maquina, solicitante.  
- **Atendimento**: id, chamado, técnico, início, pausa, fim, andamento.  
- **Pendência**: id, chamado, descrição, status, criador, resolutor.  
- **Anexo**: id, chamado, arquivo, usuário_upload.  
- **Histórico_Ação**: id, chamado, usuário, tipo_ação, data.  
- **Permissão / Categoria_Permissão**: controle de RBAC.  
- **Status_Máquina**: id, máquina, status, data, chamado, usuário.

---

## 4.1 🗄️ Tabela de Entidades do Banco de Dados

| Entidade             | Atributos Principais                                   | Finalidade                                                                 |
|----------------------|--------------------------------------------------------|----------------------------------------------------------------------------|
| **Usuário**          | id, nome, chapa, cpf, senha, cargo, email, telefone, ativo, id_categoria | Armazena dados de operadores, técnicos, supervisores e administradores.    |
| **Categoria_Usuario**| id_categoria, nome_categoria, descricao_categoria      | Define os perfis de acesso (Operador, Técnico, Supervisor, ADM).           |
| **Local**            | id_local, nome_local, descricao_local                  | Representa os setores/áreas da fábrica.                                    |
| **Máquina_Dispositivo** | id_maquina, nome_maquina, modelo, num_serie, descricao, id_local, id_categoria_maquina | Cadastro das máquinas e dispositivos industriais.                          |
| **Categoria_Maquina**| id_categoria_maquina, nome_categoria, descricao        | Classificação das máquinas (fixas, pontes, caldeiraria, elétrica).         |
| **Chamado**          | id_chamado, descricao_problema, prioridade, status_chamado, status_maquina, data_abertura, data_fechamento, id_maquina, id_local, id_solicitante | Registro principal de solicitações de manutenção.                          |
| **Atendimento_Chamado** | id_atendimento, id_chamado, id_tecnico, hora_inicio, hora_fim, descricao_andamento | Registro das ações feitas por técnicos em cada chamado.                    |
| **Pendência**        | id_pendencia, id_chamado, descricao, status, data_criacao, id_criador, id_resolutor | Controle de pendências abertas durante o chamado.                          |
| **Anexo**            | id_anexo, id_chamado, id_usuario_upload, nome_arquivo, tipo_arquivo, caminho, data_upload | Armazena fotos, vídeos e documentos ligados a chamados.                    |
| **Histórico_Acao**   | id_historico, id_chamado, id_usuario, tipo_acao, descricao, data_acao | Log detalhado de todas as ações no sistema.                                |
| **Permissao**        | id_permissao, nome_permissao, descricao_permissao      | Define permissões específicas (RBAC).                                      |
| **Categoria_Permissao** | id_categoria, id_permissao                           | Associação N:N entre categorias de usuários e permissões.                  |
| **Status_Maquina**   | id_status, id_maquina, status, data_status, id_usuario, id_chamado | Histórico detalhado dos estados de cada máquina (rodando, parada, etc.).   |

---

## 5. Fluxos de Processo

1. **Abertura de Chamado**  
   - Usuário/visitante → preenche dados → chamado criado → histórico atualizado.  

2. **Atendimento Técnico**  
   - Técnico assume → registra andamento → pausa/retorno → conclusão.  

3. **Fechamento**  
   - Solução registrada → chamado fechado → pendência opcional → histórico atualizado.  

4. **Relatórios**  
   - Supervisor/ADM gera relatórios filtrando por status, máquina, técnico, período.  

5. **Status da Máquina**  
   - Atualizado na abertura/atendimento → registrado no histórico.  

---

## 6. RBAC / RLS

### 👤 Operador  
- Abre e consulta apenas seus chamados.  

### 🧑‍🔧 Técnico  
- Atende todos os chamados, cria pendências, gera relatórios básicos.  

### 👨‍💼 Supervisor/ADM  
- Gestão total (usuários, máquinas, auditoria, relatórios).  

### 🚶 Visitante  
- Apenas abre chamado externo.  

### 📺 Dashboards  
- Visão compartilhada por setor.  

### 🔒 RLS (Row Level Security - Supabase)  
- Operador → enxerga apenas seus chamados.  
- Técnico → enxerga todos, mas só edita seus atendimentos.  
- Supervisor/ADM → acesso total.  
- Visitante → apenas inserção.  

---

## 7. Roadmap / Futuro

- 📩 Notificações automáticas (e-mail/SMS).  
- 💬 Chat interno entre técnico e solicitante.  
- 🤖 IA de suporte (soluções baseadas no histórico).  
- 🌐 Integração IoT (manutenção preditiva).  
- 📶 Modo offline (áreas sem internet).  
- 🎙️ Reconhecimento de voz para abertura rápida.  
