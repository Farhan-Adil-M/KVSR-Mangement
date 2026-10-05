import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getResourceFile } from "@/lib/actions/resources";

/**
 * Serves a stored resource PDF. Middleware does not cover /api, so this route
 * enforces access itself via getResourceFile's authorization chain
 * (admin / HOD-of-department / assigned faculty / actively-enrolled student).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const file = await getResourceFile(params.id);
  if (!file.ok) {
    return NextResponse.json({ error: file.error }, { status: 403 });
  }

  const bytes = Buffer.from(file.dataBase64, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": file.fileMime || "application/pdf",
      "Content-Disposition": `inline; filename="${(file.fileName || "resource.pdf").replace(/"/g, "")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
