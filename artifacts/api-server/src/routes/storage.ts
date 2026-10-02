import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";

import {
  getAuthenticatedRunner,
  requireAuthentication,
  requireRunner,
} from "../lib/authorization";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

router.post(
  "/storage/uploads/request-url",
  async (req: Request, res: Response) => {
    if (!(await requireAuthentication(req, res))) return;
    const runner = await getAuthenticatedRunner(req);
    if (!requireRunner(runner, res)) return;

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid image metadata" });
      return;
    }
    if (
      parsed.data.size > MAX_AVATAR_BYTES ||
      !ALLOWED_IMAGE_TYPES.has(parsed.data.contentType)
    ) {
      res.status(400).json({
        error: "Use a JPEG, PNG, or WebP image up to 8 MiB",
      });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(
        `avatars/${runner.id}/${randomUUID()}`,
      );
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);
      if (!/^\/objects\/uploads\/avatars\/\d+\/[0-9a-f-]{36}$/.test(objectPath)) {
        throw new Error("Storage returned an invalid avatar object path");
      }
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error generating profile photo upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      await streamStorageFile(file, res);
    } catch (error) {
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      if (!/^uploads\/avatars\/\d+\/[0-9a-f-]{36}$/.test(wildcardPath)) {
        res.status(404).json({ error: "Object not found" });
        return;
      }

      const objectFile = await objectStorageService.getObjectEntityFile(
        `/objects/${wildcardPath}`,
      );
      await streamStorageFile(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        req.log.warn({ err: error }, "Profile photo not found");
        res.status(404).json({ error: "Object not found" });
        return;
      }
      req.log.error({ err: error }, "Error serving profile photo");
      res.status(500).json({ error: "Failed to serve object" });
    }
  },
);

async function streamStorageFile(
  file: Parameters<ObjectStorageService["downloadObject"]>[0],
  res: Response,
): Promise<void> {
  const response = await objectStorageService.downloadObject(file);
  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.startsWith("image/") ||
    !ALLOWED_IMAGE_TYPES.has(contentType.split(";")[0])
  ) {
    await response.body?.cancel();
    res.status(415).json({ error: "Stored object is not a supported image" });
    return;
  }

  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (response.body) {
    Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  } else {
    res.end();
  }
}

export default router;