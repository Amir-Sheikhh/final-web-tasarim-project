import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml } from "../src/lib/sanitize.js";
import {
  commentSchema,
  paginationSchema,
  postSchema,
  postUpdateSchema,
  profileUpdateSchema,
  registerSchema
} from "../src/validation/schemas.js";

test("escapeHtml sanitizes HTML characters", () => {
  assert.equal(escapeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
  assert.equal(escapeHtml('Hello "world"'), "Hello &quot;world&quot;");
  assert.equal(escapeHtml("A & B"), "A &amp; B");
  assert.equal(escapeHtml("normal text"), "normal text");
  assert.equal(escapeHtml(""), "");
  assert.equal(escapeHtml(null), "");
});

test("paginationSchema validates limit and offset parameters", () => {
  const valid = paginationSchema.parse({ limit: 50, offset: 100 });
  assert.deepEqual(valid, { limit: 50, offset: 100 });

  const defaults = paginationSchema.parse({});
  assert.deepEqual(defaults, { limit: 20, offset: 0 });

  assert.throws(() => paginationSchema.parse({ limit: 101 }), /maximum/i);
  assert.throws(() => paginationSchema.parse({ limit: 0 }), /minimum/i);
  assert.throws(() => paginationSchema.parse({ offset: -1 }), /minimum/i);
});

test("postSchema rejects empty content with no media", () => {
  assert.throws(() => postSchema.parse({ content: "" }), /metin, fotograf veya video/i);
  assert.throws(() => postSchema.parse({ content: "   " }), /metin, fotograf veya video/i);
});

test("postSchema accepts posts with only media", () => {
  const result = postSchema.parse({
    content: "",
    media: {
      dataUrl: "data:image/png;base64,aGVsbG8=",
      name: "image.png",
      type: "image/png"
    }
  });

  assert.equal(result.content, "");
  assert.equal(result.media.type, "image/png");
});

test("commentSchema validates comment length and trimming", () => {
  const valid = commentSchema.parse({ content: "  Great post!  " });
  assert.equal(valid.content, "Great post!");

  assert.throws(() => commentSchema.parse({ content: "x" }), /Yorum metni/i);
});

test("registerSchema normalizes email to lowercase", () => {
  const result = registerSchema.parse({
    name: "Test User",
    email: "USER@EXAMPLE.COM",
    password: "StrongPass123",
    headline: "Developer",
    color: "#0f766e"
  });

  assert.equal(result.email, "user@example.com");
});

test("registerSchema validates hex color format", () => {
  assert.throws(() => registerSchema.parse({
    name: "Test",
    email: "a@b.com",
    password: "password123",
    headline: "Dev",
    color: "not-a-color"
  }), /color/i);

  const valid = registerSchema.parse({
    name: "Test",
    email: "a@b.com",
    password: "password123",
    headline: "Dev",
    color: "#ffffff"
  });

  assert.equal(valid.color, "#ffffff");
});

test("postUpdateSchema allows content removal with removeMedia flag", () => {
  const result = postUpdateSchema.parse({
    content: "",
    removeMedia: true
  });

  assert.equal(result.removeMedia, true);
});

test("profileUpdateSchema accepts image uploads and rejects video", () => {
  const imageOk = profileUpdateSchema.parse({
    profileImage: {
      dataUrl: "data:image/png;base64,aGVsbG8=",
      name: "profile.png",
      type: "image/png"
    }
  });

  assert.equal(imageOk.profileImage.type, "image/png");

  assert.throws(() => profileUpdateSchema.parse({
    profileImage: {
      dataUrl: "data:video/mp4;base64,aGVsbG8=",
      name: "video.mp4",
      type: "video/mp4"
    }
  }), /Profil fotografi/i);
});
