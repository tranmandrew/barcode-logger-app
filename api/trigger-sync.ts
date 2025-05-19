export default function handler(req: any, res: any) {
  console.log("✅ HIT /api/trigger-sync");
  return res.status(200).json({ message: "Ping received" });
}
