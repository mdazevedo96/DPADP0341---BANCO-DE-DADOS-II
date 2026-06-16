db.createCollection("artistas_v1")
db.createCollection("playlists_v1")

db.artistas_v1.insert({ _id: ObjectId("aaa000000000000000000001"), nome: "The Beatles", pais: "Reino Unido", genero: "Rock", musicas: [ { titulo: "Let It Be", duracao: 243, ano_lanc: 1970 }, { titulo: "Hey Jude", duracao: 431, ano_lanc: 1968 }, { titulo: "Come Together", duracao: 259, ano_lanc: 1969 } ] })
db.artistas_v1.insert({ _id: ObjectId("aaa000000000000000000002"), nome: "Led Zeppelin", pais: "Reino Unido", genero: "Rock", musicas: [ { titulo: "Stairway to Heaven", duracao: 482, ano_lanc: 1971 }, { titulo: "Whole Lotta Love", duracao: 334, ano_lanc: 1969 }, { titulo: "Black Dog", duracao: 296, ano_lanc: 1971 } ] })
db.artistas_v1.insert({ _id: ObjectId("aaa000000000000000000003"), nome: "Pink Floyd", pais: "Reino Unido", genero: "Rock", musicas: [ { titulo: "Comfortably Numb", duracao: 382, ano_lanc: 1979 }, { titulo: "Wish You Were Here", duracao: 314, ano_lanc: 1975 } ] })

db.artistas_v1.find().pretty()

db.playlists_v1.insert({ _id: ObjectId("bbb000000000000000000001"), nome: "Classic Rock Essentials", descricao: "Os maiores classicos do rock", data_criacao: ISODate("2024-01-15"), musicas: [ { titulo: "Stairway to Heaven", duracao: 482, artista_nome: "Led Zeppelin" }, { titulo: "Comfortably Numb", duracao: 382, artista_nome: "Pink Floyd" }, { titulo: "Hey Jude", duracao: 431, artista_nome: "The Beatles" }, { titulo: "Whole Lotta Love", duracao: 334, artista_nome: "Led Zeppelin" } ] })
db.playlists_v1.insert({ _id: ObjectId("bbb000000000000000000002"), nome: "70s Rock Legends", descricao: "Rock dos anos 70", data_criacao: ISODate("2024-03-22"), musicas: [ { titulo: "Wish You Were Here", duracao: 314, artista_nome: "Pink Floyd" }, { titulo: "Stairway to Heaven", duracao: 482, artista_nome: "Led Zeppelin" }, { titulo: "Comfortably Numb", duracao: 382, artista_nome: "Pink Floyd" } ] })
db.playlists_v1.insert({ _id: ObjectId("bbb000000000000000000003"), nome: "Hard Rock Hits", descricao: "Hits pesados do rock", data_criacao: ISODate("2023-11-10"), musicas: [ { titulo: "Black Dog", duracao: 296, artista_nome: "Led Zeppelin" }, { titulo: "Whole Lotta Love", duracao: 334, artista_nome: "Led Zeppelin" }, { titulo: "Come Together", duracao: 259, artista_nome: "The Beatles" } ] })

db.playlists_v1.find().pretty()

db.artistas_v1.aggregate([
    { $match: { genero: "Rock" } },
    { $unwind: "$musicas" },
    { $group: { _id: "$nome", total_musicas: { $sum: 1 }, duracao_media: { $avg: "$musicas.duracao" } }},
    { $match: { total_musicas: { $gt: 1 } } },
    { $sort: { duracao_media: -1 } },
    { $project: { _id: 0, artista: "$_id", total_musicas: 1, duracao_media: { $round: ["$duracao_media", 0] } }}
])

db.playlists_v1.aggregate([
    { $match: { data_criacao: { $gte: ISODate("2024-01-01"), $lt: ISODate("2025-01-01") } }},
    { $addFields: { total_musicas: { $size: "$musicas" }, musica_mais_longa: { $arrayElemAt: [ { $sortArray: { input: "$musicas", sortBy: { duracao: -1 } } }, 0 ] } }},
    { $project: { _id: 0, playlist: "$nome", total_musicas: 1, musica_mais_longa: "$musica_mais_longa.titulo" }}
])
