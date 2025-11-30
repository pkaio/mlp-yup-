# Guia do Sistema de XP - Y'UP

## 📋 Visão Geral

O sistema de XP do Y'UP foi reestruturado para ser baseado em **componentes de manobras**, divididos em **6 divisões** que se combinam para gerar o XP final.

### Fórmula de XP

```
XP Total = approach + entry + spins + grabs + base_moves + modifiers + bonus_xp
```

- **Componentes da manobra**: XP automático baseado na execução
- **bonus_xp**: XP adicional manual definido para challenges/quests/eventos especiais

---

## 🎯 As 6 Divisões de Componentes

### 1. APPROACH (Aproximação)
Como o rider se aproxima do obstáculo usando a borda da prancha.

| Código | Nome | Descrição | XP |
|--------|------|-----------|-----|
| `hs` | HS | Heelside approach | **2** |
| `ts` | TS | Toeside approach | **3** |
| `sw_hs` | SW HS | Switch stance, heelside | **3** |
| `sw_ts` | SW TS | Switch stance, toeside | **4** |

### 2. ENTRY (Entrada)
Como o rider entra no obstáculo.

| Código | Nome | Descrição | XP |
|--------|------|-----------|-----|
| `ride_on` | Ride On | Riding directly onto feature | **0** |
| `ollie_on` | Ollie | Ollie onto feature | **3** |
| `transfer` | Transfer | Jump/transfer from one part to another | **5** |

### 3. SPINS (Rotações)
Graus de rotação realizados (Frontside ou Backside).

| Código | Nome | Direção | Graus | XP |
|--------|------|---------|-------|-----|
| `none` | Sem rotação | - | 0° | **0** |
| `fs180` | FS 180 | Frontside | 180° | **10** |
| `bs180` | BS 180 | Backside | 180° | **12** |
| `fs360` | FS 360 | Frontside | 360° | **20** |
| `bs360` | BS 360 | Backside | 360° | **22** |
| `fs540` | FS 540 | Frontside | 540° | **30** |
| `bs540` | BS 540 | Backside | 540° | **32** |
| `fs720` | FS 720 | Frontside | 720° | **40** |
| `bs720` | BS 720 | Backside | 720° | **42** |
| `fs900` | FS 900 | Frontside | 900° | **50** |
| `bs900` | BS 900 | Backside | 900° | **52** |
| `fs1080` | FS 1080 | Frontside | 1080° | **60** |
| `bs1080` | BS 1080 | Backside | 1080° | **62** |
| `fs1260` | FS 1260 | Frontside | 1260° | **70** |
| `bs1260` | BS 1260 | Backside | 1260° | **72** |
| `fs1440` | FS 1440 | Frontside | 1440° | **80** |
| `bs1440` | BS 1440 | Backside | 1440° | **82** |

> **Nota**: Backside sempre dá +2 XP sobre Frontside do mesmo grau.

### 4. GRABS (Agarradas)
Agarradas na prancha durante a manobra.

#### Grabs Básicos (10 XP)
| Código | Nome | Lado | Mão | XP |
|--------|------|------|-----|-----|
| `indy` | Indy | Toe-side | Back | **10** |
| `tindy` | Tindy | Toe-side | Back | **10** |
| `tail` | Tail | Tail | Back | **10** |
| `melon` | Melon | Heel-side | Front | **10** |
| `mute` | Mute | Toe-side | Front | **10** |
| `slob` | Slob | Toe-side | Front | **10** |

#### Grabs Intermediários (15 XP)
| Código | Nome | Lado | Mão | XP |
|--------|------|------|-----|-----|
| `tailfish` | Tailfish | Heel-side | Back | **15** |
| `stalefish` | Stalefish | Heel-side | Back | **15** |
| `method` | Method | Heel-side | Front | **15** |
| `nose` | Nose | Nose | Front | **15** |

#### Grabs Avançados (20 XP)
| Código | Nome | Lado | Mão | XP |
|--------|------|------|-----|-----|
| `crail` | Crail | Toe-side | Back | **20** |
| `nuclear` | Nuclear | Heel-side | Back | **20** |
| `seatbelt` | Seat Belt | Heel-side | Front | **20** |
| `roastbeef` | Roast Beef | Heel-side | Back | **20** |
| `chickensalad` | Chicken Salad | Heel-side | Back | **20** |

### 5. BASE_MOVES (Movimentos Base)
Trick principal ou movimento fundamental da manobra.

