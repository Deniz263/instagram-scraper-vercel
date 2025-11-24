// api/instagram.js

export default async function handler(req, res) {
  // Basit CORS – telefondan çağırırken sorun olmasın
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { username } = req.query;

  if (!username) {
    return res
      .status(400)
      .json({ error: "username parametresi gerekli. Örn: ?username=instagram" });
  }

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST =
    "instagram-api-fast-reliable-data-scraper.p.rapidapi.com";
  const BASE_URL = `https://${RAPIDAPI_HOST}`;

  if (!RAPIDAPI_KEY) {
    return res
      .status(500)
      .json({ error: "Sunucuda RAPIDAPI_KEY tanımlı değil." });
  }

  try {
    // 1) username -> user_id
    const userIdRes = await fetch(
      `${BASE_URL}/user_id_by_username?username=${encodeURIComponent(
        username
      )}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
        },
      }
    );

    const userIdData = await userIdRes.json();

    if (!userIdRes.ok || !userIdData.UserID) {
      return res
        .status(404)
        .json({ error: "Kullanıcı bulunamadı", raw: userIdData });
    }

    const userId = userIdData.UserID;

    // 2) user_id -> post feed (son postlar)
    // RapidAPI’de "User Post Feed" endpoint’inin URL’ini birebir kullanıyoruz:
    // /user_post_feed?user_id=...
    const postsRes = await fetch(
      `${BASE_URL}/user_post_feed?user_id=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
        },
      }
    );

    const postsData = await postsRes.json();

    if (!postsRes.ok || !Array.isArray(postsData.items)) {
      return res.status(500).json({
        error: "Postlar çekilemedi",
        raw: postsData,
      });
    }

    // Gönderdiğin JSON yapısına göre temiz çıktı
    const cleaned = postsData.items.map((item) => ({
      // id / pk
      media_id: item.id ?? null,
      pk: item.pk ?? null,

      // temel bilgiler
      code: item.code ?? null,
      media_type: item.media_type ?? null, // 1: foto, 2: video/reels
      taken_at: item.taken_at ?? null,

      // caption
      caption: item.caption?.text ?? "",

      // sayılar
      like_count: item.like_count ?? null,
      comment_count: item.comment_count ?? null,

      // görsel url (varsa)
      image_url:
        item.image_versions2?.candidates?.[0]?.url ??
        item.additional_candidates?.first_frame?.url ??
        null,

      // video url (varsa)
      video_url: item.video_versions?.[0]?.url ?? null,

      // kullanıcı bilgisi (özet)
      user: item.user
        ? {
            id: item.user.pk ?? null,
            username: item.user.username ?? null,
            full_name: item.user.full_name ?? null,
            profile_pic_url: item.user.profile_pic_url ?? null,
            is_verified: item.user.is_verified ?? null,
          }
        : null,
    }));

    return res.status(200).json({
      username,
      user_id: userId,
      post_count: cleaned.length,
      posts: cleaned,
    });
  } catch (err) {
    console.error("API Hatası:", err);
    return res.status(500).json({
      error: "Bilinmeyen hata",
      detail: err.message,
    });
  }
}
