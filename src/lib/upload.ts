import { createClient } from "@/lib/supabase/client";

export type StorageBucket = "item-images" | "qris-images" | "payment-proofs";

export async function uploadImageToBucket(
  bucket: StorageBucket,
  file: File,
  folderPrefix = "uploads"
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files (JPG, PNG, WEBP) are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image size must be 5 MB or less.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const filePath = `${folderPrefix}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

