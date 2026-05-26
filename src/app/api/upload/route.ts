import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseStorageConfig } from "@/lib/supabase-client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Detect active database mode:
 * - If DATABASE_URL contains "postgresql://" → Cloud mode (can use Supabase)
 * - Otherwise → Local mode (save to file system)
 */
const isCloudMode = () => {
  const dbUrl = process.env.DATABASE_URL || "";
  return dbUrl.includes("postgresql://");
};

/**
 * Environment variable to force local storage even in cloud mode
 * Useful for development or if Supabase storage is not available
 */
const forceLocalStorage = process.env.FORCE_LOCAL_STORAGE === "true";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WEBP or GIF images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 5 MB limit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Try Supabase Storage (if cloud mode and not forced to local) ─────────────
    if (isCloudMode() && !forceLocalStorage && hasSupabaseStorageConfig()) {
      try {
        const supabase = getSupabaseClient();
        const bucket = process.env.SUPABASE_BUCKET!;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const name = `${crypto.randomUUID()}.${ext}`;
        const filePath = `${folder}/${name}`;

        console.log(
          `[UPLOAD] Attempting Supabase upload: ${bucket}/${filePath}`
        );

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (error) {
          console.warn(
            `[UPLOAD] Supabase upload failed, falling back to local:`,
            error.message
          );
          // Fall through to local storage
        } else {
          // Supabase upload successful
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          console.log(
            `[UPLOAD] Supabase upload successful: ${publicUrlData.publicUrl}`
          );
          return NextResponse.json({ url: publicUrlData.publicUrl });
        }
      } catch (err: any) {
        console.warn(
          `[UPLOAD] Supabase upload error, falling back to local:`,
          err.message
        );
        // Fall through to local storage
      }
    }

    // ── Local mode (save locally under public/images/<folder>/) ─────────────
    console.log(`[UPLOAD] Using local file storage: /images/${folder}/${file.name}`);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const name = `${crypto.randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "images", folder);

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);

    const url = `/images/${folder}/${name}`;
    console.log(`[UPLOAD] Local upload successful: ${url}`);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error(`[UPLOAD] Critical error:`, err.message, err.stack);
    return NextResponse.json(
      { error: "Upload failed: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
