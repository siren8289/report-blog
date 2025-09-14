// api/submit.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

    const { name, studentId, report } = req.body || {};
    if (!name || !studentId || !report)
      return res.status(400).send("Missing fields");

    const notionSecret = process.env.NOTION_SECRET;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!notionSecret || !databaseId)
      return res.status(500).send("Server env not set");

    const payload = {
      parent: { database_id: databaseId },
      properties: {
        // Notion DB의 속성명과 타입에 맞게 수정!
        이름: { title: [{ text: { content: name } }] },
        학번: { rich_text: [{ text: { content: studentId } }] },
        "리포트 내용": { rich_text: [{ text: { content: report } }] },
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
}
