import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseStorageConfig } from "@/lib/supabase-client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Use Supabase Storage if credentials are set, otherwise save locally (standalone)
const useSupabase = hasSupabaseStorageConfig;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const folder   = (formData.get("folder") as string) || "misc";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WEBP or GIF images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());


  // ── Cloud deployment: upload to Supabase Storage ──────────────────────
  if (useSupabase()) {
    const supabase = getSupabaseClient();
    const bucket = process.env.SUPABASE_BUCKET!;
    const ext    = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const name   = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${folder}/${name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ error: "Supabase upload failed: " + error.message }, { status: 500 });
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return NextResponse.json({ url: publicUrlData.publicUrl });
  }

  // ── Standalone: save locally under public/images/<folder>/ ─────────────
  const ext    = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const name   = `${crypto.randomUUID()}.${ext}`;
  const dir    = path.join(process.cwd(), "public", "images", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);

  return NextResponse.json({ url: `/images/${folder}/${name}` });
}