#### Surface (8-15 XP)
| Código | Nome | XP |
|--------|------|-----|
| `ollie` | Ollie | **8** |
| `side_slide` | Side Slide (FS 90) | **8** |
| `powerslide` | Powerslide (BS 90) | **10** |
| `surface_180` | Surface 180 | **10** |
| `surface_360` | Surface 360 | **15** |

#### Railey Family (40-58 XP)
| Código | Nome | XP |
|--------|------|-----|
| `railey` | Railey | **40** |
| `ts_railey` | TS Railey | **45** |
| `s_bend` | S-Bend | **55** |
| `ts_s_bend` | TS S-Bend | **58** |

#### Invert (35-40 XP)
| Código | Nome | XP |
|--------|------|-----|
| `backroll` | Back Roll | **35** |
| `frontflip` | Front Flip | **35** |
| `frontroll_ts` | TS Front Roll | **35** |
| `tantrum` | Tantrum | **35** |
| `ts_backroll` | TS Back Roll | **38** |
| `bell_air` | Bell Air | **38** |
| `ben_air` | Ben Air | **38** |
| `mexican_roll` | Mexican Roll | **40** |
| `scarecrow` | Scarecrow | **40** |
| `egg_roll` | Egg Roll | **40** |

#### Rail (10-20 XP)
| Código | Nome | XP |
|--------|------|-----|
| `5050` | 50/50 | **10** |
| `bs_boardslide` | BS Boardslide | **15** |
| `front_lip` | Front Lip | **15** |
| `back_lip` | Back Lip | **16** |
| `frontboard` | Frontboard | **16** |
| `gap` | Gap on Rail | **18** |
| `rail_transfer` | Rail Transfer | **20** |

### 6. MODIFIERS (Modificadores)
Modificadores adicionais que aumentam a dificuldade.

#### Nenhum
| Código | Nome | XP |
|--------|------|-----|
| `none` | None | **0** |

#### Stance (5 XP)
| Código | Nome | XP |
|--------|------|-----|
| `switch` | Switch | **5** |
| `fakie` | Fakie | **5** |

#### Landing Variations (6-8 XP)
| Código | Nome | XP |
|--------|------|-----|
| `to_fakie` | To Fakie | **6** |
| `to_revert` | To Revert | **6** |
| `blind` | Blind | **8** |
| `to_blind` | To Blind | **8** |

#### Handle Tricks (8-12 XP)
| Código | Nome | XP |
|--------|------|-----|
| `wrapped` | Wrapped | **8** |
| `baller` | Baller | **10** |
| `ole` | Ole | **10** |
| `hp` | Handle Pass | **12** |

#### Axis Variations (5-10 XP)
| Código | Nome | XP |
|--------|------|-----|
| `on_axis` | On-Axis | **5** |
| `off_axis` | Off-Axis | **10** |

#### Direction Change (10 XP)
| Código | Nome | XP |
|--------|------|-----|
| `rewind` | Rewind | **10** |

---

## 💰 Sistema de Bônus

O campo `bonus_xp` permite adicionar XP extra de forma controlada:

### Fontes de Bônus

1. **Challenges**: Definido em `challenges.bonus_xp`
2. **Quests (Skill Tree)**: Definido em `skill_tree_nodes.bonus_xp`
3. **Manual (Admin)**: Adicionado via endpoint admin

### Exemplos de Bônus

```javascript
// Challenge com bônus
{
  "maneuverPayload": {...},
  "challengeId": "uuid-do-challenge",
  // bonus_xp será automaticamente adicionado do challenge
}

// Quest com bônus
{
  "maneuverPayload": {...},
  "questNodeId": "uuid-da-quest",
  // bonus_xp será automaticamente adicionado da quest
}

// Bônus manual (apenas admin)
POST /api/admin/videos/:videoId/bonus
{
  "bonus_xp": 100,
  "reason": "Vídeo destaque da semana"
}
```

---

## 📡 Formato do maneuverPayload

### Estrutura Obrigatória

```javascript
{
  "approach": "sw_ts",           // Código do approach
  "entry": "ollie_on",            // Código do entry
  "spins": "fs360",               // Código do spin
  "grabs": "mute",                // Código do grab
  "base_moves": "backroll",       // Código do base move
  "modifiers": ["blind", "hp"]    // Array de códigos (opcional)
}
```

### Exemplo Completo de Upload

```javascript
POST /api/videos
Content-Type: multipart/form-data

{
  "video": <arquivo>,
  "maneuverPayload": {
    "approach": "sw_ts",
    "entry": "ollie_on",
    "spins": "fs360",
    "grabs": "mute",
    "base_moves": "backroll",
    "modifiers": ["blind", "hp"]
  },
  "challengeId": "optional-uuid",
  "questNodeId": "optional-uuid"
}
```

