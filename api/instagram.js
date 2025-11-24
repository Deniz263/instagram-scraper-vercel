// api/instagram.js

export default async function handler(req, res) {
  // CORS
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
      .json({ error: "username parametresi gerekiyor. Örn: ?username=instagram" });
  }

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = "instagram-api-fast-reliable-data-scraper.p.rapidapi.com";
  const BASE_URL = `https://${RAPIDAPI_HOST}`;

  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ error: "Sunucuda RAPIDAPI_KEY yok." });
  }

  try {
    // 1) Username -> user_id
    const userIdRes = await fetch(
      `${BASE_URL}/user_id_by_username?username=${encodeURIComponent(username)}`,
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
      return res.status(404).json({
        error: "Kullanıcı bulunamadı",
        raw: userIdData,
      });
    }

    const userId = userIdData.UserID;

    // 🔥 2) user_id -> feed
    const postsRes = await fetch(
      `${BASE_URL}/feed?user_id=${encodeURIComponent(userId)}`,
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
      return res.status(500).json({
        error: "Postlar çekilemedi",
        raw: postsData,
      });
    }

    const cleaned = postsData.items.map((item) => ({
      media_id: item.id,
      code: item.code,
      media_type: item.media_type,
      image_url:
        item.image_versions2?.candidates?.[0]?.url ??
        item.additional_candidates?.first_frame?.url ??
        null,
      video_url: item.video_versions?.[0]?.url ?? null,
      caption: item.caption?.text ?? "",
      like_count: item.like_count ?? null,
      comment_count: item.comment_count ?? null,
      taken_at: item.taken_at ?? null,
    }));

    return res.status(200).json({
      username,
      user_id: userId,
      post_count: cleaned.length,
      posts: cleaned,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Bilinmeyen hata",
      detail: err.message,
    });
  }
}
