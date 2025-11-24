// api/instagram.js

export default async function handler(req, res) {
  // CORS – telefondan çağırırken sorun çıkmasın diye
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "username parametresi gerekli. Örn: ?username=instagram" });
  }

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = "instagram-api-fast-reliable-data-scraper.p.rapidapi.com";

  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ error: "Sunucuda RAPIDAPI_KEY tanımlı değil." });
  }

  try {
    // 1) username -> user_id
    const userIdRes = await fetch(
      `https://${RAPIDAPI_HOST}/user_id_by_username?username=${encodeURIComponent(username)}`,
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
      return res.status(404).json({ error: "Kullanıcı bulunamadı", raw: userIdData });
    }

    const userId = userIdData.UserID;

    // 2) user_id -> post feed (son 12 post)
    const postsRes = await fetch(
      `https://${RAPIDAPI_HOST}/user_post_feed?user_id=${userId}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
        },
      }
    );

    const postsData = await postsRes.json();

    if (!postsRes.ok || !postsData.items) {
      return res.status(500).json({ error: "Postlar çekilemedi", raw: postsData });
    }

    // Basit bir çıktı: her post için id, caption, media_url, like/yorum sayısı
    const cleaned = postsData.items.map((item) => {
      const media = item;
      return {
        media_id: media.id,
        code: media.code,
        taken_at: media.taken_at,          // timestamp
        caption: media.caption?.text || "",
        like_count: media.like_count ?? null,
        comment_count: media.comment_count ?? null,
        media_type: media.media_type,
        image_url: media.image_versions2?.candidates?.[0]?.url || null,
      };
    });

    // Şimdilik sadece JSON dönüyoruz.
    // Sonraki adımda bunu CSV/Excel’e dönüştüreceğiz.
    return res.status(200).json({
      username,
      user_id: userId,
      post_count: cleaned.length,
      posts: cleaned,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Bilinmeyen hata", detail: err.message });
  }
}
