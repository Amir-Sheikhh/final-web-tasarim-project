import { z } from "zod";

const requiredText = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} zorunludur.`)
    .max(max, `${label} en fazla ${max} karakter olabilir.`);

const allowedMediaTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/ogg"];
const allowedProfileImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const mediaSchema = z.object({
  dataUrl: z.string().trim().min(1, "Medya dosyasi okunamadi.").max(30_000_000, "Medya dosyasi cok buyuk."),
  name: z.string().trim().max(180, "Dosya adi en fazla 180 karakter olabilir.").optional().default("upload"),
  type: z.enum(allowedMediaTypes, {
    message: "Sadece JPG, PNG, WEBP, GIF, MP4, WEBM veya OGG yukleyebilirsiniz."
  })
});

const profileImageSchema = z.object({
  dataUrl: z.string().trim().min(1, "Profil fotografi okunamadi.").max(8_000_000, "Profil fotografi cok buyuk."),
  name: z.string().trim().max(180, "Dosya adi en fazla 180 karakter olabilir.").optional().default("profile"),
  type: z.enum(allowedProfileImageTypes, {
    message: "Profil fotografi icin sadece JPG, PNG, WEBP veya GIF yukleyebilirsiniz."
  })
});

export const registerSchema = z.object({
  name: requiredText("Ad soyad", 2, 80),
  email: z
    .string()
    .trim()
    .email("Gecerli bir e-posta giriniz.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Sifre en az 8 karakter olmalidir.").max(128, "Sifre cok uzun."),
  headline: requiredText("Baslik", 2, 90),
  city: z.string().trim().max(80, "Sehir en fazla 80 karakter olabilir.").optional().default("Unknown"),
  bio: z.string().trim().max(240, "Bio en fazla 240 karakter olabilir.").optional().default("Yeni kullanici."),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Gecerli bir renk seciniz.")
    .optional()
    .default("#0f766e"),
  profileImage: profileImageSchema.optional().nullable().default(null)
});

export const profileUpdateSchema = z.object({
  name: requiredText("Ad soyad", 2, 80).optional(),
  headline: requiredText("Baslik", 2, 90).optional(),
  city: z.string().trim().max(80, "Sehir en fazla 80 karakter olabilir.").optional(),
  bio: z.string().trim().max(240, "Bio en fazla 240 karakter olabilir.").optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Gecerli bir renk seciniz.")
    .optional(),
  profileImage: profileImageSchema.optional().nullable().default(null),
  removeProfileImage: z.boolean().optional().default(false)
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Gecerli bir e-posta giriniz.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Sifre zorunludur.")
});

export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .max(500, "Paylasim metni en fazla 500 karakter olabilir.")
    .optional()
    .default(""),
  media: mediaSchema.optional().nullable().default(null)
}).superRefine((payload, context) => {
  if (!payload.content && !payload.media) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Paylasim icin metin, fotograf veya video ekleyin.",
      path: ["content"]
    });
  }

  if (payload.content && payload.content.length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Paylasim metni en az 2 karakter olmalidir.",
      path: ["content"]
    });
  }
});

export const postUpdateSchema = z.object({
  content: z
    .string()
    .trim()
    .max(500, "Paylasim metni en fazla 500 karakter olabilir.")
    .optional()
    .default(""),
  media: mediaSchema.optional().nullable().default(null),
  removeMedia: z.boolean().optional().default(false)
}).superRefine((payload, context) => {
  if (payload.content && payload.content.length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Paylasim metni en az 2 karakter olmalidir.",
      path: ["content"]
    });
  }
});

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Yorum metni en az 2 karakter olmalidir.")
    .max(280, "Yorum metni en fazla 280 karakter olabilir.")
});

export const followSchema = z.object({
  targetId: requiredText("Hedef kullanici", 1, 120)
});

export const targetQuerySchema = z.object({
  targetId: requiredText("Hedef kullanici", 1, 120)
});

export const optionalTargetQuerySchema = z.object({
  targetId: z.string().trim().optional()
});

export const idParamSchema = z.object({
  userId: requiredText("Kullanici", 1, 120)
});

export const postIdParamSchema = z.object({
  postId: requiredText("Gonderi", 1, 120)
});

export const commentParamSchema = z.object({
  postId: requiredText("Gonderi", 1, 120),
  commentId: requiredText("Yorum", 1, 120)
});

export const notificationParamSchema = z.object({
  notificationId: requiredText("Bildirim", 1, 220)
});
