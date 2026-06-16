db.createCollection("artistas_v2")
db.createCollection("musicas_v2")
db.createCollection("playlists_v2")
db.createCollection("musicas_playlists")

db.artistas_v2.insert({ _id: ObjectId("aaa000000000000000000001"), nome: "The Beatles", pais: "Reino Unido", genero: "Rock" })
db.artistas_v2.insert({ _id: ObjectId("aaa000000000000000000002"), nome: "Led Zeppelin", pais: "Reino Unido", genero: "Rock" })
db.artistas_v2.insert({ _id: ObjectId("aaa000000000000000000003"), nome: "Pink Floyd", pais: "Reino Unido", genero: "Rock" })

db.artistas_v2.find().pretty()

db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000001"), titulo: "Let It Be", duracao: 243, ano_lanc: 1970, artista_id: ObjectId("aaa000000000000000000001") })
db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000002"), titulo: "Hey Jude", duracao: 431, ano_lanc: 1968, artista_id: ObjectId("aaa000000000000000000001") })
db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000003"), titulo: "Come Together", duracao: 259, ano_lanc: 1969, artista_id: ObjectId("aaa000000000000000000001") })
db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000004"), titulo: "Stairway to Heaven", duracao: 482, ano_lanc: 1971, artista_id: ObjectId("aaa000000000000000000002") })
db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000005"), titulo: "Whole Lotta Love", duracao: 334, ano_lanc: 1969, artista_id: ObjectId("aaa000000000000000000002") })
db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000006"), titulo: "Black Dog", duracao: 296, ano_lanc: 1971, artista_id: ObjectId("aaa000000000000000000002") })
db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000007"), titulo: "Comfortably Numb", duracao: 382, ano_lanc: 1979, artista_id: ObjectId("aaa000000000000000000003") })
db.musicas_v2.insert({ _id: ObjectId("ccc000000000000000000008"), titulo: "Wish You Were Here", duracao: 314, ano_lanc: 1975, artista_id: ObjectId("aaa000000000000000000003") })

db.musicas_v2.find().pretty()

db.playlists_v2.insert({ _id: ObjectId("bbb000000000000000000001"), nome: "Classic Rock Essentials", descricao: "Os maiores classicos do rock", data_criacao: ISODate("2024-01-15") })
db.playlists_v2.insert({ _id: ObjectId("bbb000000000000000000002"), nome: "70s Rock Legends", descricao: "Rock dos anos 70", data_criacao: ISODate("2024-03-22") })
db.playlists_v2.insert({ _id: ObjectId("bbb000000000000000000003"), nome: "Hard Rock Hits", descricao: "Hits pesados do rock", data_criacao: ISODate("2023-11-10") })

db.playlists_v2.find().pretty()

db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000004"), playlist_id: ObjectId("bbb000000000000000000001") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000007"), playlist_id: ObjectId("bbb000000000000000000001") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000002"), playlist_id: ObjectId("bbb000000000000000000001") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000005"), playlist_id: ObjectId("bbb000000000000000000001") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000008"), playlist_id: ObjectId("bbb000000000000000000002") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000004"), playlist_id: ObjectId("bbb000000000000000000002") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000007"), playlist_id: ObjectId("bbb000000000000000000002") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000006"), playlist_id: ObjectId("bbb000000000000000000003") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000005"), playlist_id: ObjectId("bbb000000000000000000003") })
db.musicas_playlists.insert({ musica_id: ObjectId("ccc000000000000000000003"), playlist_id: ObjectId("bbb000000000000000000003") })

db.musicas_playlists.find().pretty()

db.artistas_v2.aggregate([
    { $match: { genero: "Rock" } },
    { $lookup: { from: "musicas_v2", localField: "_id", foreignField: "artista_id", as: "musicas" }},
    { $unwind: "$musicas" },
    { $group: { _id: "$nome", total_musicas: { $sum: 1 }, duracao_media: { $avg: "$musicas.duracao" } }},
    { $match: { total_musicas: { $gt: 1 } } },
    { $sort: { duracao_media: -1 } },
    { $project: { _id: 0, artista: "$_id", total_musicas: 1, duracao_media: { $round: ["$duracao_media", 0] } }}
])

db.playlists_v2.aggregate([
    { $match: { data_criacao: { $gte: ISODate("2024-01-01"), $lt: ISODate("2025-01-01") } }},
    { $lookup: { from: "musicas_playlists", localField: "_id", foreignField: "playlist_id", as: "relacoes" }},
    { $unwind: "$relacoes" },
    { $lookup: { from: "musicas_v2", localField: "relacoes.musica_id", foreignField: "_id", as: "musica" }},
    { $unwind: "$musica" },
    { $sort: { "musica.duracao": -1 } },
    { $group: { _id: "$nome", total_musicas: { $sum: 1 }, musica_mais_longa: { $first: "$musica.titulo" } }},
    { $project: { _id: 0, playlist: "$_id", total_musicas: 1, musica_mais_longa: 1 }}
])
