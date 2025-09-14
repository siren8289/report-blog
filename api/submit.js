// api/submit.js
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const { name, studentId, report } = body || {};
    if (!name || !studentId || !report)
      return res.status(400).send("Missing fields");

    const notionSecret = process.env.NOTION_SECRET;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!notionSecret || !databaseId)
      return res.status(500).send("Server env not set");

    const payload = {
      parent: { database_id: databaseId },
      properties: {
        이름: { title: [{ text: { content: report } }] },
        "Report DB": { rich_text: [{ text: { content: name } }] },

        // 개발자 파트는 multi_select (쉼표 구분 지원)
        파트: {
          multi_select: String(studentId)
            .split(",")
            .map((v) => ({ name: v.trim() }))
            .filter((v) => v.name),
        },
        // 제출일은 date
        제출일: { date: { start: new Date().toISOString() } },
      },
    };

    console.log("payload>>>", JSON.stringify(payload));

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
