# Ŷ'UP - Documentação da API

## Base URL
```
http://localhost:3000/api
```

## Autenticação
A API usa autenticação JWT. Inclua o token no header:
```
Authorization: Bearer <token>
```

## Endpoints

### Autenticação

#### POST /auth/register
Registra um novo usuário
```json
{
  "email": "user@example.com",
  "password": "123456",
  "username": "user123",
  "fullName": "Nome Completo"
}
```

**Response:**
```json
{
  "message": "Usuário criado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "user123",
    "full_name": "Nome Completo",
    "bio": null,
    "profile_image_url": null
  }
}
```

#### POST /auth/login
Faz login do usuário
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Response:**
```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

#### GET /auth/me
Obtém dados do usuário autenticado

**Headers:**
```
Authorization: Bearer <token>
```

### Vídeos

#### GET /videos
Obtém feed de vídeos

**Query Parameters:**
- `page` (number): Página atual (default: 1)
- `limit` (number): Vídeos por página (default: 10)

**Response:**
```json
{
  "videos": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "hasMore": true
  }
}
```

#### POST /videos
Upload de vídeo (requiere autenticação)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `video` (file): Arquivo de vídeo
- `description` (string): Descrição do vídeo
- `parkId` (string): ID do parque (opcional)
- `obstacleId` (string): ID do obstáculo (opcional)

#### POST /videos/:id/like
Curtir/descurtir vídeo

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Vídeo curtido",
  "liked": true
}
```

#### POST /videos/:id/comments
Comentar em vídeo

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "content": "Ótima manobra!"
}
```

#### GET /videos/:id/comments
Obtém comentários do vídeo

**Query Parameters:**
- `page` (number): Página atual
- `limit` (number): Comentários por página

### Usuários

#### GET /users/:id
Obtém perfil de usuário

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "user123",
    "full_name": "Nome Completo",
    "bio": "Biografia",
    "profile_image_url": "url",
    "stats": {
      "videos_count": 10,
      "badges_count": 5,
      "total_likes_received": 42
    },
    "recent_badges": [...]
  }
}
```

#### GET /users/:id/badges
Obtém badges do usuário

#### GET /users/:id/stats
Obtém estatísticas do usuário

#### PUT /users/profile-image
Atualizar imagem de perfil

**Body:**
```json
{
  "imageUrl": "https://example.com/image.jpg"
}
```

### Parques

#### GET /parks
Lista todos os parques

#### GET /parks/:id
Obtém detalhes de um parque

#### GET /parks/:id/obstacles
Obtém obstáculos do parque

#### POST /parks/:id/checkin
Faz check-in no parque

**Body:**
```json
{
  "videoId": "uuid" // opcional
}
```

#### GET /parks/nearby/:lat/:lng
Obtém parques próximos

**Query Parameters:**
- `radius` (number): Raio em km (default: 50)

### Badges

#### GET /badges
Lista todas as badges disponíveis

#### GET /badges/earned
Obtém badges conquistadas (autenticado)

#### GET /badges/progress
Obtém progresso das badges (autenticado)

#### GET /badges/category/:category
Obtém badges por categoria

### Notificações

#### GET /notifications
Obtém notificações do usuário

#### GET /notifications/unread-count
Obtém contagem de notificações não lidas

#### PUT /notifications/:id/read
Marca notificação como lida

#### PUT /notifications/mark-all-read
Marca todas como lidas

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `401` - Não autorizado
- `404` - Não encontrado
- `500` - Erro interno do servidor

## Exemplos de Uso

### Criar conta e fazer login
```javascript
// Registrar
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: '123456',
    username: 'user123'
  })
});

const { token, user } = await response.json();

// Usar token em requisições subsequentes
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### Upload de vídeo
```javascript
const formData = new FormData();
formData.append('video', {
  uri: videoUri,
  type: 'video/mp4',
  name: 'video.mp4'
});
formData.append('description', 'Minha manobra');
formData.append('parkId', 'park-uuid');

const response = await fetch('/api/videos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Curtir vídeo
```javascript
const response = await fetch('/api/videos/video-id/like', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Limites e Restrições

- Tamanho máximo de vídeo: 50MB
- Duração máxima de vídeo: 60 segundos
- Tamanho máximo de imagem: 10MB
- Rate limiting: 100 requisições por minuto

## Suporte

Para questões sobre a API:
- Verifique os códigos de erro retornados
- Consulte a documentação
- Teste no ambiente de desenvolvimento
- Crie uma issue para bugs