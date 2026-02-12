# Diagrama de Sequência - Sistema de Locação de Salas/Laboratórios

## 1. Fluxo Principal: Agendamento de Sala (Sucesso)

```
sequenceDiagram
    actor Usuario as Usuário (Professor/Aluno/Servidor)
    participant Interface as Interface Web/Mobile
    participant Sistema as Sistema de Agendamento
    participant BD as Banco de Dados
    participant Notif as Sistema de Notificações
    participant Inventario as Sistema de Inventário

    Usuario->>Interface: Acessa formulário de agendamento
    Interface->>Sistema: Solicita formulário de reserva
    Sistema->>Interface: Exibe formulário (UC-010)
    
    Usuario->>Interface: Preenche (data, horário, sala)
    Interface->>Usuario: Valida dados em tempo real
    
    Usuario->>Interface: Clica em "Verificar Disponibilidade"
    Interface->>Sistema: Valida dados de entrada (RNF1: <2s)
    
    Sistema->>BD: Consulta disponibilidade da sala (RF03)
    BD->>Sistema: Retorna agendamentos existentes
    
    Sistema->>Sistema: Verifica conflito de horário (RN1)
    Sistema->>Sistema: Verifica limite de tempo (RN2)
    Sistema->>Inventario: Verifica status de manutenção
    Inventario->>Sistema: Retorna status da sala
    
    alt Dados Inválidos (A.2)
        Sistema->>Interface: Retorna erro (data passada, horário inv.)
        Interface->>Usuario: Exibe mensagem de erro
    else Conflito de Horário (A.1)
        Sistema->>Interface: Retorna erro "Conflito encontrado"
        Interface->>Usuario: Sugere horários alternativos
    else Sala em Manutenção (A.3)
        Sistema->>Interface: Retorna "Sala indisponível - Manutenção"
        Interface->>Usuario: Exibe mensagem
    else Sucesso na Verificação
        Usuario->>Interface: Clica em "Confirmar Agendamento"
        Interface->>Sistema: Submete solicitação de reserva
        
        Sistema->>BD: Registra novo agendamento (RF04)
        BD->>Sistema: Confirmação de registro
        
        Sistema->>BD: Atualiza status do agendamento
        
        Sistema->>Notif: Envia notificação de confirmação (RF09)
        Notif->>Usuario: Email/SMS de confirmação
        
        Sistema->>Interface: Retorna confirmação com ID
        Interface->>Usuario: Exibe comprovante de agendamento
    end
```

---

## 2. Fluxo: Check-in/Check-out

```
sequenceDiagram
    actor Usuario as Usuário
    participant Interface as Interface
    participant Sistema as Sistema
    participant BD as Banco de Dados
    participant Notif as Notificações

    Usuario->>Interface: Acessa sala no horário agendado
    Usuario->>Interface: Clica em "Check-in" (RF07)
    Interface->>Sistema: Registra check-in
    Sistema->>BD: Atualiza status: "Presente" / Registra hora real
    BD->>Sistema: Confirmação
    Sistema->>Interface: Exibe confirmação
    Interface->>Usuario: "Check-in realizado com sucesso"

    Note over Usuario,Sistema: Usuário utiliza a sala

    Usuario->>Interface: Finaliza uso e clica "Check-out" (RF08)
    Interface->>Sistema: Registra check-out
    Sistema->>BD: Atualiza status: "Encerrado" / Registra hora real
    BD->>Sistema: Confirmação
    Sistema->>Sistema: Calcula duração real de uso
    Sistema->>BD: Registra duração no histórico
    Sistema->>Notif: Envia comprovante de uso
    Notif->>Usuario: Email com resumo da sessão
    Sistema->>Interface: Exibe comprovante
    Interface->>Usuario: Mostra duração e detalhes
```

---

## 3. Fluxo: Aprovação de Agendamento (RF06)

