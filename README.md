# Plataforma de Streaming de Músicas — MongoDB

Trabalho da segunda avaliação da disciplina **Banco de Dados II**  
Prof. Daniel Lichtnow — UFSM

---

## Domínio

Modelagem de uma plataforma de streaming de músicas (estilo Spotify), com foco em artistas, músicas e playlists.

---

## Modelo Conceitual (ER)

```
Artista ──(1,1)── lança ──(1,n)── Música ──(1,n)── pertence ──(1,n)── Playlist
```

| Entidade | Atributos |
|----------|-----------|
| Artista  | id, nome, pais, genero |
| Música   | id, titulo, duracao, ano_lanc |
| Playlist | id, nome, descricao, data_criacao |

**Relacionamentos:**
- `Artista` **lança** `Música` → **1:N** (um artista lança várias músicas)
- `Música` **pertence** `Playlist` → **N:N** (uma música pode estar em várias playlists e uma playlist tem várias músicas)

---

## Modelo Lógico — MongoDB

### Versão 1 — Embedded Relationships (`streaming_v1`)

As músicas ficam **embutidas** dentro do documento do artista. A playlist também embute as músicas diretamente.

```
artistas_v1  { _id, nome, pais, genero,
               musicas: [ { titulo, duracao, ano_lanc } ] }

playlists_v1 { _id, nome, descricao, data_criacao,
               musicas: [ { titulo, duracao, artista_nome } ] }
```

### Versão 2 — Referenced Relationships (`streaming_v2`)

Coleções separadas com referências entre si. A relação N:N entre Música e Playlist é resolvida com uma coleção intermediária.

```
artistas_v2        { _id, nome, pais, genero }
musicas_v2         { _id, titulo, duracao, ano_lanc, artista_id }
playlists_v2       { _id, nome, descricao, data_criacao }
musicas_playlists  { musica_id, playlist_id }
```

---

## Dados Inseridos

### Artistas

| Nome | País | Gênero |
|------|------|--------|
| The Beatles | Reino Unido | Rock |
| Led Zeppelin | Reino Unido | Rock |
| Pink Floyd | Reino Unido | Rock |

### Músicas

| Título | Artista | Duração (s) | Ano |
|--------|---------|-------------|-----|
| Let It Be | The Beatles | 243 | 1970 |
| Hey Jude | The Beatles | 431 | 1968 |
| Come Together | The Beatles | 259 | 1969 |
| Stairway to Heaven | Led Zeppelin | 482 | 1971 |
| Whole Lotta Love | Led Zeppelin | 334 | 1969 |
| Black Dog | Led Zeppelin | 296 | 1971 |
| Comfortably Numb | Pink Floyd | 382 | 1979 |
| Wish You Were Here | Pink Floyd | 314 | 1975 |

### Playlists

| Nome | Data de Criação |
|------|-----------------|
| Classic Rock Essentials | 2024-01-15 |
| 70s Rock Legends | 2024-03-22 |
| Hard Rock Hits | 2023-11-10 |

---

## Consultas

As consultas utilizam o pipeline de agregação do MongoDB (`aggregate`). Há duas consultas por versão, cada uma explorando um relacionamento diferente do modelo.

---

### Versão 1 — Embedded (`streaming_v1`)

#### Consulta A — Artistas e Músicas (Relacionamento 1:N)

Retorna nome do artista, quantidade de músicas e duração média, apenas para artistas do gênero Rock com mais de uma música, ordenados pela duração média decrescente.

**Operadores utilizados:** `$match`, `$unwind`, `$group`, `$sort`, `$project`

```js
use streaming_v1

db.artistas_v1.aggregate([
  { $match: { genero: "Rock" } },
  { $unwind: "$musicas" },
  { $group: {
      _id: "$nome",
      total_musicas: { $sum: 1 },
      duracao_media: { $avg: "$musicas.duracao" }
  }},
  { $match: { total_musicas: { $gt: 1 } } },
  { $sort: { duracao_media: -1 } },
  { $project: {
      _id: 0,
      artista: "$_id",
      total_musicas: 1,
      duracao_media: { $round: ["$duracao_media", 0] }
  }}
])
```

**Resultado esperado:**
```
{ artista: "Led Zeppelin",  total_musicas: 3, duracao_media: 371 }
{ artista: "Pink Floyd",    total_musicas: 2, duracao_media: 348 }
{ artista: "The Beatles",   total_musicas: 3, duracao_media: 311 }
```

---

#### Consulta B — Playlists e Músicas (Relacionamento N:N)

Retorna nome da playlist, quantidade de músicas e o título da música mais longa, apenas para playlists criadas em 2024.

**Operadores utilizados:** `$match`, `$addFields`, `$filter`, `$size`, `$arrayElemAt`, `$sortArray`, `$project`

```js
use streaming_v1

db.playlists_v1.aggregate([
  { $match: {
      data_criacao: {
        $gte: ISODate("2024-01-01"),
        $lt:  ISODate("2025-01-01")
      }
  }},
  { $addFields: {
      total_musicas: { $size: "$musicas" },
      musica_mais_longa: {
        $arrayElemAt: [
          { $sortArray: { input: "$musicas", sortBy: { duracao: -1 } } },
          0
        ]
      }
  }},
  { $project: {
      _id: 0,
      playlist: "$nome",
      total_musicas: 1,
      musica_mais_longa: "$musica_mais_longa.titulo"
  }}
])
```

