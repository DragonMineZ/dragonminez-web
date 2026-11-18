-- Category: who can start threads (replaces staffOnly)
ALTER TABLE "Category" ADD COLUMN "postRole" TEXT NOT NULL DEFAULT 'member';
UPDATE "Category" SET "postRole" = 'admin' WHERE "staffOnly";
ALTER TABLE "Category" DROP COLUMN "staffOnly";

-- The category set: Announcements, Community Servers, Guides, Suggestions, Bug-reports.
-- Removed categories take their threads with them (cascade).
DELETE FROM "Category" WHERE "slug" IN ('general', 'showcase', 'help', 'off-topic');
INSERT INTO "Category" ("slug", "position", "postRole", "kind") VALUES
  ('announcements', 0, 'admin', 'discussion'),
  ('servers', 1, 'member', 'servers'),
  ('guides', 2, 'staff', 'discussion'),
  ('suggestions', 3, 'member', 'suggestions'),
  ('bug-reports', 4, 'member', 'bugs')
ON CONFLICT ("slug") DO UPDATE SET "position" = EXCLUDED."position", "postRole" = EXCLUDED."postRole", "kind" = EXCLUDED."kind";

-- Thread: status (suggestions, bugs) and votes (likes on the opening post)
ALTER TABLE "Thread" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN "votes" INTEGER NOT NULL DEFAULT 0;
UPDATE "Thread" t SET "votes" = (
  SELECT count(*) FROM "Like" l
  WHERE l."postId" = (SELECT min(p."id") FROM "Post" p WHERE p."threadId" = t."id")
);

-- Community roles
CREATE TABLE "CommunityRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunityRole_name_key" ON "CommunityRole"("name");

CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CommunityRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