```
sequenceDiagram
    actor Usuario as Usuário
    participant Interface as Interface
    participant Sistema as Sistema
    participant BD as Banco de Dados
    actor Admin as Administrador
    participant AdminInterface as Interface Admin

    Usuario->>Interface: Realiza agendamento
    Interface->>Sistema: Submete solicitação
    Sistema->>BD: Registra com status "Pendente"
    
    Admin->>AdminInterface: Acessa painel de aprovações
    AdminInterface->>Sistema: Carrega agendamentos pendentes
    Sistema->>BD: Consulta reservas em aprovação
    BD->>Sistema: Retorna lista
    Sistema->>AdminInterface: Exibe agendamentos pendentes

    Admin->>AdminInterface: Analisa solicitação
    
    alt Rejeita
        Admin->>AdminInterface: Clica em "Rejeitar"
        AdminInterface->>Sistema: Envia rejeição com motivo (RF06)
        Sistema->>BD: Atualiza status: "Rejeitado"
        Sistema->>Sistema: Notifica usuário
    else Aprova
        Admin->>AdminInterface: Clica em "Aprovar"
        AdminInterface->>Sistema: Envia aprovação (RF06)
        Sistema->>BD: Atualiza status: "Aprovado"
        Sistema->>Sistema: Notifica usuário (RF09)
    end
```

---

## 4. Fluxo: Cancelamento de Agendamento (RF12)

```
sequenceDiagram
    actor Usuario as Usuário
    participant Interface as Interface
    participant Sistema as Sistema
    participant BD as Banco de Dados
    participant Notif as Notificações

    Usuario->>Interface: Acessa seus agendamentos
    Interface->>Sistema: Carrega lista de reservas (RF03)
    Sistema->>BD: Consulta agendamentos do usuário
    BD->>Sistema: Retorna agendamentos
    Sistema->>Interface: Exibe calendário com reservas

    Usuario->>Interface: Seleciona agendamento a cancelar
    Usuario->>Interface: Clica em "Cancelar" (RF12)
    Interface->>Sistema: Solicita cancelamento
    Sistema->>Sistema: Valida se há tempo para cancelamento
    
    alt Cancelamento permitido
        Sistema->>BD: Atualiza status: "Cancelado"
        BD->>Sistema: Confirmação
        Sistema->>Notif: Envia notificação de cancelamento (RF09)
        Notif->>Usuario: Email/SMS de cancelamento
        Sistema->>Interface: Exibe confirmação
        Interface->>Usuario: "Agendamento cancelado"
    else Cancelamento não permitido (próximo ao horário)
        Sistema->>Interface: Retorna erro
        Interface->>Usuario: "Cancelamento não permitido (falta pouco tempo)"
    end
```

---

## 5. Fluxo: Geração de Relatórios (RF10)

```
sequenceDiagram
    actor Admin as Administrador
    participant AdminInterface as Interface Admin
    participant Sistema as Sistema
    participant BD as Banco de Dados
    participant Relatorios as Motor de Relatórios

    Admin->>AdminInterface: Acessa seção de Relatórios
    AdminInterface->>Sistema: Carrega filtros disponíveis
    Sistema->>AdminInterface: Exibe opções (sala, período, usuário)

    Admin->>AdminInterface: Define filtros (período, sala, etc.)
    AdminInterface->>Sistema: Submete parâmetros
    
    Sistema->>BD: Consulta dados de uso (RF10)
    BD->>Sistema: Retorna histórico de agendamentos
    
    Sistema->>Relatorios: Processa dados
    Relatorios->>Relatorios: Calcula ocupação, picos de uso, salas + utilizadas
    Relatorios->>Sistema: Retorna dados processados
    
    Sistema->>AdminInterface: Exibe gráficos e estatísticas
    AdminInterface->>Admin: Mostra relatório de uso
    
    Admin->>AdminInterface: Clica em "Exportar"
    AdminInterface->>Sistema: Requisita exportação (PDF/Excel)
    Sistema->>Relatorios: Gera arquivo
    Relatorios->>Admin: Download do arquivo
```