**Resultado esperado:**
```
{ playlist: "Classic Rock Essentials", total_musicas: 4, musica_mais_longa: "Stairway to Heaven" }
{ playlist: "70s Rock Legends",        total_musicas: 3, musica_mais_longa: "Comfortably Numb"   }
```

> A playlist "Hard Rock Hits" (criada em 2023) não aparece no resultado — o filtro por data está funcionando corretamente.

---

### Versão 2 — Referenced (`streaming_v2`)

#### Consulta A — Artistas e Músicas (Relacionamento 1:N)

Mesma lógica da V1-A, mas usando `$lookup` para unir as coleções `artistas_v2` e `musicas_v2`.

**Operadores utilizados:** `$lookup`, `$match`, `$unwind`, `$group`, `$sort`, `$project`

```js
use streaming_v2

db.artistas_v2.aggregate([
  { $match: { genero: "Rock" } },
  { $lookup: {
      from:         "musicas_v2",
      localField:   "_id",
      foreignField: "artista_id",
      as:           "musicas"
  }},
  { $unwind: "$musicas" },
  { $group: {
      _id: "$nome",
      total_musicas: { $sum: 1 },
      duracao_media: { $avg: "$musicas.duracao" }
  }},
  { $match: { total_musicas: { $gt: 1 } } },
  { $sort: { duracao_media: -1 } },
  { $project: {
      _id: 0,
      artista: "$_id",
      total_musicas: 1,
      duracao_media: { $round: ["$duracao_media", 0] }
  }}
])
```

**Resultado esperado:**
```
{ artista: "Led Zeppelin",  total_musicas: 3, duracao_media: 371 }
{ artista: "Pink Floyd",    total_musicas: 2, duracao_media: 348 }
{ artista: "The Beatles",   total_musicas: 3, duracao_media: 311 }
```

---

#### Consulta B — Playlists e Músicas (Relacionamento N:N)

Retorna nome da playlist, quantidade de músicas e título da música mais longa para playlists de 2024, usando dois `$lookup` para atravessar a coleção intermediária `musicas_playlists`.

**Operadores utilizados:** `$match`, `$lookup` (×2), `$unwind`, `$addFields`, `$group`, `$project`, `$sort`

```js
use streaming_v2

db.playlists_v2.aggregate([
  { $match: {
      data_criacao: {
        $gte: ISODate("2024-01-01"),
        $lt:  ISODate("2025-01-01")
      }
  }},
  { $lookup: {
      from:         "musicas_playlists",
      localField:   "_id",
      foreignField: "playlist_id",
      as:           "relacoes"
  }},
  { $unwind: "$relacoes" },
  { $lookup: {
      from:         "musicas_v2",
      localField:   "relacoes.musica_id",
      foreignField: "_id",
      as:           "musica"
  }},
  { $unwind: "$musica" },
  { $sort: { "musica.duracao": -1 } },
  { $group: {
      _id:          "$nome",
      total_musicas: { $sum: 1 },
      musica_mais_longa: { $first: "$musica.titulo" }
  }},
  { $project: {
      _id: 0,
      playlist: "$_id",
      total_musicas: 1,
      musica_mais_longa: 1
  }}
])
```

**Resultado esperado:**
```
{ playlist: "Classic Rock Essentials", total_musicas: 4, musica_mais_longa: "Stairway to Heaven" }
{ playlist: "70s Rock Legends",        total_musicas: 3, musica_mais_longa: "Comfortably Numb"   }
```

---

## Comparativo: Embedded vs Referenced

| Aspecto | Embedded (V1) | Referenced (V2) |
|---------|--------------|-----------------|
| Estrutura | Dados aninhados em um único documento | Dados separados em coleções distintas |
| Leitura | Mais rápida (um único documento) | Requer `$lookup` (equivalente ao JOIN) |
| Atualização | Pode duplicar dados | Dados centralizados, sem duplicação |
| Relação N:N | Músicas repetidas em cada playlist | Resolvida com coleção intermediária |
| Indicado para | Dados que sempre são lidos juntos | Dados compartilhados entre entidades |

---

## Como Executar

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução

### Passo a passo

```bash
# 1. Subir o container MongoDB (apenas na primeira vez)
docker run -d --name mongo -p 27017:27017 mongo

# 2. Se o container já existir, apenas iniciá-lo
docker start mongo

# 3. Conectar ao mongosh
docker exec -it mongo mongosh
```

Dentro do `mongosh`, cole o conteúdo do arquivo `mongodb_streaming.js` em blocos — primeiro a `streaming_v1`, depois a `streaming_v2`.

---

## Estrutura do Repositório

```
bd2-mongodb-streaming/
├── README.md               ← este arquivo
├── mongodb_streaming.js    ← script completo (V1 + V2 + consultas)
└── modelo_er.pdf           ← diagrama ER exportado do brModelo
```

---

## Informações

- **Disciplina:** Banco de Dados II — UFSM  
- **Professor:** Daniel Lichtnow  
- **Avaliação:** Segunda avaliação — Tarefa prática (10%)
