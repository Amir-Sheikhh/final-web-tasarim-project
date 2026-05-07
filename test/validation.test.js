import assert from "node:assert/strict";
import test from "node:test";
import {
  commentSchema,
  loginSchema,
  postSchema,
  postUpdateSchema,
  profileUpdateSchema,
  registerSchema
} from "../src/validation/schemas.js";

test("registerSchema accepts a valid payload", () => {
  const parsed = registerSchema.parse({
    name: "Amir Sheikh",
    email: " Amir@Example.com ",
    password: "demo12345",
    headline: "Graph Developer",
    city: "Bitlis",
    bio: "Neo4j mini social network project",
    color: "#0f766e"
  });

  assert.equal(parsed.email, "amir@example.com");
  assert.equal(parsed.name, "Amir Sheikh");
});

test("registerSchema rejects invalid email", () => {
  assert.throws(
    () =>
      registerSchema.parse({
        name: "Amir Sheikh",
        email: "not-an-email",
        password: "demo12345",
        headline: "Graph Developer"
      }),
    /e-posta/i
  );
});

test("loginSchema rejects missing password", () => {
  assert.throws(
    () =>
      loginSchema.parse({
        email: "amir@example.com",
        password: ""
      }),
    /Sifre zorunludur/i
  );
});

test("commentSchema trims and limits comment text", () => {
  const parsed = commentSchema.parse({
    content: "  Graph yorumlari akisi guclendiriyor.  "
  });

  assert.equal(parsed.content, "Graph yorumlari akisi guclendiriyor.");
  assert.throws(() => commentSchema.parse({ content: "x" }), /Yorum metni/i);
});

test("postSchema accepts media-only posts and rejects empty posts", () => {
  const parsed = postSchema.parse({
    media: {
      dataUrl: "data:image/png;base64,aGVsbG8=",
      name: "graph.png",
      type: "image/png"
    }
  });

  assert.equal(parsed.content, "");
  assert.equal(parsed.media.type, "image/png");
  assert.throws(() => postSchema.parse({ content: " " }), /metin, fotograf veya video/i);
});

test("postUpdateSchema accepts media removal and rejects one-character text", () => {
  const parsed = postUpdateSchema.parse({
    content: "",
    removeMedia: true
  });

  assert.equal(parsed.removeMedia, true);
  assert.throws(() => postUpdateSchema.parse({ content: "x" }), /Paylasim metni/i);
});

test("profileUpdateSchema accepts profile image and rejects video profile image", () => {
  const parsed = profileUpdateSchema.parse({
    profileImage: {
      dataUrl: "data:image/png;base64,aGVsbG8=",
      name: "profile.png",
      type: "image/png"
    }
  });

  assert.equal(parsed.profileImage.type, "image/png");
  assert.throws(
    () =>
      profileUpdateSchema.parse({
        profileImage: {
          dataUrl: "data:video/mp4;base64,aGVsbG8=",
          name: "profile.mp4",
          type: "video/mp4"
        }
      }),
    /Profil fotografi/i
  );
});
