export type CloudinaryPublicConfig = {
  cloudName: string;
  uploadPreset: string;
};

export function getCloudinaryPublicConfig(env: Record<string, unknown>): CloudinaryPublicConfig | null {
  const cloudName = typeof env.VITE_CLOUDINARY_CLOUD_NAME === "string" ? env.VITE_CLOUDINARY_CLOUD_NAME.trim() : "";
  const uploadPreset = typeof env.VITE_CLOUDINARY_UPLOAD_PRESET === "string" ? env.VITE_CLOUDINARY_UPLOAD_PRESET.trim() : "";
  return cloudName && uploadPreset ? { cloudName, uploadPreset } : null;
}
