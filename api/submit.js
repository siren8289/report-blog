// api/submit.js  — Vercel Serverless Function (CommonJS + CORS)
module.exports = async (req, res) => {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // preflight 응답
  }
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // body 안전 파싱
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_) {}
    }

    const { name, studentId, report } = body || {};
    if (!name || !studentId || !report) {
      return res.status(400).send("Missing fields");
    }

    const notionSecret = process.env.NOTION_SECRET;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!notionSecret || !databaseId) {
      return res.status(500).send("Server env not set");
    }

    const payload = {
      parent: { database_id: databaseId },
      properties: {
        이름: { title: [{ text: { content: name } }] }, // Title
        // 👇 multi_select: "FE, BE" 같은 입력을 ["FE","BE"]로 저장
        "개발자 파트": {
          multi_select: String(studentId)
            .split(",")
            .map((v) => ({ name: v.trim() }))
            .filter((v) => v.name),
        },
        "Report DB": { rich_text: [{ text: { content: report } }] },
        제출일: { date: { start: new Date().toISOString() } },
      },
    };

    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionSecret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(payload),
    });

    if (!notionRes.ok) {
      const text = await notionRes.text();
      return res.status(500).send(`Notion error: ${text}`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).send(err?.message || "Server error");
  }
};