### Cálculo do Exemplo Acima

```
approach (sw_ts):     4 XP
entry (ollie_on):     3 XP
spins (fs360):       20 XP
grabs (mute):        10 XP
base_moves (backroll): 35 XP
modifiers (blind):    8 XP
modifiers (hp):      12 XP
────────────────────────
Manobra Total:       92 XP

+ Bônus (se aplicável): ?
════════════════════════
XP Total:            92+ XP
```

---

## 🔧 Endpoints Admin

### Gerenciar Componentes

```bash
# Listar todos componentes
GET /api/admin/components

# Filtrar por divisão
GET /api/admin/components?division=spins

# Buscar componente específico
GET /api/admin/components/:id

# Atualizar XP de componente
PUT /api/admin/components/:id
{
  "xp_value": 25,
  "description": "Nova descrição"
}

# Criar novo componente
POST /api/admin/components
{
  "component_id": "fs1620",
  "division": "spins",
  "display_name": "FS 1620",
  "description": "Frontside 1620 degrees",
  "xp_value": 90,
  "metadata": {"spin_dir": "FS", "spin_deg": 1620}
}

# Desativar componente
DELETE /api/admin/components/:id
```

### Adicionar Bônus Manual

```bash
POST /api/admin/videos/:videoId/bonus
{
  "bonus_xp": 100,
  "reason": "Vídeo destaque da semana"
}
```

### Estatísticas

```bash
GET /api/admin/xp-stats
```

Retorna:
- Total de componentes por divisão
- Média de XP por divisão
- Top 10 manobras mais valiosas
- Distribuição de XP

---

## 🗃️ Estrutura do Banco de Dados

### Tabela `maneuver_components`

```sql
CREATE TABLE maneuver_components (
    id UUID PRIMARY KEY,
    component_id VARCHAR(80) UNIQUE NOT NULL,
    division VARCHAR(20) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    description TEXT,
    xp_value INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `videos` (novos campos)

```sql
ALTER TABLE videos
ADD COLUMN component_breakdown JSONB DEFAULT '{}',
ADD COLUMN maneuver_xp INTEGER DEFAULT 0,
ADD COLUMN bonus_xp INTEGER DEFAULT 0,
ADD COLUMN bonus_reason VARCHAR(255);
```

### Exemplo de `component_breakdown` salvo

```json
{
  "approach": {
    "component_id": "sw_ts",
    "name": "SW TS",
    "xp": 4
  },
  "entry": {
    "component_id": "ollie_on",
    "name": "Ollie",
    "xp": 3
  },
  "spins": {
    "component_id": "fs360",
    "name": "FS 360",
    "xp": 20
  },
  "grabs": {
    "component_id": "mute",
    "name": "Mute",
    "xp": 10
  },
  "base_moves": {
    "component_id": "backroll",
    "name": "Back Roll",
    "xp": 35
  },
  "modifiers": [
    {"component_id": "blind", "name": "Blind", "xp": 8},
    {"component_id": "hp", "name": "Handle Pass", "xp": 12}
  ],
  "maneuver_total": 92,
  "components_used": ["sw_ts", "ollie_on", "fs360", "mute", "backroll", "blind", "hp"]
}
```

---

## 🚀 Migração e Deploy

### Ordem de Execução das Migrations

1. `20251113_cleanup_legacy_data.sql` - Limpa dados antigos
2. `20251113_create_maneuver_components.sql` - Cria estrutura
3. `20251113_seed_maneuver_components.sql` - Popula 78 componentes
4. `20251113_migrate_challenge_rewards.sql` - Migra rewards

### Executar Migrations

```bash
# Via script node
node backend/scripts/runMigration.js database/migrations/20251113_cleanup_legacy_data.sql
node backend/scripts/runMigration.js database/migrations/20251113_create_maneuver_components.sql
node backend/scripts/runMigration.js database/migrations/20251113_seed_maneuver_components.sql
node backend/scripts/runMigration.js database/migrations/20251113_migrate_challenge_rewards.sql

