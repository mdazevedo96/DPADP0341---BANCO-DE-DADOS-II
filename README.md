# DPADP0341---BANCO-DE-DADOS-II
Trabalho da disciplina
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

Cada entidade tem sua **própria coleção**. O relacionamento N:N é representado pela coleção `musicas_playlists`.

```
artistas_v2       { _id, nome, pais, genero }
musicas_v2        { _id, titulo, duracao, ano_lanc, artista_id }
playlists_v2      { _id, nome, descricao, data_criacao }
musicas_playlists { musica_id, playlist_id }
```

---

## Dados

| Artista | País | Músicas |
|---------|------|---------|
| The Beatles | Reino Unido | Let It Be, Hey Jude, Come Together |
| Raul Seixas | Brasil | Metamorfose Ambulante, Maluco Beleza, Ouro de Tolo |
| Led Zeppelin | Reino Unido | Stairway to Heaven, Whole Lotta Love, Black Dog |

| Playlist | Criação | Músicas |
|----------|---------|---------|
| Clássicos do Rock | 2024-03-10 | Stairway to Heaven, Let It Be, Hey Jude |
| Rock Brasil | 2024-07-22 | Metamorfose Ambulante, Ouro de Tolo, Come Together |
| Hard Rock Hits | 2023-11-05 | Whole Lotta Love, Black Dog, Maluco Beleza |

---

## Consultas

### Versão 1 — Embedded

**Consulta A — Artista + Música (1:N)**  
Lista nome do artista, quantidade de músicas e duração média — apenas artistas de Rock com mais de 1 música, ordenado pela duração média decrescente.

```javascript
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

**Consulta B — Playlist + Música (N:N)**  
Lista nome da playlist, quantidade de músicas e título da música mais longa — apenas playlists criadas em 2024.

```javascript
db.playlists_v1.aggregate([
    { $match: {
        data_criacao: {
            $gte: new Date("2024-01-01"),
            $lt:  new Date("2025-01-01")
        }
    }},
    { $addFields: {
        musica_mais_longa: {
            $arrayElemAt: [
                { $filter: {
                    input: "$musicas",
                    as: "m",
                    cond: { $eq: [
                        "$$m.duracao",
                        { $max: "$musicas.duracao" }
                    ]}
                }},
                0
            ]
        }
    }},
    { $project: {
        _id: 0,
        playlist: "$nome",
        total_musicas: { $size: "$musicas" },
        musica_mais_longa: "$musica_mais_longa.titulo"
    }}
])
```

### Versão 2 — Referenced

**Consulta A — Artista + Música via `$lookup` (1:N)**  
Mesmo resultado da V1-A, mas usando `$lookup` para unir artistas e músicas de coleções separadas.

```javascript
db.artistas_v2.aggregate([
    { $match: { genero: "Rock" } },
    { $lookup: {
        from: "musicas_v2",
        localField: "_id",
        foreignField: "artista_id",
        as: "musicas"
    }},
    { $project: {
        _id: 0,
        artista: "$nome",
        total_musicas: { $size: "$musicas" },
        duracao_media: { $round: [{ $avg: "$musicas.duracao" }, 0] }
    }},
    { $match: { total_musicas: { $gt: 1 } } },
    { $sort: { duracao_media: -1 } }
])
```

**Consulta B — Playlist + Música via `$lookup` duplo (N:N)**  
Mesmo resultado da V1-B, mas navegando pela coleção intermediária `musicas_playlists`.

```javascript
db.playlists_v2.aggregate([
    { $match: {
        data_criacao: {
            $gte: new Date("2024-01-01"),
            $lt:  new Date("2025-01-01")
        }
    }},
    { $lookup: {
        from: "musicas_playlists",
        localField: "_id",
        foreignField: "playlist_id",
        as: "relacoes"
    }},
    { $lookup: {
        from: "musicas_v2",
        localField: "relacoes.musica_id",
        foreignField: "_id",
        as: "musicas"
    }},
    { $project: {
        _id: 0,
        playlist: "$nome",
        total_musicas: { $size: "$musicas" },
        musica_mais_longa: {
            $arrayElemAt: [
                { $filter: {
                    input: "$musicas",
                    as: "m",
                    cond: { $eq: [
                        "$$m.duracao",
                        { $max: "$musicas.duracao" }
                    ]}
                }},
                0
            ]
        }
    }},
    { $project: {
        playlist: 1,
        total_musicas: 1,
        musica_mais_longa: "$musica_mais_longa.titulo"
    }}
])
```

---

## Como executar

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução

### Subir o MongoDB

```bash
docker pull mongo
docker run -d --name mongo -p 27017:27017 mongo
```

### Conectar ao mongosh

```bash
docker exec -it mongo mongosh --port 27017
```

### Rodar o script completo

```bash
docker exec -i mongo mongosh --quiet < mongodb_streaming.js
```

Ou copie e cole os blocos diretamente no `mongosh`.

---

## Estrutura do repositório

```
.
├── README.md
├── mongodb_streaming.js   # script completo (inserts + consultas)
└── modelo_er.pdf          # diagrama ER exportado do brModelo
```

---

## Embedded vs Referenced — comparação

| Critério | Embedded (V1) | Referenced (V2) |
|----------|---------------|-----------------|
| Estrutura | Dados aninhados em um documento | Coleções separadas com referências |
| Leitura | Mais rápida (um único documento) | Requer `$lookup` (similar ao JOIN) |
| Atualização | Mais trabalhosa se o dado se repete | Atualiza em um só lugar |
| Redundância | Pode duplicar dados | Sem duplicação |
| Ideal para | Dados estáticos, relações simples | Dados que mudam, relações complexas |