---

## 6. Fluxo: Registro de Ocorrências (RF11)

```
sequenceDiagram
    actor Usuario as Usuário
    participant Interface as Interface
    participant Sistema as Sistema
    participant BD as Banco de Dados
    participant Admin as Administrador (notificado)

    Usuario->>Interface: Finaliza uso (Check-out)
    Interface->>Sistema: Exibe opção "Registrar Ocorrência"
    Usuario->>Interface: Clica em "Registrar Problema"
    
    Interface->>Usuario: Exibe formulário de ocorrências (RF11)
    Usuario->>Interface: Preenche: tipo de problema, descrição, fotos
    Interface->>Sistema: Submete ocorrência
    
    Sistema->>BD: Registra ocorrência com timestamp
    BD->>Sistema: Confirmação de registro
    
    Sistema->>Sistema: Notifica administrador (problema crítico?)
    Sistema->>Admin: Email de alerta (se crítico)
    
    Sistema->>Interface: Exibe confirmação ao usuário
    Interface->>Usuario: "Ocorrência registrada. ID: #1234"
```

---

## 7. Fluxo: Consulta de Disponibilidade em Tempo Real (RQF2)

```
sequenceDiagram
    actor Usuario as Usuário
    participant Interface as Interface
    participant Sistema as Sistema
    participant Cache as Cache (Redis)
    participant BD as Banco de Dados

    Usuario->>Interface: Acessa calendário
    Interface->>Sistema: Solicita disponibilidade (RQF2)
    
    Sistema->>Cache: Consulta agendamentos em cache (RNF1: <2s)
    
    alt Cache válido
        Cache->>Sistema: Retorna agendamentos
    else Cache expirado
        Sistema->>BD: Consulta BD
        BD->>Sistema: Retorna dados
        Sistema->>Cache: Atualiza cache
    end
    
    Sistema->>Sistema: Processa disponibilidade por hora
    Sistema->>Sistema: Marca: Disponível (verde) / Ocupado (vermelho) / Manutenção (amarelo)
    
    Sistema->>Interface: Retorna calendário atualizado (RNF3: Interface Intuitiva)
    Interface->>Usuario: Exibe calendário colorido com horários livres/ocupados
```

---

## Resumo das Integrações:

| Componente | Função |
|-----------|--------|
| **Sistema de Agendamento** | Orquestra todo o fluxo |
| **Banco de Dados** | Persiste agendamentos, usuários, ocorrências |
| **Sistema de Notificações** | Envia e-mails, SMS (RF09) |
| **Sistema de Inventário** | Verifica status de manutenção |
| **Motor de Relatórios** | Gera estatísticas e gráficos (RF10) |
| **Cache** | Melhora performance (RNF1) |
| **Interface Web/Mobile** | Intuitiva e responsiva (RNF3) |

---

## Requisitos Atendidos por Diagrama:

✅ **RF03** - Consulta de Disponibilidade (Fluxo 1 e 7)  
✅ **RF04** - Agendamento (Fluxo 1)  
✅ **RF05** - Prevenção de Conflitos (Fluxo 1)  
✅ **RF06** - Aprovação de Agendamentos (Fluxo 3)  
✅ **RF07/RF08** - Check-in/Check-out (Fluxo 2)  
✅ **RF09** - Notificações (Todos os fluxos)  
✅ **RF10** - Relatórios de Uso (Fluxo 5)  
✅ **RF11** - Registro de Ocorrências (Fluxo 6)  
✅ **RF12** - Cancelamento (Fluxo 4)  
✅ **RN1** - Prevenção de Conflitos (Fluxo 1)  
✅ **RN2** - Limites de Tempo (Fluxo 1)  
✅ **RNF1** - Tempo de Resposta <2s (Fluxo 7)  
✅ **RNF3** - Interface Intuitiva (Fluxo 7)  
