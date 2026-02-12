const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

async function getAccessToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Failed to get access token");
  }

  return data.access_token;
}

export default async function handler(req, res) {
  try {
    const access_token = await getAccessToken();

    const response = await fetch(
      "https://api.spotify.com/v1/me/player",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    // Si Spotify no tiene device activo devuelve 204
    if (response.status === 204) {
      return res.status(200).json({ playing: false });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: "Spotify API error" });
    }

    const data = await response.json();

    if (!data || !data.item) {
      return res.status(200).json({ playing: false });
    }

    return res.status(200).json({
      playing: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map(a => a.name).join(", "),
      album: data.item.album.name,
      cover: data.item.album.images[0]?.url || null,
      url: data.item.external_urls.spotify,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms,
    });

  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