# Ou via psql diretamente
PGPASSWORD='password' psql -h host -U user -d database -f database/migrations/20251113_cleanup_legacy_data.sql
```

---

## ✅ Validação

### Checklist de Validação

- [ ] 78 componentes inseridos no banco
- [ ] Todos componentes ativos (`is_active = true`)
- [ ] XP de usuários resetados para 0
- [ ] Vídeos antigos removidos
- [ ] Challenges com `bonus_xp` definido
- [ ] Quests com `bonus_xp` definido
- [ ] Endpoint `/api/admin/components` funcional
- [ ] Endpoint `/api/videos` aceita `maneuverPayload`
- [ ] XP calculado corretamente (maneuver + bonus)
- [ ] `component_breakdown` salvo em `videos`

---

## 🎓 Exemplos de Manobras Completas

### Exemplo 1: Manobra Simples
**HS Ollie FS 180 Indy**

```json
{
  "approach": "hs",
  "entry": "ollie_on",
  "spins": "fs180",
  "grabs": "indy",
  "base_moves": "ollie",
  "modifiers": ["none"]
}
```

**Cálculo**: 2 + 3 + 10 + 10 + 8 + 0 = **33 XP**

### Exemplo 2: Manobra Intermediária
**TS Switch FS 360 Stalefish**

```json
{
  "approach": "sw_ts",
  "entry": "ollie_on",
  "spins": "fs360",
  "grabs": "stalefish",
  "base_moves": "surface_180",
  "modifiers": ["none"]
}
```

**Cálculo**: 4 + 3 + 20 + 15 + 10 + 0 = **52 XP**

### Exemplo 3: Manobra Avançada
**SW HS Transfer BS 720 Method Blind Handle Pass**

```json
{
  "approach": "sw_hs",
  "entry": "transfer",
  "spins": "bs720",
  "grabs": "method",
  "base_moves": "backroll",
  "modifiers": ["blind", "hp", "off_axis"]
}
```

**Cálculo**: 3 + 5 + 42 + 15 + 35 + 8 + 12 + 10 = **130 XP**

### Exemplo 4: Quest com Bônus
**TS Backroll + Quest Bonus**

```json
{
  "approach": "ts",
  "entry": "ollie_on",
  "spins": "fs180",
  "grabs": "mute",
  "base_moves": "ts_backroll",
  "modifiers": ["none"]
}
```

**Cálculo**: 3 + 3 + 10 + 10 + 38 + 0 = **64 XP**
**+ Quest Bonus**: **+100 XP**
**Total**: **164 XP**

---

## 📊 Resumo de Valores

| Divisão | Componentes | XP Mínimo | XP Máximo | Média |
|---------|-------------|-----------|-----------|-------|
| Approach | 4 | 2 | 4 | 3 |
| Entry | 3 | 0 | 5 | 2.7 |
| Spins | 16 | 10 | 82 | 46 |
| Grabs | 15 | 10 | 20 | 13.3 |
| Base Moves | 26 | 8 | 58 | 25.7 |
| Modifiers | 14 | 0 | 12 | 6.4 |

**Total de Componentes**: 78

**XP Mínimo Possível**: 2 (hs + ride_on + fs180 + indy + side_slide + none) = **32 XP**

**XP Máximo Possível**: 4 + 5 + 82 + 20 + 58 + (12+10+10+8) = **209 XP** (sem bônus)

---

## 🔍 Troubleshooting

### Erro: "maneuverPayload é obrigatório"
- Certifique-se de enviar o campo `maneuverPayload` no body
- Verifique se está no formato correto (objeto JSON ou string JSON)

### Erro: "Componente inválido"
- Verifique se os códigos enviados existem na tabela `maneuver_components`
- Use `GET /api/admin/components` para listar componentes disponíveis

### XP não está sendo calculado
- Verifique os logs do servidor para erros no `calculateManeuverXp`
- Confirme que as migrations foram executadas corretamente
- Teste com `GET /api/admin/xp-stats` para ver estatísticas

### Cache desatualizado
- O sistema usa cache de 5 minutos para componentes
- Após atualizar componentes, pode demorar até 5 minutos para refletir
- Use o endpoint admin PUT para limpar cache automaticamente

---

## 📝 Notas Importantes

1. **Retrocompatibilidade**: O campo `expPayload` legado foi mantido no schema mas não é mais usado
2. **Bônus Controlado**: Apenas admins podem adicionar `bonus_xp` manual
3. **Validação Strict**: O sistema valida que todas as 5 divisões obrigatórias estejam presentes
4. **Modifiers Opcional**: A divisão `modifiers` é opcional e pode ser vazia ou conter múltiplos valores
5. **Cache Inteligente**: Componentes são cacheados por 5 minutos para performance
6. **Auditoria**: Todas alterações em XP são logadas em `user_exp_log`

---

**Versão**: 2.0
**Data**: Novembro 2025
**Autor**: Sistema Y'UP
