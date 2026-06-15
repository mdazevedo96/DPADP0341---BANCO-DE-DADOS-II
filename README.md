# Trabalho BD2 - Plataforma de Streaming de Músicas

Trabalho da disciplina de Banco de Dados II — Prof. Daniel Lichtnow (UFSM).

O domínio escolhido foi uma plataforma de streaming de músicas, com artistas, músicas e playlists. O modelo foi implementado em MongoDB nas versões Embedded e Referenced.

## Modelo Conceitual (ER)

```text
Artista ──(1,1)── lança ──(1,n)── Música ──(1,n)── pertence ──(1,n)── Playlist
```

Relacionamentos:
- Artista lança Música → 1:N
- Música pertence a Playlist → N:N

## Modelo Lógico

**Versão 1 — Embedded (`streaming_v1`):** músicas embutidas dentro do artista e da playlist.

```text
artistas_v1  { _id, nome, pais, genero, musicas: [ { titulo, duracao, ano_lanc } ] }
playlists_v1 { _id, nome, descricao, data_criacao, musicas: [ { titulo, duracao, artista_nome } ] }
```

**Versão 2 — Referenced (`streaming_v2`):** coleções separadas com referências entre si. A relação N:N é resolvida com uma coleção intermediária.

```text
artistas_v2        { _id, nome, pais, genero }
musicas_v2         { _id, titulo, duracao, ano_lanc, artista_id }
playlists_v2       { _id, nome, descricao, data_criacao }
musicas_playlists  { musica_id, playlist_id }
```

## Consultas

### V1-A — Artistas com mais de uma música (Embedded, 1:N)

Lista nome do artista, quantidade de músicas e duração média, para artistas Rock com mais de uma música, ordenado por duração média decrescente.

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

### V1-B — Playlists de 2024 com música mais longa (Embedded, N:N)

Lista nome da playlist, quantidade de músicas e o título da música mais longa, filtrando só playlists criadas em 2024.

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

### V2-A — Artistas com mais de uma música (Referenced, 1:N)

Mesma consulta da V1-A, mas usando `$lookup` para juntar as coleções `artistas_v2` e `musicas_v2`.

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

### V2-B — Playlists de 2024 com música mais longa (Referenced, N:N)

Mesma consulta da V1-B, mas usando dois `$lookup` para atravessar a coleção intermediária `musicas_playlists`.

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

## Como Executar

Precisa ter o Docker Desktop instalado e rodando.

**1. Baixar a imagem do MongoDB:**
```bash
docker pull mongodb/mongodb-community-server:latest
```

**2. Criar o container:**
```bash
docker run --name mongodb -p 27017:27017 -d mongodb/mongodb-community-server:latest
```

**3. Abrir o terminal do container no Docker Desktop:**

No Docker Desktop, clicar nos três pontos ao lado do container `mongodb` → **Open in terminal**

**4. Dentro do terminal, conectar ao mongosh:**
```bash
mongosh --port 27017
```

**5. Colar o script:**

Dentro do mongosh, cole o conteúdo do arquivo `mongodb_streaming.js` — primeiro a `streaming_v1`, depois a `streaming_v2`.

## Arquivos

```text
├── README.md
├── mongodb_streaming.js
└── modelo_er.pdf
```
